    /**
 * Bangladesh Stock Exchange Holiday Service
 * Provides official public holidays for Bangladesh
 * 
 * Primary Source: Google Calendar API (via /api/holidays endpoint)
 * Fallback: Local comprehensive dataset for offline/error scenarios
 */

export interface Holiday {
  date: string; // YYYY-MM-DD format
  name: string;
  localName: string;
  type: 'national' | 'islamic' | 'religious';
}

export interface HolidayAPIResponse {
  success: boolean;
  year: number;
  source: string;
  holidays: Array<{ date: string; name: string; type: string; source: string }>;
  count: number;
}

// Cache for holidays (with TTL tracking)
const holidayCache: Map<number, { dates: string[]; timestamp: number }> = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Comprehensive Bangladesh Public Holidays
 * Sources: Bangladesh Government, DSE Trading Calendar
 *
 * ⚠️ THIS LIST CAN TAKE TRADING DOWN. Read before editing.
 *
 * These dates are not merely informational. lib/utils/marketHours.ts's
 * isMarketOpenServer() — the authoritative gate in the trade API — treats
 * this dataset as the single source of truth, with no network dependency
 * and no cross-check against whether DSE is actually trading. A date that
 * is wrong in the "extra holiday" direction silently blocks EVERY order for
 * that entire session.
 *
 * That is not hypothetical: 2026-08-25 was entered as Eid-e-Milad-un-Nabi
 * by projecting "last year minus ~11 days" off 2025-09-05. DSE traded
 * normally that day (384 of 395 symbols with executed trades, ~50k trades
 * on its live board) while this app rejected every order with "Market is
 * closed". The real date was 2026-08-26. Two more entries — Ashura and
 * Durga Puja — were found misdated onto trading days in the same audit.
 *
 * Rules for editing:
 *  - NEVER add a projected/estimated date for a lunar (islamic) holiday.
 *    They are fixed by moon sighting and confirmed only shortly beforehand.
 *  - Only add a date you can source from DSE's own published trading
 *    calendar or the government gazette.
 *  - A missing holiday is a much cheaper mistake than a wrong extra one:
 *    it lets people trade on a stale board, rather than taking the core
 *    feature offline for a day.
 *
 * Note also that the CLIENT reaches these dates through /api/holidays,
 * which prefers the Google Calendar API and only falls back to this file —
 * so the client and the server can disagree. When they do, the user sees an
 * enabled Buy button that fails on submit with "Market is closed", which is
 * exactly how the 2026-08-25 outage surfaced.
 */
