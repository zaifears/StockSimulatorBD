// lib/utils/marketSchedule.ts
// Calculates the authoritative next DSE market opening session and
// generates calendar invitations and alarms (Google Calendar URL, Apple Calendar .ics).

import { getHolidayDetails } from '@/lib/bangladeshHolidays';
import { SITE_URL } from '@/lib/siteUrl';

export interface NextMarketSession {
  /** UTC timestamp when trading next opens */
  nextOpenUtc: Date;
  /** UTC timestamp when that trading session closes */
  nextCloseUtc: Date;
  /** Human-readable Dhaka time, e.g. "Sunday, Sep 27 at 10:00 AM" */
  nextOpenDhakaFormatted: string;
  /** Relative time remaining, e.g. "in 13h 45m" or "in 25m" */
  relativeTimeFormatted: string;
  /** Whether the next session is today */
  isToday: boolean;
  /** Target date in YYYY-MM-DD format (Dhaka local) */
  targetDateStr: string;
  /** Day of week name (e.g. "Sunday") */
  dayName: string;
}

/**
 * Calculates the exact upcoming DSE market session opening time.
 * Handles:
 * - Current trading day before 10:00 AM Dhaka (opens today at 10:00 AM)
 * - Current trading day during trading hours (next open is tomorrow 10:00 AM or next valid day)
 * - Current trading day after 14:15 Dhaka (next open is tomorrow or next valid day)
 * - Weekends: Friday & Saturday (next open is Sunday at 10:00 AM)
 * - Public and Islamic holidays (skips forward until a valid trading day is found)
 *
 * @param now Current timestamp (defaults to current system time)
 * @param holidays Optional list of holiday date strings (YYYY-MM-DD). If omitted, falls back to BD_HOLIDAYS.
 */
export function getNextMarketOpen(now: Date = new Date(), holidays: string[] = []): NextMarketSession {
  // Convert current time to Dhaka wall-clock components (UTC+6, fixed offset, no DST)
  const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const curYear = bdTime.getUTCFullYear();
  const curMonth = bdTime.getUTCMonth();
  const curDate = bdTime.getUTCDate();
  const curHour = bdTime.getUTCHours();
  const curMin = bdTime.getUTCMinutes();
  const dayOfWeek = bdTime.getUTCDay(); // 0 = Sunday, ..., 4 = Thursday, 5 = Friday, 6 = Saturday

  // Build a set of all holidays for the current and subsequent year
  const holidaySet = new Set(
    holidays.length > 0
      ? holidays
      : [...getHolidayDetails(curYear), ...getHolidayDetails(curYear + 1)].map((h) => h.date)
  );

  const todayStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(curDate).padStart(2, '0')}`;
  const isTradingDay = dayOfWeek !== 5 && dayOfWeek !== 6;
  const isHolidayToday = holidaySet.has(todayStr);

  // Market session is 10:00 to 14:15 Dhaka time (04:00 to 08:15 UTC)
  const beforeOpening = curHour < 10;

  let targetYear = curYear;
  let targetMonth = curMonth;
  let targetDate = curDate;

  if (isTradingDay && !isHolidayToday && beforeOpening) {
    // Market opens today at 10:00 AM Dhaka (04:00 UTC)
    targetYear = curYear;
    targetMonth = curMonth;
    targetDate = curDate;
  } else {
    // Start scanning from tomorrow
    let candidate = new Date(Date.UTC(curYear, curMonth, curDate + 1, 4, 0, 0));
    // Safe bound: scan up to 30 days ahead (e.g. extended Eid holidays)
    for (let i = 0; i < 30; i++) {
      const candBd = new Date(candidate.getTime() + 6 * 60 * 60 * 1000);
      const candDay = candBd.getUTCDay();
      const candYear = candBd.getUTCFullYear();
      const candMonth = candBd.getUTCMonth();
      const candDate = candBd.getUTCDate();
      const candDateStr = `${candYear}-${String(candMonth + 1).padStart(2, '0')}-${String(candDate).padStart(2, '0')}`;

      const isWeekend = candDay === 5 || candDay === 6;
      const isHoliday = holidaySet.has(candDateStr);

      if (!isWeekend && !isHoliday) {
        targetYear = candYear;
        targetMonth = candMonth;
        targetDate = candDate;
        break;
      }
      candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  // 10:00 AM Dhaka is 04:00:00 UTC
  const nextOpenUtc = new Date(Date.UTC(targetYear, targetMonth, targetDate, 4, 0, 0));
  // 14:15 PM Dhaka is 08:15:00 UTC (session length = 4 hours 15 minutes)
  const nextCloseUtc = new Date(Date.UTC(targetYear, targetMonth, targetDate, 8, 15, 0));

  const diffMs = Math.max(0, nextOpenUtc.getTime() - now.getTime());
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let relativeTimeFormatted = '';
  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;
    relativeTimeFormatted = remHours > 0 ? `in ${days}d ${remHours}h` : `in ${days}d`;
  } else if (diffHours > 0) {
    relativeTimeFormatted = diffMinutes > 0 ? `in ${diffHours}h ${diffMinutes}m` : `in ${diffHours}h`;
  } else {
    relativeTimeFormatted = `in ${Math.max(1, diffMinutes)}m`;
  }

  const targetDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDate).padStart(2, '0')}`;
  const isToday = targetDateStr === todayStr;

  // Format Dhaka date label
  const targetBdTime = new Date(nextOpenUtc.getTime() + 6 * 60 * 60 * 1000);
  const dayName = targetBdTime.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const monthName = targetBdTime.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const dayOfMonth = targetBdTime.getUTCDate();

  const nextOpenDhakaFormatted = isToday
    ? `Today at 10:00 AM`
    : `${dayName}, ${monthName} ${dayOfMonth} at 10:00 AM`;

  return {
    nextOpenUtc,
    nextCloseUtc,
    nextOpenDhakaFormatted,
    relativeTimeFormatted,
    isToday,
    targetDateStr,
    dayName,
  };
}

