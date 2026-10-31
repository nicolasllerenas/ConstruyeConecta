import type { ServiceName } from '@cc/platform/tokens';
import { type NextRequest, NextResponse } from 'next/server';
import { callService, clientIp, rejectForeignOrigin, resolveSession } from '@/lib/gateway';
import { clearSessionCookies, setSessionCookies } from '@/lib/session-cookies';

const ROUTED_SERVICES: readonly ServiceName[] = [
  'identity',
  'marketplace',
  'contracts',
  'reputation',
];
const IDENTITY_PUBLIC_PATHS = new Set(['me']);
const MAX_BODY_BYTES = 256 * 1024;

interface RouteContext {
  params: Promise<{ service: string; path: string[] }>;
}

function isRoutable(service: string, path: string[]): service is ServiceName {
  if (!ROUTED_SERVICES.includes(service as ServiceName) || path[0] === 'internal') {
    return false;
  }
  return service !== 'identity' || IDENTITY_PUBLIC_PATHS.has(path.join('/'));
}

async function forward(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { service, path } = await context.params;
  if (!isRoutable(service, path)) {
    return NextResponse.json({ message: 'Ruta no encontrada' }, { status: 404 });
  }
  const rejected = rejectForeignOrigin(request);
  if (rejected) {
    return rejected;
  }
  const session = await resolveSession(request);
  if (session.invalid || !session.accessToken) {
    const unauthorized = NextResponse.json({ message: 'Inicia sesión' }, { status: 401 });
    if (session.invalid) {
      clearSessionCookies(unauthorized);
    }
    return unauthorized;
  }
  const body =
    request.method === 'GET' || request.method === 'DELETE' ? undefined : await request.text();
  if (body && Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return NextResponse.json({ message: 'La solicitud es muy grande' }, { status: 413 });
  }
  let upstream: Response;
  try {
    upstream = await callService({
      service,
      path: `/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`,
      method: request.method,
      ip: clientIp(request),
      accessToken: session.accessToken,
      body,
    });
  } catch {
    return NextResponse.json(
      { message: 'El servicio no respondió. Inténtalo de nuevo.' },
      { status: 503 },
    );
  }
  const response = new NextResponse(upstream.status === 204 ? null : await upstream.text(), {
    status: upstream.status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
  if (session.renewed) {
    setSessionCookies(response, session.renewed);
  }
  return response;
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const DELETE = forward;
