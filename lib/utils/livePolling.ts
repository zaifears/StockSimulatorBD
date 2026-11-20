// lib/utils/livePolling.ts
// How often the browser fetches market data (hooks/useSimulator.ts).
//
// 20 s polling only makes sense while DSE is (or may soon be) trading. On a
// Friday, Saturday or holiday it would just refetch Thursday's prices all
// morning, so those days drop back to 3 minutes.
//
// The holiday calendar alone can't decide this: it is a hand-maintained guess
// (on 2026-08-25 a wrong Eid date in it marked a full trading day closed), and
// DSE sometimes opens on a Saturday. So data written today always wins: as
// soon as price-feed (or stock-sync) writes on a day the calendar called
// closed, the next 3-minute fetch sees today's date on it and polling goes
// back to 20 s. The cost of a wrong calendar is at most ~3 minutes of slower
// prices, never frozen ones.
//
// Pure functions of a Date so they can be checked without a browser.

import { getHolidayDetails, isSpecialWorkingDay } from '../bangladeshHolidays';

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // UTC+6, no DST

export const FAST_POLL_SECS = 20;
export const SLOW_POLL_SECS = 180;
/** Fast polling window, 09:45–14:30 Dhaka (minutes of the day). */
const POLL_WINDOW_START = 9 * 60 + 45;
const POLL_WINDOW_END = 14 * 60 + 30;
/** On a calendar trading day with no data yet today, poll fast until 10:30, then assume DSE isn't opening. */
const NO_DATA_GRACE_END = 10 * 60 + 30;

/** Read Firestore at most this often when the snapshot is stale and DSE should be trading (the old cadence). */
export const STALE_FALLBACK_TRADING_MS = 3 * 60_000;
/** ...and this often on a day the calendar calls closed, so a feed outage on a surprise session is still caught. */
export const STALE_FALLBACK_CLOSED_MS = 15 * 60_000;

export function dhakaMinuteOfDay(now: Date = new Date()): number {
  return (now.getUTCHours() * 60 + now.getUTCMinutes() + 360) % 1440;
}

/** "YYYY-MM-DD" in Dhaka. */
export function dhakaDateKeyOf(date: Date): string {
  return new Date(date.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

/** The trade route's session clock, 10:00–14:15 Dhaka (lib/utils/marketHours.ts). */
export function inSessionClock(now: Date = new Date()): boolean {
  const m = dhakaMinuteOfDay(now);
  return m >= 600 && m < 855;
}

/** The calendar's guess: a weekday (or special working Saturday) that isn't a listed holiday. */
export function calendarTradingDay(now: Date = new Date()): boolean {
  const key = dhakaDateKeyOf(now);
  const weekday = new Date(now.getTime() + DHAKA_OFFSET_MS).getUTCDay();
  if ((weekday === 5 || weekday === 6) && !isSpecialWorkingDay(key)) return false;
  return !getHolidayDetails(Number(key.slice(0, 4))).some((h) => h.date === key);
}

/** Market data written today (Dhaka): DSE is or was live today, whatever the calendar says. */
export function dataIsFromToday(lastUpdated: string | undefined, now: Date = new Date()): boolean {
  if (!lastUpdated) return false;
  const t = Date.parse(lastUpdated);
  return Number.isFinite(t) && dhakaDateKeyOf(new Date(t)) === dhakaDateKeyOf(now);
}

/**
 * Seconds until the next market-data fetch. `lastUpdated` is the newest data
 * the page holds. Without the live snapshot every fetch is a Firestore read,
 * so it stays at 3 minutes.
 */
export function pollIntervalSecs(
  snapshotEnabled: boolean,
  lastUpdated?: string,
  now: Date = new Date()
): number {
  if (!snapshotEnabled) return SLOW_POLL_SECS;
  const m = dhakaMinuteOfDay(now);
  if (m < POLL_WINDOW_START || m >= POLL_WINDOW_END) return SLOW_POLL_SECS;
  if (dataIsFromToday(lastUpdated, now)) return FAST_POLL_SECS;
  return calendarTradingDay(now) && m < NO_DATA_GRACE_END ? FAST_POLL_SECS : SLOW_POLL_SECS;
}

/** Minimum gap between Firestore reads while the snapshot is stale. */
export function staleFallbackIntervalMs(lastUpdated?: string, now: Date = new Date()): number {
  return dataIsFromToday(lastUpdated, now) || calendarTradingDay(now)
    ? STALE_FALLBACK_TRADING_MS
    : STALE_FALLBACK_CLOSED_MS;
}