const BD_HOLIDAYS: Record<number, Holiday[]> = {
  2024: [
    { date: '2024-02-21', name: 'Language Martyrs Day', localName: 'শহীদ দিবস', type: 'national' },
    { date: '2024-03-17', name: 'Sheikh Mujibur Rahman Birthday', localName: 'জাতির পিতার জন্মদিন', type: 'national' },
    { date: '2024-03-26', name: 'Independence Day', localName: 'স্বাধীনতা দিবস', type: 'national' },
    { date: '2024-04-10', name: 'Eid ul-Fitr', localName: 'ঈদুল ফিতর', type: 'islamic' },
    { date: '2024-04-11', name: 'Eid ul-Fitr Holiday', localName: 'ঈদুল ফিতর ছুটি', type: 'islamic' },
    { date: '2024-04-14', name: 'Bengali New Year', localName: 'পহেলা বৈশাখ', type: 'national' },
    { date: '2024-05-01', name: 'May Day', localName: 'মে দিবস', type: 'national' },
    { date: '2024-05-23', name: 'Buddha Purnima', localName: 'বুদ্ধ পূর্ণিমা', type: 'religious' },
    { date: '2024-06-17', name: 'Eid ul-Adha', localName: 'ঈদুল আযহা', type: 'islamic' },
    { date: '2024-06-18', name: 'Eid ul-Adha Holiday', localName: 'ঈদুল আযহা ছুটি', type: 'islamic' },
    { date: '2024-07-17', name: 'Ashura', localName: 'আশুরা', type: 'islamic' },
    { date: '2024-08-15', name: 'National Mourning Day', localName: 'জাতীয় শোক দিবস', type: 'national' },
    { date: '2024-08-26', name: 'Janmashtami', localName: 'জন্মাষ্টমী', type: 'religious' },
    { date: '2024-09-16', name: 'Eid-e-Milad-un-Nabi', localName: 'ঈদে মিলাদুন্নবী', type: 'islamic' },
    { date: '2024-10-12', name: 'Durga Puja', localName: 'দুর্গাপূজা', type: 'religious' },
    { date: '2024-12-16', name: 'Victory Day', localName: 'বিজয় দিবস', type: 'national' },
    { date: '2024-12-25', name: 'Christmas', localName: 'বড়দিন', type: 'religious' },
  ],
  2025: [
    { date: '2025-02-21', name: 'Language Martyrs Day', localName: 'শহীদ দিবস', type: 'national' },
    { date: '2025-03-17', name: 'Sheikh Mujibur Rahman Birthday', localName: 'জাতির পিতার জন্মদিন', type: 'national' },
    { date: '2025-03-26', name: 'Independence Day', localName: 'স্বাধীনতা দিবস', type: 'national' },
    { date: '2025-03-30', name: 'Eid ul-Fitr', localName: 'ঈদুল ফিতর', type: 'islamic' },
    { date: '2025-03-31', name: 'Eid ul-Fitr Holiday', localName: 'ঈদুল ফিতর ছুটি', type: 'islamic' },
    { date: '2025-04-14', name: 'Bengali New Year', localName: 'পহেলা বৈশাখ', type: 'national' },
    { date: '2025-05-01', name: 'May Day', localName: 'মে দিবস', type: 'national' },
    { date: '2025-05-12', name: 'Buddha Purnima', localName: 'বুদ্ধ পূর্ণিমা', type: 'religious' },
    { date: '2025-06-07', name: 'Eid ul-Adha', localName: 'ঈদুল আযহা', type: 'islamic' },
    { date: '2025-06-08', name: 'Eid ul-Adha Holiday', localName: 'ঈদুল আযহা ছুটি', type: 'islamic' },
    { date: '2025-07-06', name: 'Ashura', localName: 'আশুরা', type: 'islamic' },
    { date: '2025-08-15', name: 'National Mourning Day', localName: 'জাতীয় শোক দিবস', type: 'national' },
    { date: '2025-08-16', name: 'Janmashtami', localName: 'জন্মাষ্টমী', type: 'religious' },
    { date: '2025-09-05', name: 'Eid-e-Milad-un-Nabi', localName: 'ঈদে মিলাদুন্নবী', type: 'islamic' },
    { date: '2025-10-01', name: 'Durga Puja', localName: 'দুর্গাপূজা', type: 'religious' },
    { date: '2025-12-16', name: 'Victory Day', localName: 'বিজয় দিবস', type: 'national' },
    { date: '2025-12-25', name: 'Christmas', localName: 'বড়দিন', type: 'religious' },
  ],
  2026: [
    { date: '2026-02-21', name: 'Language Martyrs Day', localName: 'শহীদ দিবস', type: 'national' },
    { date: '2026-03-17', name: 'Sheikh Mujibur Rahman Birthday', localName: 'জাতির পিতার জন্মদিন', type: 'national' },
    { date: '2026-03-20', name: 'Eid ul-Fitr', localName: 'ঈদুল ফিতর', type: 'islamic' },
    { date: '2026-03-21', name: 'Eid ul-Fitr Holiday', localName: 'ঈদুল ফিতর ছুটি', type: 'islamic' },
    { date: '2026-03-26', name: 'Independence Day', localName: 'স্বাধীনতা দিবস', type: 'national' },
    { date: '2026-04-14', name: 'Bengali New Year', localName: 'পহেলা বৈশাখ', type: 'national' },
    { date: '2026-05-01', name: 'May Day', localName: 'মে দিবস', type: 'national' },
    { date: '2026-05-31', name: 'Buddha Purnima', localName: 'বুদ্ধ পূর্ণিমা', type: 'religious' },
    { date: '2026-05-27', name: 'Eid ul-Adha', localName: 'ঈদুল আযহা', type: 'islamic' },
    { date: '2026-05-28', name: 'Eid ul-Adha Holiday', localName: 'ঈদুল আযহা ছুটি', type: 'islamic' },
    // Ashura was listed as 2026-06-25 (a Thursday, a trading day). The
    // authoritative calendar puts it on 2026-06-26 — a Friday, already a
    // weekend here. The wrong date would have blocked a full trading
    // session exactly like 2026-08-25 did; see the note at the top of this
    // file.
    { date: '2026-06-26', name: 'Ashura', localName: 'আশুরা', type: 'islamic' },
    { date: '2026-08-15', name: 'National Mourning Day', localName: 'জাতীয় শোক দিবস', type: 'national' },
    // Corrected from 2026-08-25, which was a mechanical "last year minus
    // ~11 days" projection off 2025-09-05. DSE traded normally on the 25th.
    { date: '2026-08-26', name: 'Eid-e-Milad-un-Nabi', localName: 'ঈদে মিলাদুন্নবী', type: 'islamic' },
    { date: '2026-09-04', name: 'Janmashtami', localName: 'জন্মাষ্টমী', type: 'religious' },
    // Durga Puja was listed as 2026-09-20 — a Sunday, which is a normal DSE
    // trading day — and is actually a month later. Another blocked-session
    // waiting to happen.
    { date: '2026-10-20', name: 'Mahanabami (Durga Puja)', localName: 'মহানবমী', type: 'religious' },
    { date: '2026-10-21', name: 'Durga Puja (Bijoya Dashami)', localName: 'দুর্গাপূজা (বিজয়া দশমী)', type: 'religious' },
    { date: '2026-10-22', name: 'Durga Puja Holiday', localName: 'দুর্গাপূজা ছুটি', type: 'religious' },
    { date: '2026-12-16', name: 'Victory Day', localName: 'বিজয় দিবস', type: 'national' },
    { date: '2026-12-25', name: 'Christmas', localName: 'বড়দিন', type: 'religious' },
  ],
  2027: [
    { date: '2027-02-21', name: 'Language Martyrs Day', localName: 'শহীদ দিবস', type: 'national' },
    { date: '2027-03-09', name: 'Eid ul-Fitr', localName: 'ঈদুল ফিতর', type: 'islamic' },
    { date: '2027-03-10', name: 'Eid ul-Fitr Holiday', localName: 'ঈদুল ফিতর ছুটি', type: 'islamic' },
    { date: '2027-03-17', name: 'Sheikh Mujibur Rahman Birthday', localName: 'জাতির পিতার জন্মদিন', type: 'national' },
    { date: '2027-03-26', name: 'Independence Day', localName: 'স্বাধীনতা দিবস', type: 'national' },
    { date: '2027-04-14', name: 'Bengali New Year', localName: 'পহেলা বৈশাখ', type: 'national' },
    { date: '2027-05-01', name: 'May Day', localName: 'মে দিবস', type: 'national' },
    { date: '2027-05-16', name: 'Eid ul-Adha', localName: 'ঈদুল আযহা', type: 'islamic' },
    { date: '2027-05-17', name: 'Eid ul-Adha Holiday', localName: 'ঈদুল আযহা ছুটি', type: 'islamic' },
    { date: '2027-05-20', name: 'Buddha Purnima', localName: 'বুদ্ধ পূর্ণিমা', type: 'religious' },
    { date: '2027-06-15', name: 'Ashura', localName: 'আশুরা', type: 'islamic' },
    { date: '2027-08-14', name: 'Eid-e-Milad-un-Nabi', localName: 'ঈদে মিলাদুন্নবী', type: 'islamic' },
    { date: '2027-08-15', name: 'National Mourning Day', localName: 'জাতীয় শোক দিবস', type: 'national' },
    { date: '2027-08-25', name: 'Janmashtami', localName: 'জন্মাষ্টমী', type: 'religious' },
    { date: '2027-10-09', name: 'Durga Puja', localName: 'দুর্গাপূজা', type: 'religious' },
    { date: '2027-12-16', name: 'Victory Day', localName: 'বিজয় দিবস', type: 'national' },
    { date: '2027-12-25', name: 'Christmas', localName: 'বড়দিন', type: 'religious' },
  ],
};

