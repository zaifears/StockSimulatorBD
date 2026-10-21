// lib/utils/marketHours.ts
// Authoritative, server-side market-open check for the trade API
// (app/api/simulator/trade/route.ts).
//
// Mirrors hooks/useSimulator.ts's isMarketOpen() exactly: same BD-time
// conversion (UTC+6), same Fri/Sat weekend, same 10:00-14:15 trading window.
// The one deliberate difference is the holiday source — the client's
// isMarketOpen() reads from React state populated by
// lib/bangladeshHolidays.ts's getUpcomingHolidays(), which calls a relative
// `/api/holidays` URL that only resolves inside a browser. Server-side we go
// straight to that same file's getHolidayDetails(), which is synchronous and
// reads the local BD_HOLIDAYS dataset directly — no network dependency in
// the authoritative path.
import { getHolidayDetails, isSpecialWorkingDay } from '@/lib/bangladeshHolidays';

export function isMarketOpenServer(now: Date = new Date()): boolean {
  // Mirrors the client's preview-mode override.
  if (process.env.NEXT_PUBLIC_IS_PREVIEW_MODE === 'true') {
    return true;
  }

  const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const hour = bdTime.getUTCHours();
  const minute = bdTime.getUTCMinutes();
  const dayOfWeek = bdTime.getUTCDay();
  const year = bdTime.getUTCFullYear();
  const dateStr = `${year}-${String(bdTime.getUTCMonth() + 1).padStart(2, '0')}-${String(bdTime.getUTCDate()).padStart(2, '0')}`;

  if ((dayOfWeek === 5 || dayOfWeek === 6) && !isSpecialWorkingDay(dateStr)) return false; // Friday & Saturday weekend (unless special working Saturday)

  const holidayDates = [...getHolidayDetails(year), ...getHolidayDetails(year + 1)].map((h) => h.date);
  if (holidayDates.includes(dateStr)) return false;

  return hour >= 10 && (hour < 14 || (hour === 14 && minute <= 15));
}

// ── DSE-corroborated market state ──────────────────────────────────────────
//
// isMarketOpenServer() above is calendar-only, and the calendar is a
// hand-maintained list of predicted dates. On 2026-08-25 a wrong entry in it
// (a projected Eid date; the real one was the 26th) reported the market
// closed for a full live session while DSE was trading ~50,000 executions.
// Every order that day was rejected. The calendar is a guess being trusted
// as ground truth.
//
// api/market_sync.py now also captures DSE's own "Market Status: Open" from
// the same board it scrapes for prices, and app/api/stock-sync stores it on
// market_info/latest. That is the exchange stating its own state, so it
// outranks our calendar in BOTH directions:
//
//   - calendar says closed, DSE says Open  → trade (a bad holiday date can
//     no longer take the feature offline)
//   - calendar says open, DSE says Closed  → don't trade (a MISSING holiday
//     can no longer let people trade a frozen board)
//
// Deliberate limits, so this can't become its own outage:
//   - The status only counts while fresh. Price sync runs every ~3 minutes;
//     if the cron dies or DSE is unreachable, nothing is written and the
//     stored status goes stale, at which point we ignore it and fall back
//     to the calendar rather than acting on an old reading.
//   - An unparseable/absent status is "no opinion", never "closed".
//   - Time-of-day is still enforced from the clock, not from DSE's status,
//     so a stuck "Open" can't extend the session past 14:15.

/** How old a stored DSE status may be and still be trusted. Generous next
 * to the ~3-minute sync so an ordinary slow cycle doesn't drop us back to
 * calendar-only, tight enough that a dead sync stops steering decisions. */
export const MARKET_STATUS_MAX_AGE_MS = 20 * 60 * 1000;

export interface MarketStatusInput {
  /** DSE's own status string, verbatim (e.g. "Open", "Closed", "Post Close"). */
  marketStatus?: string | null;
  /** ISO timestamp of the sync that wrote it (market_info/latest.lastUpdated). */
  lastUpdated?: string | null;
}

/**
 * Whether DSE itself currently claims to be open.
 * `null` means "no usable opinion" — absent, unrecognised, or too stale —
 * and callers must fall back to the calendar.
 */
export function getDseReportedOpen(
  input: MarketStatusInput | null | undefined,
  now: Date = new Date()
): boolean | null {
  const raw = input?.marketStatus;
  if (typeof raw !== 'string' || !raw.trim()) return null;

  const age = input?.lastUpdated ? now.getTime() - new Date(input.lastUpdated).getTime() : NaN;
  // NaN (unparseable/missing timestamp) fails this comparison, which is the
  // intended conservative outcome: without knowing when it was read, we
  // can't trust it.
  if (!(age >= 0 && age <= MARKET_STATUS_MAX_AGE_MS)) return null;

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'open') return true;
  // Everything DSE reports that isn't plainly "Open" — "Closed",
  // "Post Close", "Pre Open", a halt — means orders should not execute.
  return false;
}

/**
 * The authoritative market-open decision: the trading-hours clock, with
 * DSE's own status overriding our holiday calendar whenever it is available
 * and fresh.
 */
export function isMarketOpenCorroborated(
  input: MarketStatusInput | null | undefined,
  now: Date = new Date()
): { open: boolean; reason: string } {
  if (process.env.NEXT_PUBLIC_IS_PREVIEW_MODE === 'true') {
    return { open: true, reason: 'preview-mode' };
  }

  // The trading-hours clock (10:00-14:15 Dhaka time) always binds first so a
  // stuck "Open" banner can never extend a session past closing.
  const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const hour = bdTime.getUTCHours();
  const minute = bdTime.getUTCMinutes();
  const withinHours = hour >= 10 && (hour < 14 || (hour === 14 && minute <= 15));
  if (!withinHours) return { open: false, reason: 'outside-hours' };

  const dayOfWeek = bdTime.getUTCDay();
  const year = bdTime.getUTCFullYear();
  const dateStr = `${year}-${String(bdTime.getUTCMonth() + 1).padStart(2, '0')}-${String(bdTime.getUTCDate()).padStart(2, '0')}`;
  const isWeekend = (dayOfWeek === 5 || dayOfWeek === 6) && !isSpecialWorkingDay(dateStr);

  // DSE's own fresh status (<= 20 minutes old) from new.dsebd.org/api/live/prices
  // (session.isOpen) outranks both the holiday calendar AND the weekend rule.
  // When the Bangladesh Government / DSE declares a special working Saturday
  // (such as Saturday 2026-10-17 ahead of Durga Puja), a fresh "Open" reading
  // from DSE lets trading proceed without being blocked by dayOfWeek === 6.
  // Conversely, on a normal weekend, either no fresh sync exists (dseOpen === null,
  // falling back to isWeekend -> closed) or DSE reports "Closed" (dseOpen === false).
  const dseOpen = getDseReportedOpen(input, now);
  if (dseOpen === null) {
    if (isWeekend) return { open: false, reason: 'weekend' };
    const calendarOpen = isMarketOpenServer(now);
    return { open: calendarOpen, reason: calendarOpen ? 'calendar-open' : 'calendar-closed' };
  }

  if (!dseOpen) return { open: false, reason: 'dse-reports-closed' };

  const calendarOpen = isMarketOpenServer(now);
  return {
    open: true,
    reason: calendarOpen
      ? 'dse-open'
      : isWeekend
        ? 'dse-open-overrides-weekend'
        : 'dse-open-overrides-calendar-holiday',
  };
}
