import type { TokenPair } from '@cc/contracts';
import { type NextRequest, NextResponse } from 'next/server';
import { callService, clientIp, rejectForeignOrigin } from '@/lib/gateway';
import { setSessionCookies } from '@/lib/session-cookies';

export async function exchangeCredentials(
  request: NextRequest,
  path: '/auth/login' | '/auth/register',
): Promise<NextResponse> {
  const rejected = rejectForeignOrigin(request);
  if (rejected) {
    return rejected;
  }
  let upstream: Response;
  try {
    upstream = await callService({
      service: 'identity',
      path,
      method: 'POST',
      ip: clientIp(request),
      body: await request.text(),
    });
  } catch {
    return NextResponse.json(
      { message: 'El servicio no respondió. Inténtalo de nuevo.' },
      { status: 503 },
    );
  }
  const payload = await upstream.json();
  if (!upstream.ok) {
    return NextResponse.json(payload, { status: upstream.status });
  }
  const tokens = payload as TokenPair;
  const response = NextResponse.json({ user: tokens.user });
  setSessionCookies(response, tokens);
  return response;
}