/**
 * Helper to format a Date into an iCalendar / Google UTC string: YYYYMMDDTHHmmssZ
 */
export function formatUtcToCalendarStr(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export interface CalendarEventOptions {
  nextOpenUtc: Date;
  nextCloseUtc?: Date;
  leadMinutes?: number; // 0 for at open, 15 for 15 min before
  isRecurring?: boolean;
}

/**
 * Generates a direct Google Calendar web link.
 * Matches requested copy:
 * Title: "Time to use the Stock Simulator! ⏰"
 * Details: "Time to use the Stock Simulator! ⏰ Click here -> https://stocksimulator.tech\n\nDhaka Stock Exchange trading is now open. Jump into your paper trading terminal to buy and sell stocks risk-free."
 */
export function createGoogleCalendarUrl(options: CalendarEventOptions): string {
  const { nextOpenUtc, nextCloseUtc } = options;
  const endUtc = nextCloseUtc || new Date(nextOpenUtc.getTime() + (4 * 60 + 15) * 60 * 1000);

  const startStr = formatUtcToCalendarStr(nextOpenUtc);
  const endStr = formatUtcToCalendarStr(endUtc);

  const title = encodeURIComponent('Time to use the Stock Simulator! ⏰');
  const details = encodeURIComponent(
    `Time to use the Stock Simulator! ⏰ Click here -> ${SITE_URL}\n\nDhaka Stock Exchange (DSE) trading is now open. Jump into your terminal to buy and sell stocks risk-free.`
  );
  const location = encodeURIComponent(`${SITE_URL}/trade`);

  let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;

  if (options.isRecurring) {
    // RRULE for Sunday through Thursday weekly recurrence
    url += `&recur=${encodeURIComponent('RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH')}`;
  }

  return url;
}

/**
 * Generates an RFC 5545 iCalendar (.ics) string containing native sound/popup alarms (`VALARM`).
 * Works natively on Apple Calendar (iOS / macOS), Microsoft Outlook, and Google Calendar import.
 */
export function generateIcsContent(options: CalendarEventOptions): string {
  const { nextOpenUtc, nextCloseUtc, leadMinutes = 15, isRecurring = false } = options;
  const endUtc = nextCloseUtc || new Date(nextOpenUtc.getTime() + (4 * 60 + 15) * 60 * 1000);

  const startStr = formatUtcToCalendarStr(nextOpenUtc);
  const endStr = formatUtcToCalendarStr(endUtc);
  const stampStr = formatUtcToCalendarStr(new Date());
  const uid = `dse-market-open-${startStr}@${SITE_URL.replace(/^https?:\/\//, '')}`;

  const notificationMessage = `Time to use the Stock Simulator! ⏰ Click here -> ${SITE_URL}`;

  // Build VALARM components based on chosen lead time
  const alarms: string[] = [];

  if (leadMinutes > 0) {
    alarms.push(
      'BEGIN:VALARM',
      `TRIGGER:-PT${leadMinutes}M`,
      'ACTION:DISPLAY',
      `DESCRIPTION:${notificationMessage}`,
      'END:VALARM'
    );
  }

  // Always include an alarm right at opening
  alarms.push(
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${notificationMessage}`,
    'END:VALARM'
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StockSimulatorBD//DSE Market Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stampStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    ...(isRecurring ? ['RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH'] : []),
    'SUMMARY:Time to use the Stock Simulator! ⏰',
    `DESCRIPTION:${notificationMessage}\\n\\nDhaka Stock Exchange (DSE) trading is now open. Manage your portfolio and execute orders risk-free.`,
    `LOCATION:${SITE_URL}/trade`,
    'STATUS:CONFIRMED',
    ...alarms,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/**
 * Prompts download of an .ics file in the browser.
 */
export function downloadIcsFile(content: string, filename: string = 'dse-market-reminder.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
