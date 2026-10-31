import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Pool } from 'pg';
import { AuthGuard } from './auth.guard.js';
import { PG_POOL, PLATFORM_OPTIONS, type PlatformOptions, requireEnv } from './config.js';
import { HealthController } from './health.controller.js';
import { RateLimiter, RateLimitGuard } from './rate-limit.js';
import { ServiceClient } from './service-client.js';

const POOL_MAX_CONNECTIONS = 3;
const POOL_IDLE_TIMEOUT_MS = 10_000;

@Global()
@Module({})
export class PlatformModule {
  static forRoot(options: PlatformOptions): DynamicModule {
    return {
      module: PlatformModule,
      controllers: [HealthController],
      providers: [
        { provide: PLATFORM_OPTIONS, useValue: options },
        {
          provide: PG_POOL,
          useFactory: () =>
            new Pool({
              connectionString: requireEnv('SERVICE_DATABASE_URL'),
              max: POOL_MAX_CONNECTIONS,
              idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
            }),
        },
        RateLimiter,
        ServiceClient,
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RateLimitGuard },
      ],
      exports: [PG_POOL, PLATFORM_OPTIONS, RateLimiter, ServiceClient],
    };
  }
}
