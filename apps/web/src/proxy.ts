import { decodeJwt } from 'jose';
import { type NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session-cookies';

const BLOB_ORIGINS = 'https://*.public.blob.vercel-storage.com';
const PUBLIC_PATHS = new Set(['/', '/login', '/registro']);

function contentSecurityPolicy(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${BLOB_ORIGINS}`,
    `media-src 'self' blob: ${BLOB_ORIGINS}`,
    `connect-src 'self' ${BLOB_ORIGINS} https://vercel.com https://blob.vercel-storage.com${isDevelopment ? ' ws:' : ''}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function roleHome(request: NextRequest): string | null {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) {
    return request.cookies.has(REFRESH_COOKIE) ? '/inicio' : null;
  }
  try {
    return decodeJwt(token).role === 'specialist' ? '/solicitudes' : '/explorar';
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);

  if (!PUBLIC_PATHS.has(pathname) && !hasSession) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }
  if (PUBLIC_PATHS.has(pathname) && hasSession) {
    const home = roleHome(request);
    if (home) {
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', policy);
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'permissions-policy',
    'microphone=(self), geolocation=(self), camera=(self)',
  );
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)'],
};