/**
 * Get Bangladesh public holidays for a specific year
 * Fetches from /api/holidays which uses Google Calendar API
 * Falls back to local dataset if API fails
 * @param year - The year to fetch holidays for
 */
export async function getBangladeshHolidays(year: number): Promise<string[]> {
  // Check cache first (with TTL validation)
  const cached = holidayCache.get(year);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📅 Using cached holidays for BD ${year} (${cached.dates.length} dates)`);
    return cached.dates;
  }

  try {
    // Fetch from API endpoint (which uses Google Calendar API)
    const response = await fetch(`/api/holidays?year=${year}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data: HolidayAPIResponse = await response.json();

    if (data.success && data.holidays) {
      const dates = data.holidays.map((h) => h.date).sort();
      
      // Cache the results with timestamp
      holidayCache.set(year, { dates, timestamp: Date.now() });
      
      console.log(`🌐 Loaded ${dates.length} holidays for BD ${year} from ${data.source}`);
      return dates;
    }
    
    throw new Error('Invalid API response');
  } catch (error) {
    console.warn(`⚠️ Failed to fetch holidays from API for ${year}:`, error);
    
    // Fallback to local dataset
    const holidays = BD_HOLIDAYS[year] || [];
    const dates = holidays.map((h) => h.date).sort();
    
    // Cache the fallback results (shorter TTL)
    holidayCache.set(year, { dates, timestamp: Date.now() - (CACHE_TTL / 2) });
    
    console.log(`📅 Using local fallback: ${dates.length} holidays for BD ${year}`);
    return dates;
  }
}

