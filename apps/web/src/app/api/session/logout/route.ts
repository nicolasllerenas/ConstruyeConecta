import { type NextRequest, NextResponse } from 'next/server';
import { callService, clientIp, rejectForeignOrigin } from '@/lib/gateway';
import { clearSessionCookies, readRefreshToken } from '@/lib/session-cookies';

export async function POST(request: NextRequest) {
  const rejected = rejectForeignOrigin(request);
  if (rejected) {
    return rejected;
  }
  const refreshToken = readRefreshToken(request);
  if (refreshToken) {
    await callService({
      service: 'identity',
      path: '/auth/logout',
      method: 'POST',
      ip: clientIp(request),
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response);
  return response;
}
