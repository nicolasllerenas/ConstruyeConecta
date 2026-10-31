import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Pool } from 'pg';
import { PG_POOL, PLATFORM_OPTIONS, type PlatformOptions } from './config.js';
import { OPEN_KEY, RATE_LIMIT_KEY, type RateLimitRule } from './decorators.js';
import type { AuthenticatedRequest } from './request.js';

const DEFAULT_RULE: RateLimitRule = { limit: 300, windowSeconds: 60 };
const CLEANUP_PROBABILITY = 0.01;

@Injectable()
export class RateLimiter {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(PLATFORM_OPTIONS) private readonly options: PlatformOptions,
  ) {}

  async consume(key: string, rule: RateLimitRule): Promise<void> {
    const table = `${this.options.service}.rate_limits`;
    const windowMs = rule.windowSeconds * 1000;
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
    const result = await this.pool.query<{ hits: number }>(
      `INSERT INTO ${table} (key, window_start, hits) VALUES ($1, $2, 1)
       ON CONFLICT (key, window_start) DO UPDATE SET hits = ${table}.hits + 1
       RETURNING hits`,
      [key, windowStart],
    );
    if (Math.random() < CLEANUP_PROBABILITY) {
      await this.pool.query(`DELETE FROM ${table} WHERE window_start < now() - interval '1 day'`);
    }
    if ((result.rows[0]?.hits ?? 0) > rule.limit) {
      throw new HttpException(
        'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(OPEN_KEY, targets)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.caller && request.caller.name !== 'gateway') {
      return true;
    }
    const rule =
      this.reflector.getAllAndOverride<RateLimitRule | undefined>(RATE_LIMIT_KEY, targets) ??
      DEFAULT_RULE;
    const subject = request.user?.id ?? request.caller?.ip ?? 'unknown';
    const scope = `${context.getClass().name}.${context.getHandler().name}`;
    await this.limiter.consume(`${scope}:${subject}`, rule);
    return true;
  }
}
