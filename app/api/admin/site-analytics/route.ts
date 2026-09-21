// app/api/admin/site-analytics/route.ts
// Admin-only read of the site-wide analytics rollups written by
// app/api/analytics/track/route.ts, plus registration and coin-leaderboard
// numbers pulled straight from the existing `users` collection (no new
// tracking needed for those — the data already exists).

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import {
  getDhakaDateKey,
  getLastNDhakaDateKeys,
  dhakaDateKeyToUtcMidnightISO,
  isoToDhakaDateKey,
} from '@/lib/utils/dhakaTime';
import { getAllUserBalances } from '@/lib/utils/simulatorBalances';
import { BD_GEO_BUCKETS } from '@/lib/utils/geoBucket';

// Ensure Firebase Admin is initialized with full credentials (side effect of import).
import '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TREND_DAYS = 30;
// How far back an account must have been created before it's eligible to be
// flagged "least active" — a brand-new signup with zero visits isn't
// disengaged, they just haven't had a chance to come back yet.
const MIN_ACCOUNT_AGE_DAYS_FOR_INACTIVE_LIST = 3;
const TOP_PAGES_LIMIT = 8;
const TOP_STOCKS_LIMIT = 8;
// Safety cap on the trade_history collection-group scan — keeps this endpoint
// cheap even on a busy day. Ordered newest-first, so a truncation only ever
// drops the *older* end of the 30-day window, not today's activity.
const TRADE_FETCH_CAP = 3000;
// Broader page-view scan so all blog and stock-page leaderboards are accurately sliced
// without starving blog posts with fewer views than the 60th stock page.
const PAGES_SCAN_LIMIT = 1000;
// "Currently online" window — a session pinging within this window (and not
// yet ended) counts as live. Matches the ~25s heartbeat interval with room
// for one missed beat.
const ACTIVE_NOW_WINDOW_MS = 5 * 60 * 1000;
const RECHARGE_FETCH_CAP = 20_000;
// A single account this far above what normal recharge + trading activity
// could plausibly produce gets flagged for manual review. Well under
// app/api/simulator/trade's SANE_BALANCE_CAP (100M) — this is an early
// warning line, not the hard ceiling. See §6 of the balance-tampering
// incident this dashboard's watchlist exists because of.
const BALANCE_INTEGRITY_THRESHOLD = 10_000_000;
const BALANCE_INTEGRITY_WATCHLIST_LIMIT = 10;
// Capped scan for the retention cohort calculation — admin-only, on-demand,
// so a bounded full collection scan is acceptable (same pattern as
// getAllUserBalances / the user-list export route).
const RETENTION_USER_SCAN_CAP = 20_000;
const DAY_MS = 86400000;
// Firebase Auth listUsers() pages at 1000; cap the walk so this endpoint
// stays bounded as the user base grows (reports `truncated` if it stops early).
const AUTH_LIST_MAX_PAGES = 20;
const ACCOUNT_INTEGRITY_LIST_LIMIT = 25;

// ── Server-side in-memory cache (5-minute TTL) ───────────────────────────
// Protects the admin's daily Firestore read quota when refreshing the dashboard.
// Bypassed when the client explicitly passes ?fresh=true (e.g. manual refresh button).
interface CachedAnalytics {
  timestamp: number;
  data: any;
}
let memoryCache: CachedAnalytics | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const SOURCE_BUCKETS = ['direct', 'internal', 'search_google', 'search_other', 'social', 'other'] as const;

