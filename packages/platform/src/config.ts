import type { ServiceName } from './tokens.js';

export const PLATFORM_OPTIONS = Symbol('PLATFORM_OPTIONS');
export const PG_POOL = Symbol('PG_POOL');

export interface PlatformOptions {
  service: ServiceName;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}
