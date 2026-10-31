import type { Request } from 'express';
import type { CallerClaims, UserClaims } from './tokens.js';

export interface AuthenticatedRequest extends Request {
  caller?: CallerClaims;
  user?: UserClaims;
}
