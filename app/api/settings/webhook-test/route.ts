import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '../../types';
import { withAuthContext, AuthResult } from '../../utils/auth';
import { checkWritePermission } from '../../utils/writeProtection';
import { dispatchOutboundWebhook } from '@/src/lib/webhooks/outbound';

async function handlePost(_req: NextRequest, authContext: AuthResult) {
  const writeCheck = checkWritePermission(authContext);
  if (!writeCheck.allowed) return writeCheck.response!;

  const { familyId } = authContext;
  if (!familyId) {
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
  }

  // dispatchOutboundWebhook is a no-op if disabled / no URL; it never throws.
  await dispatchOutboundWebhook(familyId, 'test', { message: 'Sprout Track webhook test' });

  return NextResponse.json<ApiResponse<null>>({ success: true });
}

export const POST = withAuthContext(handlePost as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
