import type { TokenPair } from '@cc/contracts';
import { type ServiceName, signServiceToken } from '@cc/platform/tokens';
import { decodeJwt } from 'jose';
import { type NextRequest, NextResponse } from 'next/server';
import { readAccessToken, readRefreshToken } from './session-cookies';

const REQUEST_TIMEOUT_MS = 15_000;
const EXPIRY_MARGIN_SECONDS = 15;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!origin || !host) {
    return false;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function rejectForeignOrigin(request: NextRequest): NextResponse | null {
  if (request.method === 'GET' || request.method === 'HEAD' || isSameOrigin(request)) {
    return null;
  }
  return NextResponse.json({ message: 'Origen no permitido' }, { status: 403 });
}

export interface ServiceCall {
  service: ServiceName;
  path: string;
  method: string;
  ip: string;
  accessToken?: string;
  body?: string;
}

export async function callService(call: ServiceCall): Promise<Response> {
  const serviceToken = await signServiceToken(
    requiredEnv('INTERNAL_SERVICE_SECRET'),
    { name: 'gateway', ip: call.ip },
    call.service,
  );
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-service-token': serviceToken,
  };
  if (call.accessToken) {
    headers.authorization = `Bearer ${call.accessToken}`;
  }
  return fetch(`${requiredEnv(`${call.service.toUpperCase()}_URL`)}${call.path}`, {
    method: call.method,
    headers,
    body: call.body,
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

function isExpiring(token: string): boolean {
  try {
    const { exp } = decodeJwt(token);
    return !exp || exp - EXPIRY_MARGIN_SECONDS < Date.now() / 1000;
  } catch {
    return true;
  }
}

export interface ResolvedSession {
  accessToken?: string;
  renewed?: TokenPair;
  invalid: boolean;
}

export async function resolveSession(request: NextRequest): Promise<ResolvedSession> {
  const accessToken = readAccessToken(request);
  if (accessToken && !isExpiring(accessToken)) {
    return { accessToken, invalid: false };
  }
  const refreshToken = readRefreshToken(request);
  if (!refreshToken) {
    return { invalid: false };
  }
  const response = await callService({
    service: 'identity',
    path: '/auth/refresh',
    method: 'POST',
    ip: clientIp(request),
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    return { invalid: true };
  }
  const renewed = (await response.json()) as TokenPair;
  return { accessToken: renewed.accessToken, renewed, invalid: false };
}
