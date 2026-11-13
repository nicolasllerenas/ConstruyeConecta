import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  type LoginInput,
  REFRESH_TOKEN_TTL_SECONDS,
  type RegisterInput,
  type SessionUser,
  type TokenPair,
} from '@cc/contracts';
import { isUniqueViolation, RateLimiter, requireEnv, signUserToken } from '@cc/platform';
import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { type Database, DB } from '../database.js';
import { refreshSessions, users } from '../schema.js';
import { hashPassword, verifyPassword } from './passwords.js';

const LOGIN_RULE_BY_EMAIL = { limit: 10, windowSeconds: 900 };
const ROTATION_GRACE_MS = 30_000;
const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos';
const INVALID_SESSION = 'Tu sesión expiró. Vuelve a iniciar sesión.';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toSessionUser(user: typeof users.$inferSelect): SessionUser {
  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
}

@Injectable()
export class AuthService {
  private decoyHash?: Promise<string>;

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
  ) {}

  async register(input: RegisterInput): Promise<TokenPair> {
    const passwordHash = await hashPassword(input.password);
    try {
      const [user] = await this.db
        .insert(users)
        .values({
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          role: input.role,
        })
        .returning();
      return this.issueTokens(user as typeof users.$inferSelect, randomUUID());
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Ya existe una cuenta con ese correo');
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<TokenPair> {
    await this.limiter.consume(`login:${input.email}`, LOGIN_RULE_BY_EMAIL);
    const [user] = await this.db.select().from(users).where(eq(users.email, input.email));
    this.decoyHash ??= hashPassword(randomUUID());
    const stored = user?.passwordHash ?? (await this.decoyHash);
    const valid = await verifyPassword(input.password, stored);
    if (!user || !valid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return this.issueTokens(user, randomUUID());
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);
    const [session] = await this.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.tokenHash, tokenHash));
    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException(INVALID_SESSION);
    }
    if (session.revokedAt) {
      throw new UnauthorizedException(INVALID_SESSION);
    }
    if (session.rotatedAt && !this.isWithinRotationGrace(session.rotatedAt)) {
      await this.revokeFamily(session.familyId);
      throw new UnauthorizedException(INVALID_SESSION);
    }
    await this.db
      .update(refreshSessions)
      .set({ rotatedAt: new Date() })
      .where(and(eq(refreshSessions.id, session.id), isNull(refreshSessions.rotatedAt)));
    const [user] = await this.db.select().from(users).where(eq(users.id, session.userId));
    if (!user) {
      throw new UnauthorizedException(INVALID_SESSION);
    }
    return this.issueTokens(user, session.familyId);
  }

  async logout(refreshToken: string): Promise<void> {
    const [session] = await this.db
      .select({ familyId: refreshSessions.familyId })
      .from(refreshSessions)
      .where(eq(refreshSessions.tokenHash, hashToken(refreshToken)));
    if (session) {
      await this.revokeFamily(session.familyId);
    }
  }

  async me(userId: string): Promise<SessionUser> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new UnauthorizedException(INVALID_SESSION);
    }
    return toSessionUser(user);
  }

  private isWithinRotationGrace(rotatedAt: Date): boolean {
    return Date.now() - rotatedAt.getTime() < ROTATION_GRACE_MS;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(refreshSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshSessions.familyId, familyId), isNull(refreshSessions.revokedAt)));
  }

  private async issueTokens(user: typeof users.$inferSelect, familyId: string): Promise<TokenPair> {
    const accessToken = await signUserToken(
      requireEnv('JWT_PRIVATE_KEY'),
      { id: user.id, role: user.role },
      ACCESS_TOKEN_TTL_SECONDS,
    );
    const refreshToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    await this.db.insert(refreshSessions).values({
      userId: user.id,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });
    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: expiresAt.toISOString(),
      user: toSessionUser(user),
    };
  }
}