function toMillis(value: any): number {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

function toIso(value: any): string | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function displayName(data: any): string {
  return data?.name || data?.displayName || (data?.email ? String(data.email).split('@')[0] : 'Unknown');
}

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ success: false, error: adminCheck.error }, { status: 401 });
    }

    const fresh = req.nextUrl.searchParams.get('fresh') === 'true';
    if (!fresh && memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(
        {
          success: true,
          cached: true,
          cachedAt: new Date(memoryCache.timestamp).toISOString(),
          ...memoryCache.data,
        },
        {
          headers: {
            'Cache-Control': 'private, max-age=60',
          },
        }
      );
    }

    const db = getFirestore();

    const todayKey = getDhakaDateKey(0);
    const trendKeys = getLastNDhakaDateKeys(TREND_DAYS); // oldest → newest, includes today
    const last7Keys = trendKeys.slice(-7);

    // ── Daily rollups (cheap: at most 30 single-doc reads) ──────────────
    const dailySnaps = await Promise.all(
      trendKeys.map((key) => db.collection('analytics_daily').doc(key).get())
    );
    const dailyByKey = new Map<string, any>();
    dailySnaps.forEach((snap, i) => {
      dailyByKey.set(trendKeys[i], snap.exists ? snap.data() : null);
    });

    const sumField = (keys: string[], field: string): number =>
      keys.reduce((sum, key) => sum + (dailyByKey.get(key)?.[field] || 0), 0);

    const visitorsToday = dailyByKey.get(todayKey)?.totalSessions || 0;
    const visitorsLast7 = sumField(last7Keys, 'totalSessions');
    const visitorsLast30 = sumField(trendKeys, 'totalSessions');

    // Educational-use disclaimer agreements (see app/api/disclaimer/agree,
    // components/app/DisclaimerGate.tsx) — one per account, ever, so this is
    // "how many first-time agreements happened on day X", not active users.
    const disclaimerAgreedToday = dailyByKey.get(todayKey)?.disclaimerAgreedCount || 0;
    const disclaimerAgreedLast7 = sumField(last7Keys, 'disclaimerAgreedCount');
    const disclaimerAgreedLast30 = sumField(trendKeys, 'disclaimerAgreedCount');

    const avgSeconds = (keys: string[]): number => {
      const totalSeconds = sumField(keys, 'totalActiveSeconds');
      const completed = sumField(keys, 'completedSessions');
      return completed > 0 ? Math.round(totalSeconds / completed) : 0;
    };

    const deviceBreakdown = {
      mobile: sumField(trendKeys, 'device_mobile'),
      tablet: sumField(trendKeys, 'device_tablet'),
      desktop: sumField(trendKeys, 'device_desktop'),
      unknown: sumField(trendKeys, 'device_unknown'),
    };

    // ── Location breakdown (last 30 days) — Vercel's IP-geolocation headers,
    // bucketed by app/api/analytics/track into a fixed set of BD divisional
    // cities plus other/outside/unknown catch-alls. See lib/utils/geoBucket.ts.
    const geoBreakdown = Object.fromEntries(
      BD_GEO_BUCKETS.map(({ key }) => [key, sumField(trendKeys, `geo_${key}`)])
    ) as Record<(typeof BD_GEO_BUCKETS)[number]['key'], number>;

    const dailyTrend = trendKeys.map((key) => {
      const d = dailyByKey.get(key);
      const sessions = d?.totalSessions || 0;
      const completed = d?.completedSessions || 0;
      const totalSeconds = d?.totalActiveSeconds || 0;
      return {
        dateKey: key,
        sessions,
        avgSeconds: completed > 0 ? Math.round(totalSeconds / completed) : 0,
      };
    });

    // ── Traffic sources (last 30 days) ───────────────────────────────────
    const trafficSources = Object.fromEntries(
      SOURCE_BUCKETS.map((bucket) => [bucket, sumField(trendKeys, `source_${bucket}`)])
    ) as Record<(typeof SOURCE_BUCKETS)[number], number>;

    // ── New vs returning visitor sessions (last 30 days) ─────────────────
    const newVsReturning = {
      new: sumField(trendKeys, 'newVisitorSessions'),
      returning: sumField(trendKeys, 'returningVisitorSessions'),
    };

    // ── Bounce rate (last 7 days — recent enough to be actionable) ───────
    const bounceSessions = sumField(last7Keys, 'bounces');
    const bounceEligibleSessions = sumField(last7Keys, 'completedSessions');
    const bounceRate = bounceEligibleSessions > 0 ? Math.round((bounceSessions / bounceEligibleSessions) * 100) : 0;

    // ── Peak activity hours, Dhaka local time (last 7 days & 30 days) ──────────────
    const peakHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      sessions: sumField(last7Keys, `hour_${hour}`),
    }));

    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
      const sessions30d = sumField(trendKeys, `hour_${hour}`);
      const sessions7d = sumField(last7Keys, `hour_${hour}`);
      return {
        hour,
        hourLabel: `${String(hour).padStart(2, '0')}:00`,
        sessions: sessions30d,
        sessions7d,
        // DSE regular continuous trading runs 10:00 AM to 2:30 PM (BST)
        isDseMarketHour: hour >= 10 && hour <= 14,
      };
    });

    // ── Day of week activity distribution (last 30 days) ─────────────────
    const DAYS_OF_WEEK = [
      { key: 0, label: 'Sunday', shortLabel: 'Sun', isDseTradingDay: true },
      { key: 1, label: 'Monday', shortLabel: 'Mon', isDseTradingDay: true },
      { key: 2, label: 'Tuesday', shortLabel: 'Tue', isDseTradingDay: true },
      { key: 3, label: 'Wednesday', shortLabel: 'Wed', isDseTradingDay: true },
      { key: 4, label: 'Thursday', shortLabel: 'Thu', isDseTradingDay: true },
      { key: 5, label: 'Friday', shortLabel: 'Fri', isDseTradingDay: false },
      { key: 6, label: 'Saturday', shortLabel: 'Sat', isDseTradingDay: false },
    ];
    const dayOfWeekSessions: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    trendKeys.forEach((key) => {
      const [y, m, d] = key.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const dayOfWeek = dateObj.getUTCDay();
      const s = dailyByKey.get(key)?.totalSessions || 0;
      dayOfWeekSessions[dayOfWeek] = (dayOfWeekSessions[dayOfWeek] || 0) + s;
    });
    const totalWeekDaySessions = Object.values(dayOfWeekSessions).reduce((a, b) => a + b, 0);
    const dayOfWeekActivity = DAYS_OF_WEEK.map((d) => {
      const sess = dayOfWeekSessions[d.key] || 0;
      const percentage = totalWeekDaySessions > 0 ? Math.round((sess / totalWeekDaySessions) * 100) : 0;
      return {
        dayIndex: d.key,
        day: d.label,
        shortDay: d.shortLabel,
        sessions: sess,
        percentage,
        isDseTradingDay: d.isDseTradingDay,
      };
    });

    // ── Monthly activity calendar (current month in Dhaka time) ──────────
    const [curYear, curMonth] = todayKey.split('-').map(Number);
    const daysInCurMonth = new Date(curYear, curMonth, 0).getDate();
    const firstDayOfMonthUtc = new Date(Date.UTC(curYear, curMonth - 1, 1, 12, 0, 0)).getUTCDay();

    let maxMonthSessions = 1;
    const monthDays = [];
    for (let day = 1; day <= daysInCurMonth; day++) {
      const dateStr = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayDoc = dailyByKey.get(dateStr);
      const sessions = dayDoc?.totalSessions || 0;
      if (sessions > maxMonthSessions) maxMonthSessions = sessions;
      const dayOfWeek = new Date(Date.UTC(curYear, curMonth - 1, day, 12, 0, 0)).getUTCDay();
      monthDays.push({
        dateKey: dateStr,
        day,
        dayOfWeek,
        sessions,
        avgSeconds: dayDoc ? (dayDoc.completedSessions ? Math.round((dayDoc.totalActiveSeconds || 0) / dayDoc.completedSessions) : 0) : 0,
        isDseTradingDay: dayOfWeek >= 0 && dayOfWeek <= 4,
        isToday: dateStr === todayKey,
      });
    }

    const monthlyCalendar = {
      year: curYear,
      month: curMonth,
      monthName: new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'Asia/Dhaka' }).format(new Date(curYear, curMonth - 1, 1)),
      firstDayOfWeek: firstDayOfMonthUtc,
      totalDays: daysInCurMonth,
      maxSessions: maxMonthSessions,
      days: monthDays.map((d) => ({
        ...d,
        intensity:
          d.sessions === 0
            ? 0
            : d.sessions >= maxMonthSessions * 0.75
            ? 4
            : d.sessions >= maxMonthSessions * 0.5
            ? 3
            : d.sessions >= maxMonthSessions * 0.25
            ? 2
            : 1,
      })),
    };

    // ── Top pages (all-time running counter) — normalized aggregation ─────
    // Normalizes case variations (e.g. /stocks/1JANATAMF vs /stocks/1janatamf)
    // and trailing slashes so popular stock pages and blog posts are never duplicated or fragmented.
    const topPagesSnap = await db.collection('analytics_pages').orderBy('views', 'desc').limit(PAGES_SCAN_LIMIT).get();

    const landingMap = new Map<string, number>();
    const stockMap = new Map<string, number>();
    const blogMap = new Map<string, number>();

    topPagesSnap.docs.forEach((doc) => {
      const data = doc.data();
      const rawPath: string = data.path || doc.id.replace(/^p_/, '/').replace(/_/g, '/');
      const views: number = data.views || 0;
      if (!rawPath || views <= 0) return;

      const cleaned = rawPath.split('?')[0].split('#')[0].trim();
      const noSlash = cleaned.length > 1 && cleaned.endsWith('/') ? cleaned.slice(0, -1) : cleaned;

      if (/^\/stocks\/[^\/]+$/i.test(noSlash)) {
        const symbol = noSlash.slice('/stocks/'.length).toUpperCase();
        stockMap.set(symbol, (stockMap.get(symbol) || 0) + views);
      } else if (/^\/blog\/[^\/]+$/i.test(noSlash)) {
        const slug = noSlash.slice('/blog/'.length).toLowerCase();
        blogMap.set(slug, (blogMap.get(slug) || 0) + views);
      } else {
        const pathKey = noSlash.toLowerCase();
        landingMap.set(pathKey, (landingMap.get(pathKey) || 0) + views);
      }
    });

    const topLandingPages = Array.from(landingMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_PAGES_LIMIT)
      .map(([path, views]) => ({ path, views }));

    const topBlogPosts = Array.from(blogMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_PAGES_LIMIT)
      .map(([slug, views]) => ({ path: `/blog/${slug}`, views }));

    const topStockPages = Array.from(stockMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_STOCKS_LIMIT)
      .map(([symbol, views]) => ({ path: `/stocks/${symbol}`, views }));

    // ── Registrations ────────────────────────────────────────────────────
    // Sourced from Firebase Auth, NOT from `users` documents.
    //
    // These used to be count() queries over `users.createdAt`, which
    // disagreed with the Firebase console in three separate ways:
    //   1. `users.createdAt` is written client-side at signup and can differ
    //      from the account's real Auth creation time.
    //   2. An Auth account whose `users` doc was never written is invisible
    //      (measured: 9 such accounts, 1 of them inside the last-7-day
    //      window — so "last 7 days" read 21 when Auth held 23).
    //   3. A `users` doc left behind by a deleted Auth account still counts.
    // On top of that, `createdAt` is stored as an ISO string on 464 docs but
    // as a Timestamp on 1 and is absent on 2 — and Firestore orders by type
    // before value, so a Timestamp-typed createdAt is silently EXCLUDED from
    // a `>=` string comparison rather than sorted late. That is a latent
    // undercount that grows the moment anything writes a Date there.
    //
    // Firebase Auth's creationTime is the actual source of truth for "an
    // account was created", so every registration figure now derives from
    // one Auth listing — which also means these numbers reconcile exactly
    // with what the Firebase console shows.
    //
    // Note: two Auth accounts sharing one email (a concurrent double-submit
    // signup) legitimately count as two accounts here, matching the console.
    // accountIntegrity.duplicateEmails surfaces those separately.
    const usersCol = db.collection('users');

    const authAccounts: Array<{ uid: string; email: string | null; providers: string[]; createdAtMs: number; createdAt: string }> = [];
    let authListError: string | null = null;
    let authListTruncated = false;
    try {
      let pageToken: string | undefined;
      let pages = 0;
      do {
        const res = await getAuth().listUsers(1000, pageToken);
        for (const u of res.users) {
          authAccounts.push({
            uid: u.uid,
            email: u.email ?? null,
            providers: u.providerData.map((p) => p.providerId),
            createdAtMs: Date.parse(u.metadata.creationTime) || 0,
            createdAt: u.metadata.creationTime,
          });
        }
        pageToken = res.pageToken;
        pages += 1;
      } while (pageToken && pages < AUTH_LIST_MAX_PAGES);
      authListTruncated = !!pageToken;
    } catch (err: any) {
      console.error('❌ Firebase Auth listing unavailable:', err);
      authListError = 'Could not read Firebase Auth — registration counts fell back to Firestore user documents, which drift from the real account count.';
    }

    const countAuthSince = (iso: string) => {
      const cutoff = Date.parse(iso);
      return authAccounts.filter((u) => u.createdAtMs >= cutoff).length;
    };

    // Firestore fallback, used only if the Auth listing failed outright.
    const [regTodayDocs, reg7Docs, reg30Docs, totalUsersCountSnap] = await Promise.all([
      usersCol.where('createdAt', '>=', dhakaDateKeyToUtcMidnightISO(todayKey)).count().get(),
      usersCol.where('createdAt', '>=', dhakaDateKeyToUtcMidnightISO(last7Keys[0])).count().get(),
      usersCol.where('createdAt', '>=', dhakaDateKeyToUtcMidnightISO(trendKeys[0])).count().get(),
      usersCol.count().get(),
    ]);
    const totalUserDocs = totalUsersCountSnap.data().count;

    const useAuth = !authListError && authAccounts.length > 0;
    const registrationsToday = useAuth ? countAuthSince(dhakaDateKeyToUtcMidnightISO(todayKey)) : regTodayDocs.data().count;
    const registrations7 = useAuth ? countAuthSince(dhakaDateKeyToUtcMidnightISO(last7Keys[0])) : reg7Docs.data().count;
    const registrations30 = useAuth ? countAuthSince(dhakaDateKeyToUtcMidnightISO(trendKeys[0])) : reg30Docs.data().count;
    const totalRegisteredUsers = useAuth ? authAccounts.length : totalUserDocs;

    // ── Live right now — sessions that pinged within the last 5 minutes and
    // haven't ended, deduped by identity (uid, else the session itself for
    // guests) so two tabs from one visitor count once. Single-field range
    // query only (endedAt filtered in JS) so this never needs a new
    // composite index.
    const activeSinceCutoff = new Date(Date.now() - ACTIVE_NOW_WINDOW_MS);
    const activeSessionsSnap = await db
      .collection('analytics_sessions')
      .where('lastPingAt', '>=', activeSinceCutoff)
      .limit(2000)
      .get();
    const activeIdentities = new Set<string>();
    for (const doc of activeSessionsSnap.docs) {
      const data = doc.data();
      if (data.endedAt) continue;
      activeIdentities.add(data.uid || doc.id);
    }
    const activeRightNow = activeIdentities.size;

    // ── Coin leaderboard — the real trading balance, not users.coins ────
    // (see lib/utils/simulatorBalances.ts for why). Fetching every balance
    // here also lets total-circulation and the top-10 leaderboard share one
    // consistent snapshot instead of two separate reads that could disagree.
    const { balances: allBalances, truncated: balancesTruncated } = await getAllUserBalances(db);
    const totalCoinsInCirculation = allBalances.reduce((sum, b) => sum + b.balance, 0);
    const topBalances = [...allBalances].sort((a, b) => b.balance - a.balance).slice(0, 10);
    const topCoinUserDocs = await Promise.all(topBalances.map((b) => usersCol.doc(b.uid).get()));
    const topCoinHolders = topBalances.map((b, i) => {
      const snap = topCoinUserDocs[i];
      const data = snap.exists ? snap.data() : null;
      return {
        uid: b.uid,
        name: data ? displayName(data) : 'Unknown',
        email: data?.email || null,
        coins: b.balance,
      };
    });

    // ── Balance integrity watchlist — flags accounts sitting on a balance no
    // normal amount of recharging + trading would plausibly produce, the
    // same shape of problem that prompted app/api/simulator/trade's
    // SANE_BALANCE_CAP. This dashboard can't tell tampering from a
    // legitimately huge winning streak, so it surfaces candidates for a
    // human to check (e.g. via /admin/users/top-coin-holders) rather than
    // taking any action itself.
    const flaggedBalances = allBalances
      .filter((b) => b.balance >= BALANCE_INTEGRITY_THRESHOLD)
      .sort((a, b) => b.balance - a.balance);
    const flaggedTopSlice = flaggedBalances.slice(0, BALANCE_INTEGRITY_WATCHLIST_LIMIT);
    const flaggedUserDocs = await Promise.all(flaggedTopSlice.map((b) => usersCol.doc(b.uid).get()));
    const balanceIntegrity = {
      threshold: BALANCE_INTEGRITY_THRESHOLD,
      flaggedCount: flaggedBalances.length,
      watchlist: flaggedTopSlice.map((b, i) => {
        const snap = flaggedUserDocs[i];
        const data = snap.exists ? snap.data() : null;
        return {
          uid: b.uid,
          name: data ? displayName(data) : 'Unknown',
          email: data?.email || null,
          coins: b.balance,
        };
      }),
    };

    // ── Most active registered users (Calculated based on 1 week's session data) ──
    const weekCutoff = new Date(Date.now() - 7 * DAY_MS);
    const weekSessionsSnap = await db
      .collection('analytics_sessions')
      .where('startedAt', '>=', weekCutoff)
      .limit(3000)
      .get();

    const userWeekMap = new Map<string, { sessions: number; activeSeconds: number; lastPingMs: number }>();
    for (const doc of weekSessionsSnap.docs) {
      const s = doc.data();
      if (!s.uid) continue;
      const existing = userWeekMap.get(s.uid) || { sessions: 0, activeSeconds: 0, lastPingMs: 0 };
      existing.sessions += 1;
      existing.activeSeconds += s.activeSeconds || 0;
      const pingMs = toMillis(s.lastPingAt || s.startedAt);
      if (pingMs > existing.lastPingMs) existing.lastPingMs = pingMs;
      userWeekMap.set(s.uid, existing);
    }

    const topActiveEntries = Array.from(userWeekMap.entries())
      .sort((a, b) => b[1].sessions - a[1].sessions)
      .slice(0, 10);

    const topUserDocs = await Promise.all(
      topActiveEntries.map(([uid]) => usersCol.doc(uid).get().catch(() => null))
    );

    let mostActiveUsers: Array<{
      uid: string;
      name: string;
      email: string | null;
      visitCount: number;
      totalActiveSeconds: number;
      lastVisitAt: string | null;
      window: '7d' | 'all-time';
    }> = topActiveEntries.map(([uid, stats], idx) => {
      const snap = topUserDocs[idx];
      const data = snap && snap.exists ? snap.data() : null;
      return {
        uid,
        name: data ? displayName(data) : 'Trader',
        email: data?.email || null,
        visitCount: stats.sessions, // 1-week visit count
        totalActiveSeconds: stats.activeSeconds,
        lastVisitAt: stats.lastPingMs ? new Date(stats.lastPingMs).toISOString() : toIso(data?.lastVisitAt),
        window: '7d' as const,
      };
    });

    // Graceful fallback to all-time visitCount if no 7d session data is logged yet
    if (mostActiveUsers.length === 0) {
      const fallbackSnap = await usersCol.orderBy('visitCount', 'desc').limit(10).get();
      mostActiveUsers = fallbackSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: displayName(data),
          email: data.email || null,
          visitCount: data.visitCount || 0,
          totalActiveSeconds: data.totalActiveSeconds || 0,
          lastVisitAt: toIso(data.lastVisitAt),
          window: 'all-time' as const,
        };
      });
    }

    // ── Going Quiet (Interactive & Realistic: Users who engaged before but are inactive recently) ──
    // Targets users who have visitCount >= 1 (real engagement) whose last visit is older than 5 days.
    // When a user visits today, their lastVisitAt updates and they automatically drop off this list.
    const quietCutoffMs = Date.now() - 5 * DAY_MS;
    const engagedUsersSnap = await usersCol.where('visitCount', '>=', 1).limit(300).get();

    const quietCandidates = engagedUsersSnap.docs
      .map((doc) => ({ uid: doc.id, ...doc.data() } as any))
      .filter((u) => {
        const lastMs = toMillis(u.lastVisitAt);
        return lastMs > 0 && lastMs <= quietCutoffMs;
      })
      .sort((a, b) => {
        // Sort by longest inactive duration (oldest lastVisitAt)
        return toMillis(a.lastVisitAt) - toMillis(b.lastVisitAt);
      });

    let leastActiveUsers = quietCandidates.slice(0, 10).map((u) => {
      const lastMs = toMillis(u.lastVisitAt);
      const daysQuiet = lastMs > 0 ? Math.floor((Date.now() - lastMs) / DAY_MS) : 0;
      return {
        uid: u.uid,
        name: displayName(u),
        email: u.email || null,
        visitCount: u.visitCount || 0,
        totalActiveSeconds: u.totalActiveSeconds || 0,
        lastVisitAt: toIso(u.lastVisitAt),
        daysQuiet,
        createdAt: u.createdAt || null,
      };
    });

    // If fewer than 5 engaged users are quiet, complement with accounts at least 5 days old
    if (leastActiveUsers.length < 5) {
      const cutoffIso = dhakaDateKeyToUtcMidnightISO(getDhakaDateKey(MIN_ACCOUNT_AGE_DAYS_FOR_INACTIVE_LIST));
      const oldestAccountsSnap = await usersCol.orderBy('createdAt', 'asc').limit(50).get();
      const existingUids = new Set(leastActiveUsers.map((u) => u.uid));
      const extraCandidates = oldestAccountsSnap.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() } as any))
        .filter((u) => !existingUids.has(u.uid) && u.createdAt && u.createdAt <= cutoffIso)
        .slice(0, 10 - leastActiveUsers.length)
        .map((u) => {
          const lastMs = toMillis(u.lastVisitAt);
          const daysQuiet = lastMs > 0 ? Math.floor((Date.now() - lastMs) / DAY_MS) : 0;
          return {
            uid: u.uid,
            name: displayName(u),
            email: u.email || null,
            visitCount: u.visitCount || 0,
            totalActiveSeconds: u.totalActiveSeconds || 0,
            lastVisitAt: toIso(u.lastVisitAt),
            daysQuiet,
            createdAt: u.createdAt || null,
          };
        });
      leastActiveUsers = [...leastActiveUsers, ...extraCandidates];
    }

    // ── Retention (D1/D7/D30) ─────────────────────────────────────────────
    // Only `createdAt` and `lastVisitAt` exist per user (no daily visit
    // history), so retention is approximated as: of accounts old enough to
    // judge this horizon, what fraction have a *most recent* visit that
    // landed at least N days after signup. That's a slight undercount of
    // true "came back on day N" retention (it misses someone who returned on
    // day N but never again), but it's honest about what the data supports
    // and needs no new tracking.
    const retentionSnap = await usersCol.select('createdAt', 'lastVisitAt').limit(RETENTION_USER_SCAN_CAP).get();
    const retentionDocs = retentionSnap.docs;
    const nowMs = Date.now();

    // Accounts that predate visit tracking have no `lastVisitAt` at all, so
    // they can never satisfy the "retained" test — but they were previously
    // still counted in the denominator, which dragged every retention rate
    // toward zero. (Measured: 435 of 467 accounts had no lastVisitAt, so the
    // reported rates were computed against a denominator that was ~93%
    // unanswerable.) Only accounts created after tracking began can be
    // honestly judged, so the cohort starts there.
    const trackingStartMs = (() => {
      let earliest = Infinity;
      for (const doc of retentionDocs) {
        const v = toMillis(doc.data().lastVisitAt);
        if (v && v < earliest) earliest = v;
      }
      return Number.isFinite(earliest) ? earliest : 0;
    })();

    const retentionFor = (days: number) => {
      let eligible = 0;
      let retained = 0;
      for (const doc of retentionDocs) {
        const data = doc.data();
        const createdMs = toMillis(data.createdAt);
        if (!createdMs || nowMs - createdMs < days * DAY_MS) continue;
        // Signed up before tracking existed — no data either way, so this
        // account is excluded rather than silently counted as "churned".
        if (createdMs < trackingStartMs) continue;
        eligible += 1;
        const lastVisitMs = toMillis(data.lastVisitAt);
        if (lastVisitMs && lastVisitMs - createdMs >= days * DAY_MS) retained += 1;
      }
      return { eligible, retained, rate: eligible > 0 ? Math.round((retained / eligible) * 100) : 0 };
    };
    const retention = {
      d1: retentionFor(1),
      d7: retentionFor(7),
      d30: retentionFor(30),
      sampledUsers: retentionDocs.length,
      // Accounts excluded because they predate visit tracking — surfaced so
      // the cohort size behind these rates is never invisible.
      cohortStartIso: trackingStartMs ? new Date(trackingStartMs).toISOString() : null,
      excludedPreTracking: retentionDocs.filter((d) => {
        const c = toMillis(d.data().createdAt);
        return c > 0 && c < trackingStartMs;
      }).length,
      truncated: retentionSnap.size >= RETENTION_USER_SCAN_CAP,
    };

    // ── Account integrity — Firebase Auth vs the `users` collection ──────
    // "Total registered users" was previously just a count() of `users`
    // docs, which is NOT the same as the number of real accounts: deleting
    // an Auth account leaves its Firestore doc behind, and some Auth
    // accounts never got a doc written. Observed drift: 467 docs vs 430 Auth
    // accounts (46 orphaned docs, 9 accounts with no doc) — an ~8% overcount
    // reported as fact.
    //
    // This also surfaces duplicate-email accounts: two UIDs sharing one
    // email means a signup fired twice concurrently (see the synchronous
    // in-flight guard in app/auth/page.tsx). Auth normally rejects a
    // duplicate password-provider email, so any hit here is a real race, not
    // a user signing up with two providers — providers are reported so a
    // legitimate google.com + password pair can be told apart at a glance.
    let accountIntegrity: any = null;
    if (authListError) {
      accountIntegrity = { error: authListError };
    } else try {
      const authUsers = authAccounts;

      const authUids = new Set(authUsers.map((u) => u.uid));
      // Reuse the retention scan's docs instead of re-reading the collection.
      const docUids = new Set(retentionDocs.map((d) => d.id));

      const orphanedDocs = [...docUids].filter((uid) => !authUids.has(uid));
      const missingDocs = authUsers.filter((u) => !docUids.has(u.uid));

      const byEmail = new Map<string, typeof authUsers>();
      for (const u of authUsers) {
        if (!u.email) continue;
        const key = u.email.toLowerCase();
        const list = byEmail.get(key) || [];
        list.push(u);
        byEmail.set(key, list);
      }
      const duplicateEmails = [...byEmail.entries()]
        .filter(([, list]) => list.length > 1)
        .map(([email, list]) => ({
          email,
          count: list.length,
          accounts: list.map((u) => ({ uid: u.uid, providers: u.providers, createdAt: u.createdAt })),
        }))
        .slice(0, ACCOUNT_INTEGRITY_LIST_LIMIT);

      accountIntegrity = {
        authAccountCount: authUsers.length,
        userDocCount: retentionDocs.length,
        orphanedDocCount: orphanedDocs.length,
        orphanedDocUids: orphanedDocs.slice(0, ACCOUNT_INTEGRITY_LIST_LIMIT),
        missingDocCount: missingDocs.length,
        missingDocs: missingDocs.slice(0, ACCOUNT_INTEGRITY_LIST_LIMIT),
        duplicateEmailCount: duplicateEmails.length,
        duplicateEmails,
        truncated: authListTruncated,
      };
    } catch (err: any) {
      console.error('❌ Account integrity check unavailable:', err);
      accountIntegrity = { error: 'Account integrity check unavailable right now.' };
    }

    // ── Session retention & storage hygiene (Tiered retention overview) ──
    const cutoffAnon14Days = new Date(nowMs - 14 * DAY_MS);
    let sessionRetention: any = null;
    try {
      const [totalSessionsSnap, anonSessionsSnap, oldSessionsSnap] = await Promise.all([
        db.collection('analytics_sessions').count().get(),
        db.collection('analytics_sessions').where('isAnonymous', '==', true).count().get(),
        db.collection('analytics_sessions').where('startedAt', '<=', cutoffAnon14Days).count().get(),
      ]);

      const totalSessions = totalSessionsSnap.data().count;
      const anonSessions = anonSessionsSnap.data().count;
      const userSessions = Math.max(0, totalSessions - anonSessions);
      const prunableCandidates = oldSessionsSnap.data().count;

      sessionRetention = {
        totalCount: totalSessions,
        anonymousCount: anonSessions,
        userCount: userSessions,
        prunableCandidatesCount: prunableCandidates,
      };
    } catch (e: any) {
      console.warn('Session retention stats unavailable:', e);
      sessionRetention = { totalCount: 0, anonymousCount: 0, userCount: 0, prunableCandidatesCount: 0 };
    }

    // ── Revenue / recharge analytics — recharge_requests is written by the
    // client (app/coins/page.tsx) and approved/rejected by
    // app/api/admin/recharge/route.ts, which recomputes creditedCoins itself
    // rather than trusting the client value (see that route for why).
    const rechargeSnap = await db.collection('recharge_requests').limit(RECHARGE_FETCH_CAP).get();
    const recharge30CutoffIso = dhakaDateKeyToUtcMidnightISO(trendKeys[0]);
    let approvedAllTimeBdt = 0;
    let approvedAllTimeCoins = 0;
    let approvedAllTimeCount = 0;
    let approved30Bdt = 0;
    let approved30Count = 0;
    let pendingCount = 0;
    let pendingBdt = 0;
    let rejected30Count = 0;
    const rechargerUidsAllTime = new Set<string>();
    const rechargerUids30 = new Set<string>();

    for (const doc of rechargeSnap.docs) {
      const r = doc.data();
      const amount = typeof r.amount === 'number' ? r.amount : 0;
      const coins = typeof r.creditedCoins === 'number' ? r.creditedCoins : typeof r.coins === 'number' ? r.coins : 0;

      if (r.status === 'approved') {
        approvedAllTimeBdt += amount;
        approvedAllTimeCoins += coins;
        approvedAllTimeCount += 1;
        if (r.userId) rechargerUidsAllTime.add(r.userId);
        const processedIso = toIso(r.processedAt);
        if (processedIso && processedIso >= recharge30CutoffIso) {
          approved30Bdt += amount;
          approved30Count += 1;
          if (r.userId) rechargerUids30.add(r.userId);
        }
      } else if (r.status === 'pending') {
        pendingCount += 1;
        pendingBdt += amount;
      } else if (r.status === 'rejected') {
        const processedIso = toIso(r.processedAt);
        if (processedIso && processedIso >= recharge30CutoffIso) rejected30Count += 1;
      }
    }

    const revenue = {
      approvedAllTime: { bdt: approvedAllTimeBdt, coins: approvedAllTimeCoins, count: approvedAllTimeCount },
      approvedLast30Days: { bdt: approved30Bdt, count: approved30Count },
      avgApprovedRechargeBdt: approvedAllTimeCount > 0 ? Math.round(approvedAllTimeBdt / approvedAllTimeCount) : 0,
      pending: { count: pendingCount, bdt: pendingBdt },
      rejectedLast30Days: rejected30Count,
      rechargerCount: rechargerUidsAllTime.size,
      conversionRatePercent:
        totalRegisteredUsers > 0 ? Math.round((rechargerUidsAllTime.size / totalRegisteredUsers) * 100) : 0,
      truncated: rechargeSnap.size >= RECHARGE_FETCH_CAP,
    };

    // ── Trading activity — reads the SAME trade_history data the simulator ─
    // already writes (hooks/useSimulator.ts); no new tracking needed, just a
    // collectionGroup query across every user's trade_history subcollection.
    // This needs a one-time Firestore index (collection group scope on
    // `timestamp`) — the first run may fail until that's created, so this
    // degrades gracefully rather than breaking the whole dashboard.
    let trading: any = null;
    let tradingError: string | null = null;
    try {
      const tradeCutoffIso = dhakaDateKeyToUtcMidnightISO(trendKeys[0]);
      const tradesSnap = await db
        .collectionGroup('trade_history')
        .where('timestamp', '>=', tradeCutoffIso)
        .orderBy('timestamp', 'desc')
        .limit(TRADE_FETCH_CAP)
        .get();

      const todayTraders = new Set<string>();
      const last7Traders = new Set<string>();
      const last30Traders = new Set<string>();
      let tradesToday = 0;
      let trades7 = 0;
      let trades30 = 0;
      let buys = 0;
      let sells = 0;
      const symbolCounts = new Map<string, number>();

      for (const doc of tradesSnap.docs) {
        const data = doc.data();
        if (typeof data.timestamp !== 'string') continue;

        const tradeDateKey = isoToDhakaDateKey(data.timestamp);
        const stateDocRef = doc.ref.parent.parent;
        const simulatorCollRef = stateDocRef?.parent;
        const uidDocRef = simulatorCollRef?.parent;
        const uid = uidDocRef?.id || null;

        trades30++;
        if (uid) last30Traders.add(uid);
        if (tradeDateKey >= last7Keys[0]) {
          trades7++;
          if (uid) last7Traders.add(uid);
        }
        if (tradeDateKey === todayKey) {
          tradesToday++;
          if (uid) todayTraders.add(uid);
        }

        if (data.type === 'BUY') buys++;
        else if (data.type === 'SELL') sells++;

        if (typeof data.symbol === 'string' && data.symbol) {
          symbolCounts.set(data.symbol, (symbolCounts.get(data.symbol) || 0) + 1);
        }
      }

      const mostTradedStocks = Array.from(symbolCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_STOCKS_LIMIT)
        .map(([symbol, count]) => ({ symbol, count }));

      trading = {
        trades: { today: tradesToday, last7Days: trades7, last30Days: trades30 },
        activeTraders: { today: todayTraders.size, last7Days: last7Traders.size, last30Days: last30Traders.size },
        buyVsSell: { buys, sells },
        mostTradedStocks,
        truncated: tradesSnap.size >= TRADE_FETCH_CAP,
      };
    } catch (err: any) {
      console.error('❌ Trading analytics unavailable:', err);
      tradingError =
        err?.code === 9 || /index/i.test(err?.message || '')
          ? 'Trading analytics need a one-time Firestore index for trade_history. Check the server/Vercel function logs for a "create index" link from this error, click it once, then refresh this page in a few minutes.'
          : 'Trading analytics unavailable right now.';
    }

    // ── Growth funnel (30d) — how far a visitor typically gets: browsing →
    // registering → placing a trade → putting real money behind it.
    const growthFunnel = [
      { stage: 'Visitors', value: visitorsLast30 },
      { stage: 'Registrations', value: registrations30 },
      { stage: 'Active traders', value: trading?.activeTraders.last30Days ?? 0 },
      { stage: 'Rechargers', value: rechargerUids30.size },
    ];

    const payload = {
      activeRightNow,
        visitors: { today: visitorsToday, last7Days: visitorsLast7, last30Days: visitorsLast30 },
        disclaimerAgreements: {
          today: disclaimerAgreedToday,
          last7Days: disclaimerAgreedLast7,
          last30Days: disclaimerAgreedLast30,
        },
        avgSessionSeconds: { today: avgSeconds([todayKey]), last7Days: avgSeconds(last7Keys) },
        registrations: {
          // All four now come from the same source (Firebase Auth unless it
          // was unreachable), so they reconcile with the Firebase console
          // and with each other.
          today: registrationsToday,
          last7Days: registrations7,
          last30Days: registrations30,
          totalAllTime: totalRegisteredUsers,
          // Firestore `users` doc count, kept for reference — this is the
          // number the dashboard used to report as "users".
          totalUserDocs,
          source: useAuth ? 'firebase-auth' : 'firestore-user-docs',
          sourceWarning: authListError,
        },
        accountIntegrity,
        sessionRetention,
        deviceBreakdown,
        geoBreakdown,
        dailyTrend,
        trafficSources,
        newVsReturning,
        bounceRate,
        retention,
        peakHours,
        hourlyActivity,
        dayOfWeekActivity,
        monthlyCalendar,
        topLandingPages,
        topBlogPosts,
        topStockPages,
        topCoinHolders,
        totalCoinsInCirculation,
        coinBalancesTruncated: balancesTruncated,
        balanceIntegrity,
        revenue,
        growthFunnel,
        mostActiveUsers,
        leastActiveUsers,
        trading,
        tradingError,
        methodologyNote:
          'Visit tracking started when this dashboard shipped — there is no historical data from before that. "Least active" is ranked among the oldest-registered accounts. Retention approximates "returned N+ days after signup" from last-visit data, not a full daily visit history.' +
          (balancesTruncated ? ' Coin circulation was computed from a capped sample of balances and may undercount.' : ''),
      };

    memoryCache = { timestamp: Date.now(), data: payload };

    return NextResponse.json(
      { success: true, cached: false, ...payload },
      {
        headers: {
          'Cache-Control': 'private, max-age=60',
        },
      }
    );
  } catch (error: any) {
    console.error('❌ Site analytics API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load site analytics' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ success: false, error: adminCheck.error }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'backfill-missing-user-docs') {
      const db = getFirestore();
      const auth = getAuth();

      // List all auth accounts
      const authUsers: Array<{
        uid: string;
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
        providers: string[];
        createdAt: string;
      }> = [];
      let pageToken: string | undefined;
      do {
        const res = await auth.listUsers(1000, pageToken);
        for (const u of res.users) {
          authUsers.push({
            uid: u.uid,
            email: u.email ?? null,
            displayName: u.displayName ?? null,
            photoURL: u.photoURL ?? null,
            providers: u.providerData.map((p) => p.providerId),
            createdAt: u.metadata.creationTime,
          });
        }
        pageToken = res.pageToken;
      } while (pageToken);

      // Check existing user docs
      const usersSnap = await db.collection('users').select().get();
      const existingDocIds = new Set(usersSnap.docs.map((d) => d.id));

      const missing = authUsers.filter((u) => !existingDocIds.has(u.uid));
      const createdUids: string[] = [];

      for (const u of missing) {
        const userDocRef = db.collection('users').doc(u.uid);
        await userDocRef.set(
          {
            name: u.displayName || (u.email ? u.email.split('@')[0] : 'User'),
            email: u.email,
            displayName: u.displayName || null,
            photoURL: u.photoURL || null,
            age: null,
            status: 'Other',
            phone: '',
            provider: u.providers[0] || 'unknown',
            accountTier: 'Bro',
            createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
          },
          { merge: true }
        );
        createdUids.push(u.uid);
      }

      memoryCache = null;

      return NextResponse.json({
        success: true,
        backfilledCount: createdUids.length,
        uids: createdUids,
      });
    }

    if (action === 'delete-orphaned-user-docs') {
      const db = getFirestore();
      const auth = getAuth();

      const authUids = new Set<string>();
      let pageToken: string | undefined;
      do {
        const res = await auth.listUsers(1000, pageToken);
        for (const u of res.users) {
          authUids.add(u.uid);
        }
        pageToken = res.pageToken;
      } while (pageToken);

      const usersSnap = await db.collection('users').select().get();
      const orphaned = usersSnap.docs.filter((d) => !authUids.has(d.id));

      const batch = db.batch();
      for (const doc of orphaned.slice(0, 500)) {
        batch.delete(doc.ref);
      }
      await batch.commit();

      memoryCache = null;

      return NextResponse.json({
        success: true,
        deletedCount: orphaned.length,
      });
    }

    if (action === 'prune-expired-sessions') {
      const db = getFirestore();
      const now = Date.now();
      const cutoffAnon14Days = new Date(now - 14 * 86400000);
      const cutoffUser90Days = new Date(now - 90 * 86400000);

      // Fetch candidates using single-field index on startedAt (no composite index needed)
      // Bounded to 500 per batch to strictly protect Spark delete limits
      const snap = await db
        .collection('analytics_sessions')
        .where('startedAt', '<=', cutoffAnon14Days)
        .limit(500)
        .get();

      const toDelete: FirebaseFirestore.DocumentReference[] = [];

      for (const doc of snap.docs) {
        const data = doc.data();
        const isAnon = data.isAnonymous || !data.uid;
        const startedMs = data.startedAt?.toMillis ? data.startedAt.toMillis() : Date.parse(data.startedAt) || 0;

        // Condition 1: Anonymous session older than 14 days
        if (isAnon && startedMs <= cutoffAnon14Days.getTime()) {
          toDelete.push(doc.ref);
          continue;
        }

        // Condition 2: Registered user session older than 90 days
        if (!isAnon && startedMs <= cutoffUser90Days.getTime()) {
          toDelete.push(doc.ref);
          continue;
        }

        // Condition 3: Explicit expiresAt in the past
        if (data.expiresAt) {
          const expiresMs = data.expiresAt.toMillis ? data.expiresAt.toMillis() : Date.parse(data.expiresAt) || 0;
          if (expiresMs > 0 && expiresMs <= now) {
            toDelete.push(doc.ref);
          }
        }
      }

      if (toDelete.length > 0) {
        const batch = db.batch();
        for (const ref of toDelete) {
          batch.delete(ref);
        }
        await batch.commit();
      }

      memoryCache = null;

      return NextResponse.json({
        success: true,
        prunedCount: toDelete.length,
        hasMore: snap.size === 500,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('❌ Site analytics POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Action failed' }, { status: 500 });
  }
}
