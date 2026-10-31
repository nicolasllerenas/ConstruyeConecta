import type { Role } from '@cc/contracts';
import { importPKCS8, importSPKI, jwtVerify, SignJWT } from 'jose';

export const SERVICE_NAMES = ['identity', 'marketplace', 'contracts', 'reputation'] as const;
export type ServiceName = (typeof SERVICE_NAMES)[number];
export type CallerName = ServiceName | 'gateway';

const USER_TOKEN_ISSUER = 'identity';
const USER_TOKEN_AUDIENCE = 'construyeconecta';
const SERVICE_TOKEN_TTL = '60s';
const USER_ALGORITHM = 'ES256';
const SERVICE_ALGORITHM = 'HS256';

export interface UserClaims {
  id: string;
  role: Role;
}

export interface CallerClaims {
  name: CallerName;
  ip: string;
}

function decodePem(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf8');
}

function secretBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signUserToken(
  privateKeyBase64: string,
  user: UserClaims,
  ttlSeconds: number,
): Promise<string> {
  const key = await importPKCS8(decodePem(privateKeyBase64), USER_ALGORITHM);
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: USER_ALGORITHM })
    .setSubject(user.id)
    .setIssuer(USER_TOKEN_ISSUER)
    .setAudience(USER_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key);
}

export async function verifyUserToken(publicKeyBase64: string, token: string): Promise<UserClaims> {
  const key = await importSPKI(decodePem(publicKeyBase64), USER_ALGORITHM);
  const { payload } = await jwtVerify(token, key, {
    issuer: USER_TOKEN_ISSUER,
    audience: USER_TOKEN_AUDIENCE,
    algorithms: [USER_ALGORITHM],
  });
  if (!payload.sub || (payload.role !== 'family' && payload.role !== 'specialist')) {
    throw new Error('Invalid user token claims');
  }
  return { id: payload.sub, role: payload.role };
}

export async function signServiceToken(
  secret: string,
  caller: CallerClaims,
  audience: ServiceName,
): Promise<string> {
  return new SignJWT({ ip: caller.ip })
    .setProtectedHeader({ alg: SERVICE_ALGORITHM })
    .setIssuer(caller.name)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(SERVICE_TOKEN_TTL)
    .sign(secretBytes(secret));
}

export async function verifyServiceToken(
  secret: string,
  token: string,
  audience: ServiceName,
): Promise<CallerClaims> {
  const { payload } = await jwtVerify(token, secretBytes(secret), {
    audience,
    algorithms: [SERVICE_ALGORITHM],
  });
  if (!payload.iss || typeof payload.ip !== 'string') {
    throw new Error('Invalid service token claims');
  }
  return { name: payload.iss as CallerName, ip: payload.ip };
}
