import { HttpException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PLATFORM_OPTIONS, type PlatformOptions, requireEnv } from './config.js';
import { type ServiceName, signServiceToken } from './tokens.js';

const REQUEST_TIMEOUT_MS = 8000;

@Injectable()
export class ServiceClient {
  constructor(@Inject(PLATFORM_OPTIONS) private readonly options: PlatformOptions) {}

  get<T>(target: ServiceName, path: string): Promise<T> {
    return this.request<T>(target, 'GET', path);
  }

  post<T>(target: ServiceName, path: string, body: unknown): Promise<T> {
    return this.request<T>(target, 'POST', path, body);
  }

  private async request<T>(
    target: ServiceName,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await signServiceToken(
      requireEnv('INTERNAL_SERVICE_SECRET'),
      { name: this.options.service, ip: 'internal' },
      target,
    );
    const baseUrl = requireEnv(`${target.toUpperCase()}_URL`);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-service-token': token },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException(`El servicio ${target} no está disponible`);
    }
    if (response.status >= 500) {
      throw new ServiceUnavailableException(`El servicio ${target} no está disponible`);
    }
    const payload = (await response.json()) as T;
    if (!response.ok) {
      throw new HttpException(payload as object, response.status);
    }
    return payload;
  }
}
