import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../db';
import { ApiResponse, CustomActivityFieldResponse, CustomActivityFieldCreate } from '../../types';
import { withAuthContext, AuthResult } from '../../utils/auth';
import { formatForResponse } from '../../utils/timezone';
import { checkWritePermission } from '../../utils/writeProtection';

function formatField(field: any): CustomActivityFieldResponse {
  return {
    ...field,
    createdAt: formatForResponse(field.createdAt) || '',
    updatedAt: formatForResponse(field.updatedAt) || '',
    deletedAt: formatForResponse(field.deletedAt),
  };
}

// Verify the parent custom activity belongs to the family
async function verifyParent(customActivityId: string, familyId: string) {
  return prisma.customActivity.findFirst({
    where: { id: customActivityId, familyId, deletedAt: null },
  });
}

async function handlePost(req: NextRequest, authContext: AuthResult) {
  const writeCheck = checkWritePermission(authContext);
  if (!writeCheck.allowed) return writeCheck.response!;

  try {
    const { familyId } = authContext;
    if (!familyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    const body: CustomActivityFieldCreate = await req.json();
    if (!body.customActivityId || !body.name || !body.fieldType) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'customActivityId, name and fieldType are required' }, { status: 400 });
    }

    const parent = await verifyParent(body.customActivityId, familyId);
    if (!parent) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Custom activity not found' }, { status: 404 });
    }

    const field = await prisma.customActivityField.create({
      data: {
        customActivityId: body.customActivityId,
        name: body.name.trim(),
        fieldType: body.fieldType,
        unit: body.unit && body.unit.trim() ? body.unit.trim() : null,
        options: body.options && body.options.trim() ? body.options : null,
        isRequired: body.isRequired ?? false,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json<ApiResponse<CustomActivityFieldResponse>>({ success: true, data: formatField(field) });
  } catch (error) {
    console.error('Error creating custom activity field:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to create field' }, { status: 500 });
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
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Field ID is required' }, { status: 400 });
    }

    const existing = await prisma.customActivityField.findUnique({
      where: { id },
      include: { customActivity: true },
    });
    if (!existing || existing.customActivity.familyId !== familyId || existing.deletedAt) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Field not found' }, { status: 404 });
    }

    const body: Partial<CustomActivityFieldCreate> = await req.json();
    const field = await prisma.customActivityField.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.fieldType !== undefined && { fieldType: body.fieldType }),
        ...(body.unit !== undefined && { unit: body.unit && body.unit.trim() ? body.unit.trim() : null }),
        ...(body.options !== undefined && { options: body.options && body.options.trim() ? body.options : null }),
        ...(body.isRequired !== undefined && { isRequired: body.isRequired }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    return NextResponse.json<ApiResponse<CustomActivityFieldResponse>>({ success: true, data: formatField(field) });
  } catch (error) {
    console.error('Error updating custom activity field:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to update field' }, { status: 500 });
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
      return NextResponse.json<ApiResponse<void>>({ success: false, error: 'Field ID is required' }, { status: 400 });
    }

    const existing = await prisma.customActivityField.findUnique({
      where: { id },
      include: { customActivity: true },
    });
    if (!existing || existing.customActivity.familyId !== familyId || existing.deletedAt) {
      return NextResponse.json<ApiResponse<void>>({ success: false, error: 'Field not found' }, { status: 404 });
    }

    await prisma.customActivityField.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json<ApiResponse<void>>({ success: true });
  } catch (error) {
    console.error('Error deleting custom activity field:', error);
    return NextResponse.json<ApiResponse<void>>({ success: false, error: 'Failed to delete field' }, { status: 500 });
  }
}

export const POST = withAuthContext(handlePost as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const PUT = withAuthContext(handlePut as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const DELETE = withAuthContext(handleDelete as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
