import { ACCESS_TOKEN_TTL_SECONDS, type TokenPair } from '@cc/contracts';
import type { NextRequest, NextResponse } from 'next/server';

const SECURE = process.env.NODE_ENV === 'production';
const PREFIX = SECURE ? '__Host-' : '';

export const ACCESS_COOKIE = `${PREFIX}cc_access`;
export const REFRESH_COOKIE = `${PREFIX}cc_refresh`;

const baseOptions = {
  httpOnly: true,
  secure: SECURE,
  sameSite: 'lax' as const,
  path: '/',
};

export function setSessionCookies(response: NextResponse, tokens: TokenPair): void {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions,
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions,
    expires: new Date(tokens.refreshExpiresAt),
  });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, '', { ...baseOptions, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, '', { ...baseOptions, maxAge: 0 });
}

export function readRefreshToken(request: NextRequest): string | undefined {
  return request.cookies.get(REFRESH_COOKIE)?.value;
}

export function readAccessToken(request: NextRequest): string | undefined {
  return request.cookies.get(ACCESS_COOKIE)?.value;
}
