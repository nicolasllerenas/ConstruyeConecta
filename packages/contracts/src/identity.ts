import { z } from 'zod';

export const ROLES = ['family', 'specialist'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(10, 'Usa al menos 10 caracteres').max(128),
  fullName: z.string().trim().min(2).max(120),
  role: roleSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(32).max(128) });

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: string;
  user: SessionUser;
}

export const ACCESS_TOKEN_TTL_SECONDS = 900;
export const REFRESH_TOKEN_TTL_SECONDS = 2_592_000;
