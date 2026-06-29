import { NextRequest, NextResponse } from 'next/server';
import prisma from '../db';
import { ApiResponse, CustomActivityResponse, CustomActivityCreate } from '../types';
import { withAuthContext, AuthResult } from '../utils/auth';
import { formatForResponse } from '../utils/timezone';
import { checkWritePermission } from '../utils/writeProtection';

function formatActivity(activity: any): CustomActivityResponse {
  return {
    ...activity,
    createdAt: formatForResponse(activity.createdAt) || '',
    updatedAt: formatForResponse(activity.updatedAt) || '',
    deletedAt: formatForResponse(activity.deletedAt),
    fields: (activity.fields || []).map((f: any) => ({
      ...f,
      createdAt: formatForResponse(f.createdAt) || '',
      updatedAt: formatForResponse(f.updatedAt) || '',
      deletedAt: formatForResponse(f.deletedAt),
    })),
  };
}

async function handleGet(req: NextRequest, authContext: AuthResult) {
  try {
    const { familyId } = authContext;
    if (!familyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const activity = await prisma.customActivity.findFirst({
        where: { id, familyId, deletedAt: null },
        include: { fields: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
      });
      if (!activity) {
        return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Custom activity not found' }, { status: 404 });
      }
      return NextResponse.json<ApiResponse<CustomActivityResponse>>({ success: true, data: formatActivity(activity) });
    }

    const activities = await prisma.customActivity.findMany({
      where: { familyId, deletedAt: null },
      include: { fields: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json<ApiResponse<CustomActivityResponse[]>>({
      success: true,
      data: activities.map(formatActivity),
    });
  } catch (error) {
    console.error('Error fetching custom activities:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to fetch custom activities' }, { status: 500 });
  }
}

async function handlePost(req: NextRequest, authContext: AuthResult) {
  const writeCheck = checkWritePermission(authContext);
  if (!writeCheck.allowed) return writeCheck.response!;

  try {
    const { familyId } = authContext;
    if (!familyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    const body: CustomActivityCreate = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Activity name is required' }, { status: 400 });
    }

    const activity = await prisma.customActivity.create({
      data: {
        familyId,
        name: body.name.trim(),
        icon: body.icon || '⭐',
        color: body.color || '#6366f1',
        sortOrder: body.sortOrder ?? 0,
        reminderEnabled: body.reminderEnabled ?? false,
        reminderIntervalHours: body.reminderIntervalHours ?? null,
      },
      include: { fields: true },
    });

    return NextResponse.json<ApiResponse<CustomActivityResponse>>({ success: true, data: formatActivity(activity) });
  } catch (error) {
    console.error('Error creating custom activity:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to create custom activity' }, { status: 500 });
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
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Custom activity ID is required' }, { status: 400 });
    }

    const existing = await prisma.customActivity.findUnique({ where: { id } });
    if (!existing || existing.familyId !== familyId || existing.deletedAt) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Custom activity not found' }, { status: 404 });
    }

    const body: Partial<CustomActivityCreate> & { isActive?: boolean } = await req.json();
    const activity = await prisma.customActivity.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.reminderEnabled !== undefined && { reminderEnabled: body.reminderEnabled }),
        ...(body.reminderIntervalHours !== undefined && { reminderIntervalHours: body.reminderIntervalHours }),
      },
      include: { fields: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
    });

    return NextResponse.json<ApiResponse<CustomActivityResponse>>({ success: true, data: formatActivity(activity) });
  } catch (error) {
    console.error('Error updating custom activity:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to update custom activity' }, { status: 500 });
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
      return NextResponse.json<ApiResponse<void>>({ success: false, error: 'Custom activity ID is required' }, { status: 400 });
    }

    const existing = await prisma.customActivity.findUnique({ where: { id } });
    if (!existing || existing.familyId !== familyId || existing.deletedAt) {
      return NextResponse.json<ApiResponse<void>>({ success: false, error: 'Custom activity not found' }, { status: 404 });
    }

    await prisma.customActivity.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json<ApiResponse<void>>({ success: true });
  } catch (error) {
    console.error('Error deleting custom activity:', error);
    return NextResponse.json<ApiResponse<void>>({ success: false, error: 'Failed to delete custom activity' }, { status: 500 });
  }
}

export const GET = withAuthContext(handleGet as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const POST = withAuthContext(handlePost as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const PUT = withAuthContext(handlePut as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const DELETE = withAuthContext(handleDelete as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
