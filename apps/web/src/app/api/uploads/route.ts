import { AUDIO_CONTENT_TYPES, IMAGE_CONTENT_TYPES, MAX_UPLOAD_BYTES } from '@cc/contracts';
import { verifyUserToken } from '@cc/platform/tokens';
import { type HandleUploadBody, handleUpload } from '@vercel/blob/client';
import { type NextRequest, NextResponse } from 'next/server';
import { isSameOrigin, resolveSession } from '@/lib/gateway';
import { setSessionCookies } from '@/lib/session-cookies';

const TOKEN_VALIDITY_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;
  const isTokenRequest = body.type === 'blob.generate-client-token';
  if (isTokenRequest && !isSameOrigin(request)) {
    return NextResponse.json({ message: 'Origen no permitido' }, { status: 403 });
  }
  const session = isTokenRequest ? await resolveSession(request) : { invalid: false };
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const accessToken = 'accessToken' in session ? session.accessToken : undefined;
        if (!accessToken) {
          throw new Error('Inicia sesión para subir archivos');
        }
        const user = await verifyUserToken(process.env.JWT_PUBLIC_KEY ?? '', accessToken);
        return {
          allowedContentTypes: [...IMAGE_CONTENT_TYPES, ...AUDIO_CONTENT_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + TOKEN_VALIDITY_MS,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async () => undefined,
    });
    const response = NextResponse.json(result);
    if ('renewed' in session && session.renewed) {
      setSessionCookies(response, session.renewed);
    }
    return response;
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
