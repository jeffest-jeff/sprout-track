import { NextRequest, NextResponse } from 'next/server';
import prisma from '../db';
import { ApiResponse, CustomActivityLogResponse, CustomActivityLogCreate } from '../types';
import { withAuthContext, AuthResult } from '../utils/auth';
import { toUTC, formatForResponse } from '../utils/timezone';
import { checkWritePermission } from '../utils/writeProtection';
import { notifyActivityCreated } from '@/src/lib/notifications/activityHook';
import { dispatchOutboundWebhook } from '@/src/lib/webhooks/outbound';

function formatLog(log: any): CustomActivityLogResponse {
  return {
    ...log,
    time: formatForResponse(log.time) || '',
    createdAt: formatForResponse(log.createdAt) || '',
    updatedAt: formatForResponse(log.updatedAt) || '',
    deletedAt: formatForResponse(log.deletedAt),
    customActivity: {
      id: log.customActivity.id,
      name: log.customActivity.name,
      icon: log.customActivity.icon,
      color: log.customActivity.color,
    },
    fieldValues: (log.fieldValues || []).map((fv: any) => ({
      id: fv.id,
      customActivityLogId: fv.customActivityLogId,
      customActivityFieldId: fv.customActivityFieldId,
      value: fv.value,
      field: {
        name: fv.customActivityField?.name ?? '',
        fieldType: fv.customActivityField?.fieldType,
        unit: fv.customActivityField?.unit ?? null,
      },
    })),
    caretakerName: log.caretaker?.name ?? null,
  };
}

const logInclude = {
  customActivity: true,
  caretaker: { select: { name: true } },
  fieldValues: { include: { customActivityField: true } },
};

async function handleGet(req: NextRequest, authContext: AuthResult) {
  try {
    const { familyId } = authContext;
    if (!familyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const babyId = searchParams.get('babyId');
    const customActivityId = searchParams.get('customActivityId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (id) {
      const log = await prisma.customActivityLog.findFirst({
        where: { id, familyId, deletedAt: null },
        include: logInclude,
      });
      if (!log) {
        return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Log not found' }, { status: 404 });
      }
      return NextResponse.json<ApiResponse<CustomActivityLogResponse>>({ success: true, data: formatLog(log) });
    }

    const logs = await prisma.customActivityLog.findMany({
      where: {
        familyId,
        deletedAt: null,
        ...(babyId && { babyId }),
        ...(customActivityId && { customActivityId }),
        ...(startDate && endDate && { time: { gte: toUTC(startDate), lte: toUTC(endDate) } }),
      },
      include: logInclude,
      orderBy: { time: 'desc' },
    });

    return NextResponse.json<ApiResponse<CustomActivityLogResponse[]>>({ success: true, data: logs.map(formatLog) });
  } catch (error) {
    console.error('Error fetching custom activity logs:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to fetch logs' }, { status: 500 });
  }
}

