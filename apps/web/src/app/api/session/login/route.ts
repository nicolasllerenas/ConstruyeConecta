import type { NextRequest } from 'next/server';
import { exchangeCredentials } from '../session-call';

export function POST(request: NextRequest) {
  return exchangeCredentials(request, '/auth/login');
}
