import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../db';
import { ApiResponse } from '../../types';
import jwt from 'jsonwebtoken';
import { validateCloudflareJwt } from '@/src/lib/cloudflare-access';
import { ACCESS_TOKEN_LIFE, createRefreshToken, setRefreshTokenCookie } from '../../utils/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'baby-tracker-jwt-secret';

function getCfToken(req: NextRequest): string | null {
  return (
    req.cookies.get('CF_Authorization')?.value ||
    req.headers.get('Cf-Access-Jwt-Assertion') ||
    null
  );
}

function isCfConfigured(): boolean {
  return (
    process.env.CLOUDFLARE_ACCESS_SKIP_PIN === 'true' &&
    !!process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN &&
    !!process.env.CLOUDFLARE_ACCESS_AUDIENCE
  );
}

// GET /api/auth/cloudflare/check
// Returns { available: true } only when CF Access is configured AND the request carries a CF JWT,
// meaning it arrived via the Cloudflare tunnel (not local network access).
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<{ available: boolean }>>> {
  if (!isCfConfigured()) {
    return NextResponse.json({ success: true, data: { available: false } });
  }
  return NextResponse.json({ success: true, data: { available: !!getCfToken(req) } });
}

// POST /api/auth/cloudflare
// Validates the CF Access JWT and returns an app session token for the matching account.
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  if (!isCfConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Cloudflare Access SSO is not enabled' },
      { status: 501 },
    );
  }

  const cfToken = getCfToken(req);
  if (!cfToken) {
    return NextResponse.json(
      { success: false, error: 'No Cloudflare Access token present on this request' },
      { status: 401 },
    );
  }

  const teamDomain = process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN!;
  const audience = process.env.CLOUDFLARE_ACCESS_AUDIENCE!;

  let email: string;
  try {
    const payload = await validateCloudflareJwt(cfToken, teamDomain, audience);
    email = payload.email;
  } catch (err) {
    console.error('CF JWT validation failed:', err);
    return NextResponse.json(
      { success: false, error: 'Invalid or expired Cloudflare Access token' },
      { status: 401 },
    );
  }

  // Normalize email — stored emails should already be lowercase, but be safe
  const normalizedEmail = email.toLowerCase().trim();

  const account = await prisma.account.findFirst({
    where: { email: normalizedEmail },
    include: {
      family: { select: { id: true, slug: true } },
    },
  });

  if (!account) {
    return NextResponse.json(
      {
        success: false,
        error: `No account found for ${normalizedEmail}. Please log in with your password first to link your account.`,
      },
      { status: 404 },
    );
  }

  if (account.closed) {
    return NextResponse.json(
      { success: false, error: 'This account has been closed' },
      { status: 403 },
    );
  }

  const token = jwt.sign(
    {
      accountId: account.id,
      accountEmail: account.email,
      isAccountAuth: true,
      familyId: account.family?.id || null,
      familySlug: account.family?.slug || null,
    },
    JWT_SECRET,
    { expiresIn: `${ACCESS_TOKEN_LIFE}s` },
  );

  const responseData = {
    token,
    user: {
      email: account.email,
      firstName: account.firstName,
      familySlug: account.family?.slug || null,
    },
  };

  const response = NextResponse.json<ApiResponse<typeof responseData>>({
    success: true,
    data: responseData,
  });

  const refreshToken = createRefreshToken({
    userId: account.id,
    authType: 'ACCOUNT',
    familyId: account.family?.id || null,
    accountId: account.id,
  });
  setRefreshTokenCookie(response, refreshToken);

  return response;
}
