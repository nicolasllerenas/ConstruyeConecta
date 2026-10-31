import type { Role } from '@cc/contracts';
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthenticatedRequest } from './request.js';

export const OPEN_KEY = 'cc:open';
export const ANONYMOUS_KEY = 'cc:anonymous';
export const INTERNAL_KEY = 'cc:internal';
export const ROLES_KEY = 'cc:roles';
export const RATE_LIMIT_KEY = 'cc:rate-limit';

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

export const Open = () => SetMetadata(OPEN_KEY, true);
export const Anonymous = () => SetMetadata(ANONYMOUS_KEY, true);
export const InternalOnly = () => SetMetadata(INTERNAL_KEY, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const RateLimit = (rule: RateLimitRule) => SetMetadata(RATE_LIMIT_KEY, rule);

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
});
