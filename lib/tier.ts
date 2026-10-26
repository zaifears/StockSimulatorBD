// lib/tier.ts
// Single source of truth for Account Tier and Boss duration evaluation across StockSimulatorBD.
// Pure functions, compatible with both browser (client components/contexts) and server (API routes).

export type AccountTier = 'Bro' | 'Boss';

/**
 * Resolves the numeric milliseconds of a bossUntil timestamp from various Firestore formats
 * (number, Firestore Timestamp object with toMillis() or toDate(), or ISO string).
 */
export function parseBossUntilMs(bossUntil: any): number {
  if (!bossUntil) return 0;
  if (typeof bossUntil === 'number') return isNaN(bossUntil) ? 0 : bossUntil;
  if (typeof bossUntil.toMillis === 'function') return bossUntil.toMillis();
  if (typeof bossUntil.toDate === 'function') return bossUntil.toDate().getTime();
  if (typeof bossUntil === 'string') {
    const parsed = Date.parse(bossUntil);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Determines whether a user currently has active Boss tier privileges.
 * 
 * Rules:
 * 1. If bossUntilMs is set and in the past (bossUntilMs > 0 && bossUntilMs <= now),
 *    the subscription has EXPIRED. Return false (user is Bro, even if DB hasn't downgraded yet).
 * 2. If bossUntilMs is in the future (bossUntilMs > now), user is actively Boss. Return true.
 * 3. If accountTier === 'Boss' AND bossUntil is 0/null/undefined, user is a permanent / lifetime Boss. Return true.
 * 4. Otherwise, user is Bro. Return false.
 */
export function isBossActive(
  userData: { accountTier?: string | null; bossUntil?: any } | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!userData) return false;
  const bossUntilMs = parseBossUntilMs(userData.bossUntil);
  const hasExpiry = bossUntilMs > 0;
  const isExpired = hasExpiry && bossUntilMs <= nowMs;
  if (isExpired) return false;

  if (hasExpiry && bossUntilMs > nowMs) return true;
  if (userData.accountTier === 'Boss' && !hasExpiry) return true;
  return false;
}

/**
 * Checks if a user was on a timed Boss plan that is now expired.
 */
export function isBossExpired(
  userData: { accountTier?: string | null; bossUntil?: any } | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!userData) return false;
  const bossUntilMs = parseBossUntilMs(userData.bossUntil);
  return bossUntilMs > 0 && bossUntilMs <= nowMs;
}

/**
 * Checks if a user has true permanent/lifetime Boss access (no expiry date set).
 */
export function isBossLifetime(
  userData: { accountTier?: string | null; bossUntil?: any } | null | undefined
): boolean {
  if (!userData) return false;
  const bossUntilMs = parseBossUntilMs(userData.bossUntil);
  return userData.accountTier === 'Boss' && bossUntilMs === 0;
}

/**
 * Returns the effective runtime tier ('Boss' | 'Bro') taking expiration into account.
 */
export function getEffectiveTier(
  userData: { accountTier?: string | null; bossUntil?: any } | null | undefined,
  nowMs = Date.now()
): AccountTier {
  return isBossActive(userData, nowMs) ? 'Boss' : 'Bro';
}
