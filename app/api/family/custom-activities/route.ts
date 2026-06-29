import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../db';
import { ApiResponse } from '../../types';
import { withAdminAuth } from '../../utils/auth';
import { formatForResponse } from '../../utils/timezone';

export type SysAdminCustomActivityView = {
  familyId: string;
  familyName: string;
  familySlug: string;
  customActivities: Array<{
    id: string;
    name: string;
    icon: string;
    isActive: boolean;
    fieldCount: number;
    logCount: number;
    lastEntryAt: string | null;
  }>;
};

async function handleGet(_req: NextRequest) {
  try {
    const activities = await prisma.customActivity.findMany({
      where: { deletedAt: null },
      include: {
        family: { select: { id: true, name: true, slug: true } },
        _count: {
          select: {
            fields: { where: { deletedAt: null } },
            logs: { where: { deletedAt: null } },
          },
        },
        logs: {
          where: { deletedAt: null },
          orderBy: { time: 'desc' },
          take: 1,
          select: { time: true },
        },
      },
      orderBy: [{ familyId: 'asc' }, { sortOrder: 'asc' }],
    });

    // Group by family
    const familyMap = new Map<string, SysAdminCustomActivityView>();
    for (const a of activities) {
      const fam = a.family;
      if (!fam) continue;
      if (!familyMap.has(fam.id)) {
        familyMap.set(fam.id, {
          familyId: fam.id,
          familyName: fam.name,
          familySlug: fam.slug,
          customActivities: [],
        });
      }
      familyMap.get(fam.id)!.customActivities.push({
        id: a.id,
        name: a.name,
        icon: a.icon,
        isActive: a.isActive,
        fieldCount: a._count.fields,
        logCount: a._count.logs,
        lastEntryAt: a.logs[0] ? formatForResponse(a.logs[0].time) : null,
      });
    }

    return NextResponse.json<ApiResponse<SysAdminCustomActivityView[]>>({
      success: true,
      data: Array.from(familyMap.values()),
    });
  } catch (error) {
    console.error('Error fetching family custom activities:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to fetch custom activities' }, { status: 500 });
  }
}

export const GET = withAdminAuth(handleGet as any);
