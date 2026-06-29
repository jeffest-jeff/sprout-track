import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../db';
import { ApiResponse } from '../../types';
import { withAuthContext, AuthResult } from '../../utils/auth';
import { toUTC } from '../../utils/timezone';
import { objectArrayToCsv } from '../../utils/csv-export';

/**
 * GET /api/custom-activity-log/export
 * Produces a CSV with one column per field in the custom activity definition,
 * plus Date, Time, Notes, Caretaker columns.
 * Query params: babyId, customActivityId, startDate, endDate
 */
async function handleGet(req: NextRequest, authContext: AuthResult) {
  try {
    const { familyId } = authContext;
    if (!familyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const babyId = searchParams.get('babyId');
    const customActivityId = searchParams.get('customActivityId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!customActivityId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'customActivityId is required' }, { status: 400 });
    }

    // Verify activity belongs to family
    const activity = await prisma.customActivity.findFirst({
      where: { id: customActivityId, familyId, deletedAt: null },
      include: { fields: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
    });
    if (!activity) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Custom activity not found' }, { status: 404 });
    }

    // Verify baby (if specified) belongs to family
    if (babyId) {
      const baby = await prisma.baby.findFirst({ where: { id: babyId, familyId } });
      if (!baby) {
        return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Baby not found in this family.' }, { status: 404 });
      }
    }

    const logs = await prisma.customActivityLog.findMany({
      where: {
        familyId,
        customActivityId,
        deletedAt: null,
        ...(babyId && { babyId }),
        ...(startDate && endDate && { time: { gte: toUTC(startDate), lte: toUTC(endDate) } }),
      },
      include: {
        caretaker: { select: { name: true } },
        fieldValues: true,
      },
      orderBy: { time: 'desc' },
    });

    // Build dynamic columns: one per field, with unit suffix in header
    const fieldColumns = activity.fields.map((f) => ({
      id: f.id,
      header: f.unit ? `${f.name} (${f.unit})` : f.name,
    }));

    const rows = logs.map((log) => {
      const valueMap = new Map(log.fieldValues.map((fv) => [fv.customActivityFieldId, fv.value]));
      const d = new Date(log.time);
      const row: Record<string, string> = {
        Date: d.toISOString().split('T')[0],
        Time: d.toISOString().split('T')[1].slice(0, 5),
      };
      for (const col of fieldColumns) {
        row[col.header] = valueMap.get(col.id) ?? '';
      }
      row['Notes'] = log.notes ?? '';
      row['Caretaker'] = log.caretaker?.name ?? '';
      return row;
    });

    if (rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'No entries found for the selected range.' }, { status: 404 });
    }

    const csvContent = objectArrayToCsv(rows);
    const safeName = activity.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${safeName}-${dateStr}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting custom activity logs:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to export' }, { status: 500 });
  }
}

export const GET = withAuthContext(handleGet as any);
