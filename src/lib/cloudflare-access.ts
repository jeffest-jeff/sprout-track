import jwt from 'jsonwebtoken';

export interface CloudflareAccessPayload {
  email: string;
  sub: string;
  aud: string | string[];
  iss: string;
  iat: number;
  exp: number;
  type?: string;
  identity_nonce?: string;
}

interface JwksCache {
  certs: Record<string, string>;
  cachedAt: number;
}

let jwksCache: JwksCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getCloudflarePublicKeys(teamDomain: string): Promise<Record<string, string>> {
  if (jwksCache && Date.now() - jwksCache.cachedAt < CACHE_TTL_MS) {
    return jwksCache.certs;
  }

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) {
    throw new Error(`Failed to fetch Cloudflare certs: ${response.status}`);
  }

  const data = await response.json();
  const certs: Record<string, string> = {};

  // Cloudflare provides PEM certificates for easy RS256 verification
  if (Array.isArray(data.public_certs)) {
    for (const entry of data.public_certs) {
      if (entry.kid && entry.cert) certs[entry.kid] = entry.cert;
    }
  }
  if (data.public_cert?.kid && data.public_cert?.cert) {
    certs[data.public_cert.kid] = data.public_cert.cert;
  }

  jwksCache = { certs, cachedAt: Date.now() };
  return certs;
}

export async function validateCloudflareJwt(
  token: string,
  teamDomain: string,
  audience: string,
): Promise<CloudflareAccessPayload> {
  const certs = await getCloudflarePublicKeys(teamDomain);

  // Extract kid from JWT header
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  let kid: string | undefined;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    kid = header.kid;
  } catch {
    throw new Error('Failed to decode JWT header');
  }

  const cert = (kid && certs[kid]) || Object.values(certs)[0];
  if (!cert) throw new Error('No matching Cloudflare certificate found');

  return jwt.verify(token, cert, {
    algorithms: ['RS256'],
    audience,
    issuer: `https://${teamDomain}`,
  }) as unknown as CloudflareAccessPayload;
}
