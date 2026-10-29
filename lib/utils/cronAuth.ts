import crypto from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Constant-time string comparison using crypto.timingSafeEqual.
 * Prevents timing side-channel attacks on secret tokens.
 */
export function timingSafeEqualStr(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies CRON_SECRET on incoming Next.js cron/sync requests via either
 * `Authorization: Bearer <secret>` or `x-api-key: <secret>` in constant time.
 */
export function verifyCronSecret(request: NextRequest): { ok: true } | { ok: false; status: 401 | 500; error: string } {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return { ok: false, status: 500, error: 'Server misconfiguration' };
  }

  const authHeader = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');

  const bearerMatch = timingSafeEqualStr(authHeader, `Bearer ${expectedSecret}`);
  const apiKeyMatch = timingSafeEqualStr(apiKey, expectedSecret);

  if (!bearerMatch && !apiKeyMatch) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true };
}