async function handlePost(req: NextRequest, authContext: AuthResult) {
  const writeCheck = checkWritePermission(authContext);
  if (!writeCheck.allowed) return writeCheck.response!;

  try {
    const { familyId, caretakerId, accountId } = authContext;
    if (!familyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    const body: CustomActivityLogCreate = await req.json();
    if (!body.babyId || !body.customActivityId || !body.time) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'babyId, customActivityId and time are required' }, { status: 400 });
    }

    // Verify baby and activity belong to the family
    const [baby, customActivity] = await Promise.all([
      prisma.baby.findFirst({ where: { id: body.babyId, familyId } }),
      prisma.customActivity.findFirst({ where: { id: body.customActivityId, familyId, deletedAt: null } }),
    ]);
    if (!baby) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Baby not found in this family.' }, { status: 404 });
    }
    if (!customActivity) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Custom activity not found' }, { status: 404 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const log = await tx.customActivityLog.create({
        data: {
          familyId,
          babyId: body.babyId,
          caretakerId: caretakerId || null,
          customActivityId: body.customActivityId,
          time: toUTC(body.time),
          notes: body.notes && body.notes.trim() ? body.notes : null,
        },
      });

      if (body.fieldValues && body.fieldValues.length > 0) {
        await tx.customActivityLogValue.createMany({
          data: body.fieldValues.map((fv) => ({
            customActivityLogId: log.id,
            customActivityFieldId: fv.customActivityFieldId,
            value: fv.value,
          })),
        });
      }

      return tx.customActivityLog.findUnique({ where: { id: log.id }, include: logInclude });
    });

    const response = formatLog(created);

    // Dispatch outbound webhook (non-blocking)
    dispatchOutboundWebhook(familyId, 'custom_activity_created', {
      logId: response.id,
      babyId: response.babyId,
      customActivity: response.customActivity,
      time: response.time,
      notes: response.notes,
      fieldValues: response.fieldValues,
    }).catch(console.error);

    // Push notification (non-blocking)
    notifyActivityCreated(
      response.babyId,
      `custom:${customActivity.id}`,
      { accountId, caretakerId },
      {
        customActivityName: customActivity.name,
        customActivityIcon: customActivity.icon,
        fieldValues: response.fieldValues,
      }
    ).catch(console.error);

    return NextResponse.json<ApiResponse<CustomActivityLogResponse>>({ success: true, data: response });
  } catch (error) {
    console.error('Error creating custom activity log:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to create log' }, { status: 500 });
  }
}

async function handlePut(req: NextRequest, authContext: AuthResult) {
  const writeCheck = checkWritePermission(authContext);
  if (!writeCheck.allowed) return writeCheck.response!;

  try {
    const { familyId } = authContext;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Log ID is required' }, { status: 400 });
    }

    const existing = await prisma.customActivityLog.findUnique({ where: { id } });
    if (!existing || existing.familyId !== familyId || existing.deletedAt) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Log not found' }, { status: 404 });
    }

    const body: Partial<CustomActivityLogCreate> = await req.json();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.customActivityLog.update({
        where: { id },
        data: {
          ...(body.time && { time: toUTC(body.time) }),
          ...(body.notes !== undefined && { notes: body.notes && body.notes.trim() ? body.notes : null }),
        },
      });

      if (body.fieldValues) {
        // Replace field values: delete existing, recreate
        await tx.customActivityLogValue.deleteMany({ where: { customActivityLogId: id } });
        if (body.fieldValues.length > 0) {
          await tx.customActivityLogValue.createMany({
            data: body.fieldValues.map((fv) => ({
              customActivityLogId: id,
              customActivityFieldId: fv.customActivityFieldId,
              value: fv.value,
            })),
          });
        }
      }

      return tx.customActivityLog.findUnique({ where: { id }, include: logInclude });
    });

    return NextResponse.json<ApiResponse<CustomActivityLogResponse>>({ success: true, data: formatLog(updated) });
  } catch (error) {
    console.error('Error updating custom activity log:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to update log' }, { status: 500 });
  }
}

async function handleDelete(req: NextRequest, authContext: AuthResult) {
  const writeCheck = checkWritePermission(authContext);
  if (!writeCheck.allowed) return writeCheck.response!;

  try {
    const { familyId } = authContext;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json<ApiResponse<void>>({ success: false, error: 'Log ID is required' }, { status: 400 });
    }

    const existing = await prisma.customActivityLog.findUnique({ where: { id } });
    if (!existing || existing.familyId !== familyId || existing.deletedAt) {
      return NextResponse.json<ApiResponse<void>>({ success: false, error: 'Log not found' }, { status: 404 });
    }

    await prisma.customActivityLog.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json<ApiResponse<void>>({ success: true });
  } catch (error) {
    console.error('Error deleting custom activity log:', error);
    return NextResponse.json<ApiResponse<void>>({ success: false, error: 'Failed to delete log' }, { status: 500 });
  }
}

export const GET = withAuthContext(handleGet as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const POST = withAuthContext(handlePost as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const PUT = withAuthContext(handlePut as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const DELETE = withAuthContext(handleDelete as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
