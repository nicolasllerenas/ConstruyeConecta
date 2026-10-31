import type { Role } from '@cc/contracts';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLATFORM_OPTIONS, type PlatformOptions, requireEnv } from './config.js';
import { ANONYMOUS_KEY, INTERNAL_KEY, OPEN_KEY, ROLES_KEY } from './decorators.js';
import type { AuthenticatedRequest } from './request.js';
import {
  type CallerClaims,
  type UserClaims,
  verifyServiceToken,
  verifyUserToken,
} from './tokens.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PLATFORM_OPTIONS) private readonly options: PlatformOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.hasFlag(OPEN_KEY, context)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.caller = await this.authenticateCaller(request);

    if (this.hasFlag(INTERNAL_KEY, context)) {
      if (request.caller.name === 'gateway') {
        throw new ForbiddenException();
      }
      return true;
    }
    if (this.hasFlag(ANONYMOUS_KEY, context)) {
      return true;
    }

    request.user = await this.authenticateUser(request);
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(request.user.role)) {
      throw new ForbiddenException();
    }
    return true;
  }

  private hasFlag(key: string, context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean | undefined>(key, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private async authenticateCaller(request: AuthenticatedRequest): Promise<CallerClaims> {
    const token = request.headers['x-service-token'];
    if (typeof token !== 'string') {
      throw new UnauthorizedException();
    }
    try {
      return await verifyServiceToken(
        requireEnv('INTERNAL_SERVICE_SECRET'),
        token,
        this.options.service,
      );
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async authenticateUser(request: AuthenticatedRequest): Promise<UserClaims> {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }
    try {
      return await verifyUserToken(requireEnv('JWT_PUBLIC_KEY'), header.slice('Bearer '.length));
    } catch {
      throw new UnauthorizedException();
    }
  }
}