/**
 * Get full holiday details for a specific year
 */
export function getHolidayDetails(year: number): Holiday[] {
  return BD_HOLIDAYS[year] || [];
}

/**
 * Get holidays for current year
 */
export async function getCurrentYearHolidays(): Promise<string[]> {
  const now = new Date();
  const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  return getBangladeshHolidays(bdTime.getFullYear());
}

/**
 * Get holidays for current and next year
 */
export async function getUpcomingHolidays(): Promise<string[]> {
  const now = new Date();
  const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  const currentYear = bdTime.getFullYear();
  
  const current = await getBangladeshHolidays(currentYear);
  const next = await getBangladeshHolidays(currentYear + 1);
  
  return [...current, ...next];
}

/**
 * Special Government & DSE Working Days (Make-up Saturdays)
 * When the Bangladesh Government declares an extended executive-order holiday
 * (e.g., around Eid or Durga Puja), specific Saturdays are designated as
 * official working days where banks and the Dhaka Stock Exchange conduct
 * full normal trading sessions (10:00 AM - 2:15 PM BST).
 */
export const BD_SPECIAL_WORKING_DAYS: Record<string, string> = {
  '2026-10-17': 'Special Working Saturday (Durga Puja Make-up Session)',
};

export function isSpecialWorkingDay(dateStr: string): boolean {
  return Boolean(BD_SPECIAL_WORKING_DAYS[dateStr]);
}

/**
 * Check if a specific date is a holiday
 */
export function isHoliday(dateStr: string, holidays: string[]): boolean {
  return holidays.includes(dateStr);
}
