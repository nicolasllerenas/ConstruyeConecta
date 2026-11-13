import {
  type LoginInput,
  loginSchema,
  type RegisterInput,
  refreshSchema,
  registerSchema,
} from '@cc/contracts';
import { Anonymous, CurrentUser, RateLimit, type UserClaims, ZodPipe } from '@cc/platform';
import { Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller()
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Anonymous()
  @RateLimit({ limit: 30, windowSeconds: 3600 })
  @Post('auth/register')
  register(@Body(new ZodPipe(registerSchema)) input: RegisterInput) {
    return this.auth.register(input);
  }

  @Anonymous()
  @RateLimit({ limit: 20, windowSeconds: 60 })
  @HttpCode(200)
  @Post('auth/login')
  login(@Body(new ZodPipe(loginSchema)) input: LoginInput) {
    return this.auth.login(input);
  }

  @Anonymous()
  @RateLimit({ limit: 60, windowSeconds: 60 })
  @HttpCode(200)
  @Post('auth/refresh')
  refresh(@Body(new ZodPipe(refreshSchema)) input: { refreshToken: string }) {
    return this.auth.refresh(input.refreshToken);
  }

  @Anonymous()
  @HttpCode(204)
  @Post('auth/logout')
  async logout(@Body(new ZodPipe(refreshSchema)) input: { refreshToken: string }) {
    await this.auth.logout(input.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: UserClaims) {
    return this.auth.me(user.id);
  }
}
