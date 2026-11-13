import useSWR, { type SWRConfiguration } from 'swr';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

const GENERIC_ERROR = 'Algo salió mal. Inténtalo de nuevo.';

function readMessage(payload: unknown): string {
  const message = (payload as { message?: unknown } | null)?.message;
  if (typeof message === 'string') {
    return message;
  }
  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0];
  }
  return GENERIC_ERROR;
}

export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('session/')) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
    throw new ApiError(
      readMessage(payload),
      response.status,
      (payload as { issues?: { path: string; message: string }[] } | null)?.issues,
    );
  }
  return payload as T;
}

export function useApi<T>(path: string | null, options?: SWRConfiguration<T, ApiError>) {
  return useSWR<T, ApiError>(path, (key: string) => request<T>(key), {
    revalidateOnFocus: true,
    shouldRetryOnError: (error) => error.status >= 500,
    errorRetryCount: 3,
    ...options,
  });
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR;
}
