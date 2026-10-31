// lib/utils/settlement.ts
// DSE settlement cycle by market category, and the trading-day maths that
// turns a purchase into an "unlocks for sale on" date.
//
//   Category A, B, G, N  ->  T+2
//   Category Z           ->  T+3
//
// Shared by the authoritative trade route (app/api/simulator/trade/route.ts)
// and the client UI (lib/utils/portfolio.ts and the trade screens), so both
// sides count the same trading days. Pure and dependency-light on purpose: the
// only imports are the local holiday dataset, which marketHours.ts already
// ships to the client.
//
// "T+N" counts TRADING days, not calendar days: Friday, Saturday and Bangladesh
// public holidays are skipped (a special working Saturday counts as a trading
// day). A purchase on trading day T becomes sellable on the Nth trading day
// after T.
import { getHolidayDetails, isSpecialWorkingDay } from '@/lib/bangladeshHolidays';

export type SettlementDays = 2 | 3;

/** Categories that settle T+3. Everything else (A, B, G, N) settles T+2. */
const T3_CATEGORIES = new Set(['Z']);

/**
 * Settlement length for a DSE category. A missing or unrecognised category
 * falls back to T+2, the cycle that applies to the large majority of listed
 * securities, rather than guessing the slower Z cycle.
 */
export function getSettlementDays(category?: string | null): SettlementDays {
  const key = typeof category === 'string' ? category.trim().toUpperCase() : '';
  return T3_CATEGORIES.has(key) ? 3 : 2;
}

/** "T+2" or "T+3". */
export function formatSettlement(days: number): string {
  return `T+${days}`;
}

/** Asia/Dhaka calendar day of an instant, as YYYY-MM-DD. */
export function dhakaDateKey(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

const holidayCache = new Map<number, Set<string>>();

function holidaysFor(year: number): Set<string> {
  let set = holidayCache.get(year);
  if (!set) {
    set = new Set(getHolidayDetails(year).map((h) => h.date));
    holidayCache.set(year, set);
  }
  return set;
}

function parseKey(key: string): { year: number; dow: number } {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return { year: y, dow: date.getUTCDay() };
}

/** Whether the exchange trades on this Dhaka calendar day (per the local calendar). */
export function isTradingDay(key: string): boolean {
  const { year, dow } = parseKey(key);
  const weekend = dow === 5 || dow === 6; // Friday, Saturday
  if (weekend && !isSpecialWorkingDay(key)) return false;
  return !holidaysFor(year).has(key);
}

function nextCalendarDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

/**
 * The date that is `days` trading days after `fromKey`. A search guard stops a
 * badly broken calendar from looping; in practice a gap of more than a couple
 * of weeks never occurs.
 */
export function addTradingDays(fromKey: string, days: number): string {
  let cursor = fromKey;
  let remaining = days;
  for (let guard = 0; remaining > 0 && guard < 60; guard++) {
    cursor = nextCalendarDay(cursor);
    if (isTradingDay(cursor)) remaining--;
  }
  return cursor;
}

/** The shape this module needs from a purchase lot. */
export interface SettlementLot {
  quantity: number;
  purchaseDate: string;
  /** Recorded when the shares were bought. Older lots do not have it. */
  settlementDays?: number;
}

/**
 * Days a lot settles in. The value stamped at purchase wins; lots from before
 * category settlement existed fall back to the stock's current category.
 */
export function getLotSettlementDays(lot: SettlementLot, fallbackCategory?: string | null): number {
  return typeof lot.settlementDays === 'number' && lot.settlementDays > 0
    ? lot.settlementDays
    : getSettlementDays(fallbackCategory);
}

/**
 * First Dhaka date (YYYY-MM-DD) on which this lot may be sold. A lot with a
 * missing or unparseable purchaseDate returns '' (settled): the old T+1 check
 * treated such lots as sellable, and a bad date must not lock shares forever.
 */
export function getLotUnlockDate(lot: SettlementLot, fallbackCategory?: string | null): string {
  if (Number.isNaN(new Date(lot.purchaseDate).getTime())) return '';
  return addTradingDays(dhakaDateKey(lot.purchaseDate), getLotSettlementDays(lot, fallbackCategory));
}

export function isLotSaleable(lot: SettlementLot, now: Date, fallbackCategory?: string | null): boolean {
  return dhakaDateKey(now) >= getLotUnlockDate(lot, fallbackCategory);
}

/** Total shares across the lots that have cleared settlement. */
export function getSaleableQuantityFromLots(
  lots: SettlementLot[],
  now: Date = new Date(),
  fallbackCategory?: string | null
): number {
  return lots.reduce((sum, lot) => (isLotSaleable(lot, now, fallbackCategory) ? sum + lot.quantity : sum), 0);
}

/** Shares bought before today's Dhaka date, whether or not they have settled. */
export function getQuantityHeldBeforeToday(lots: SettlementLot[], now: Date = new Date()): number {
  const today = dhakaDateKey(now);
  return lots.reduce((sum, lot) => (dhakaDateKey(lot.purchaseDate) === today ? sum : sum + lot.quantity), 0);
}

/** The earliest still-locked lot: when it unlocks and how many shares unlock then. */
export function getNextUnlock(
  lots: SettlementLot[],
  now: Date = new Date(),
  fallbackCategory?: string | null
): { date: string; quantity: number } | null {
  const todayKey = dhakaDateKey(now);
  let best: { date: string; quantity: number } | null = null;
  for (const lot of lots) {
    const date = getLotUnlockDate(lot, fallbackCategory);
    if (date <= todayKey) continue;
    if (!best || date < best.date) best = { date, quantity: lot.quantity };
    else if (date === best.date) best.quantity += lot.quantity;
  }
  return best;
}

/** "Sun 8 Nov" style label for a YYYY-MM-DD key, in a form that reads the same everywhere. */
export function formatUnlockDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** One plain sentence describing the rule for a category, for tooltips and notices. */
export function describeSettlement(category?: string | null): string {
  const days = getSettlementDays(category);
  const cat = category ? ` (category ${category.trim().toUpperCase()})` : '';
  return `${formatSettlement(days)}${cat}: shares can be sold ${days} trading days after the purchase date.`;
}
