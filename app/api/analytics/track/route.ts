// app/api/analytics/track/route.ts
// Public, rate-limited visit/session tracker. Called by every visitor
// (logged in or anonymous) from components/VisitTracker.tsx.
//
// Writes:
//   analytics_sessions/{sessionId}   — one doc per browser session (raw record + idempotency guard)
//   analytics_daily/{dateKey}        — running rollup counters, so the admin dashboard reads
//                                      O(days) documents instead of scanning every session ever
//   users/{uid}                      — lightweight per-user visit rollup (visitCount, lastVisitAt,
//                                      totalActiveSeconds) so "most/least active user" needs no
//                                      session scan either
//
// Trust model: this endpoint has no auth requirement (anonymous visitors must be trackable), so
// every numeric input is clamped server-side and IP-rate-limited. A `uid` is only ever recorded if
// an accompanying Firebase ID token verifies — a client can never claim someone else's uid.

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getClientIP } from '@/lib/apiUtils';
import { checkPersistentRateLimit } from '@/lib/utils/persistentRateLimit';
import { getDhakaDateKey, getDhakaHour } from '@/lib/utils/dhakaTime';
import { bucketGeoHeaders } from '@/lib/utils/geoBucket';

// Ensure Firebase Admin is initialized with full credentials (side effect of import).
import '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ACTIONS = new Set(['start', 'heartbeat', 'end']);
const VALID_DEVICE_TYPES = new Set(['mobile', 'tablet', 'desktop', 'unknown']);
const MAX_DELTA_SECONDS = 60; // clamp per-beacon active-time delta (heartbeat interval is ~25-30s)
const MAX_PAGE_COUNT = 2000;

// ── Tiered Retention Policy (Dividing the Data) ──────────────────────────
// Tier 1: Aggregated metrics (analytics_daily, users) are permanent (kept forever).
// Tier 2: Logged-in user sessions (uid present) are kept for 90 days for audit trails.
// Tier 3: Anonymous guest sessions:
//         - initial bounce / single-page: 7 days
//         - multi-page / active guest: 14 days
const TTL_USER_DAYS = 90;
const TTL_GUEST_ACTIVE_DAYS = 14;
const TTL_GUEST_BOUNCE_DAYS = 7;

const BOUNCE_MAX_PAGE_COUNT = 1;
const BOUNCE_MAX_ACTIVE_SECONDS = 10;

// checkPersistentRateLimit's default (10 req/min) is keyed per-IP, but Bangladeshi
// mobile carriers (GP, Robi, Banglalink) carrier-NAT huge numbers of concurrent users
// behind one public IP. At the default cap, a handful of real visitors sharing that
// IP would silently 429 each other's 'start' beacons - undercounting visitCount for
// swaths of the mobile user base. This endpoint is cheap and low-risk, so it gets a
// much higher ceiling; it still blocks a genuine single-source flood.
const ANALYTICS_RATE_LIMIT = { maxRequests: 300, windowMs: 60_000 };

const SOCIAL_HOSTS = [
  'facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
  't.co', 'tiktok.com', 'reddit.com', 'pinterest.com', 'youtube.com', 'wa.me',
  'whatsapp.com', 'telegram.org', 't.me',
];
const SEARCH_HOSTS = ['bing.com', 'yahoo.com', 'duckduckgo.com', 'baidu.com', 'yandex.'];

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function isPlausibleSessionId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 100;
}

async function tryVerifyUid(idToken: unknown): Promise<string | null> {
  if (typeof idToken !== 'string' || !idToken) return null;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    // Expired/invalid token from a stale tab — fall back to anonymous rather than failing the beacon.
    return null;
  }
}

/**
 * Bucket a referrer URL into a traffic-source category for the "where do
 * visitors come from" breakdown. `ownHostname` (the host serving this
 * request) lets a same-site referrer count as "internal" rather than an
 * external source.
 */
function categorizeReferrer(referrer: string | null, ownHostname: string): string {
  if (!referrer) return 'direct';
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'other';
  }
  if (!host) return 'direct';
  if (host === ownHostname || host.endsWith(`.${ownHostname}`)) return 'internal';
  if (host.includes('google.')) return 'search_google';
  if (SEARCH_HOSTS.some((h) => host.includes(h))) return 'search_other';
  if (SOCIAL_HOSTS.some((h) => host.includes(h))) return 'social';
  return 'other';
}

/** Canonicalize URL path to prevent case or trailing slash fragmentation */
function normalizeAnalyticsPath(path: string): string {
  let cleaned = (path || '/').split('?')[0].split('#')[0].trim();
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  if (/^\/stocks\/[^\/]+$/i.test(cleaned)) {
    const symbol = cleaned.slice('/stocks/'.length).toUpperCase();
    return `/stocks/${symbol}`;
  }
  if (/^\/blog\/[^\/]+$/i.test(cleaned)) {
    const slug = cleaned.slice('/blog/'.length).toLowerCase();
    return `/blog/${slug}`;
  }
  return cleaned;
}

/** Turn a URL path into a safe, stable Firestore document id. */
function pathToDocId(path: string): string {
  const norm = normalizeAnalyticsPath(path);
  const id = `p_${norm.replace(/\//g, '_')}`;
  return id.length > 400 ? id.slice(0, 400) : id;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const allowed = await checkPersistentRateLimit(`analytics:${ip}`, ANALYTICS_RATE_LIMIT);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Rate limited' }, { status: 429 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const action = body?.action;
    if (!VALID_ACTIONS.has(action)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing action' }, { status: 400 });
    }

    const sessionId = body?.sessionId;
    if (!isPlausibleSessionId(sessionId)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing sessionId' }, { status: 400 });
    }

    const db = getFirestore();
    const sessionRef = db.collection('analytics_sessions').doc(sessionId);

    // ─────────────────────────────────────────────
    // START — create the session + bump rollups
    // ─────────────────────────────────────────────
    if (action === 'start') {
      const uid = await tryVerifyUid(body?.idToken);
      const dateKey = getDhakaDateKey(0);
      const hour = getDhakaHour();
      const entryPath = normalizeAnalyticsPath(sanitizeString(body?.entryPath, 300) || '/');
      const referrer = sanitizeString(body?.referrer, 300);
      const guestId = sanitizeString(body?.guestId, 100);
      const deviceType = VALID_DEVICE_TYPES.has(body?.deviceType) ? body.deviceType : 'unknown';

      let ownHostname = '';
      try {
        ownHostname = (req.nextUrl?.hostname || new URL(req.url).hostname).toLowerCase();
      } catch {
        ownHostname = '';
      }
      const sourceBucket = categorizeReferrer(referrer, ownHostname);
      const geoBucket = bucketGeoHeaders(req.headers);

      const dailyRef = db.collection('analytics_daily').doc(dateKey);
      const userRef = uid ? db.collection('users').doc(uid) : null;
      const guestRef = !uid && guestId ? db.collection('analytics_guests').doc(guestId) : null;
      const pageRef = db.collection('analytics_pages').doc(pathToDocId(entryPath));

      const result = await db.runTransaction(async (tx) => {
        const existing = await tx.get(sessionRef);
        if (existing.exists) {
          // Idempotent: a retried/duplicated 'start' beacon must not double-count.
          return { alreadyStarted: true };
        }

        let isFirstVisitToday = false;
        let isNewVisitorEver = false;
        let hasIdentitySignal = false;

        if (userRef) {
          hasIdentitySignal = true;
          const userSnap = await tx.get(userRef);
          const userData = userSnap.exists ? userSnap.data() : null;
          isFirstVisitToday = (userData?.lastVisitDateKey ?? null) !== dateKey;
          isNewVisitorEver = !userSnap.exists || !userData?.visitCount;
        } else if (guestRef) {
          hasIdentitySignal = true;
          const guestSnap = await tx.get(guestRef);
          isNewVisitorEver = !guestSnap.exists;
          tx.set(
            guestRef,
            {
              firstSeenAt: guestSnap.exists ? guestSnap.data()?.firstSeenAt : FieldValue.serverTimestamp(),
              lastSeenAt: FieldValue.serverTimestamp(),
              visitCount: FieldValue.increment(1),
            },
            { merge: true }
          );
        }

        const retentionTier: 'user' | 'ephemeral' = uid ? 'user' : 'ephemeral';
        const ttlDays = uid ? TTL_USER_DAYS : TTL_GUEST_BOUNCE_DAYS;
        const expiresAt = new Date(Date.now() + ttlDays * 86400000);

        tx.set(sessionRef, {
          sessionId,
          uid: uid || null,
          isAnonymous: !uid,
          retentionTier,
          guestId: guestId || null,
          startedAt: FieldValue.serverTimestamp(),
          lastPingAt: FieldValue.serverTimestamp(),
          endedAt: null,
          activeSeconds: 0,
          pageCount: 1,
          entryPath,
          lastPath: entryPath,
          referrer,
          sourceBucket,
          deviceType,
          dateKey,
          expiresAt,
        });

        tx.set(
          dailyRef,
          {
            dateKey,
            totalSessions: FieldValue.increment(1),
            loggedInSessions: FieldValue.increment(uid ? 1 : 0),
            guestSessions: FieldValue.increment(uid ? 0 : 1),
            uniqueLoggedInUsers: FieldValue.increment(isFirstVisitToday && uid ? 1 : 0),
            newVisitorSessions: FieldValue.increment(hasIdentitySignal && isNewVisitorEver ? 1 : 0),
            returningVisitorSessions: FieldValue.increment(hasIdentitySignal && !isNewVisitorEver ? 1 : 0),
            [`device_${deviceType}`]: FieldValue.increment(1),
            [`source_${sourceBucket}`]: FieldValue.increment(1),
            [`hour_${hour}`]: FieldValue.increment(1),
            [`geo_${geoBucket}`]: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        tx.set(
          pageRef,
          {
            path: entryPath,
            views: FieldValue.increment(1),
            lastDateKey: dateKey,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        if (userRef) {
          tx.set(
            userRef,
            {
              visitCount: FieldValue.increment(1),
              lastVisitAt: FieldValue.serverTimestamp(),
              lastVisitDateKey: dateKey,
            },
            { merge: true }
          );
        }

        return { alreadyStarted: false };
      });

      return NextResponse.json({ success: true, ...result });
    }

    // ─────────────────────────────────────────────
    // HEARTBEAT / END — accumulate active time
    // ─────────────────────────────────────────────
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      // Session doc missing (expired/cleaned up, or a stray beacon before 'start' landed).
      // Not an error — just nothing to accumulate against.
      return NextResponse.json({ success: true, skipped: true });
    }

    const session = sessionSnap.data()!;
    const dateKey: string = session.dateKey || getDhakaDateKey(0);
    const delta = clampNumber(body?.deltaActiveSeconds, 0, MAX_DELTA_SECONDS, 0);
    const rawPath = sanitizeString(body?.path, 300);
    const lastPath = rawPath ? normalizeAnalyticsPath(rawPath) : null;
    const incomingPageCount = clampNumber(body?.pageCount, 0, MAX_PAGE_COUNT, 0);

    const sessionUpdate: Record<string, any> = {
      lastPingAt: FieldValue.serverTimestamp(),
      activeSeconds: FieldValue.increment(delta),
    };
    if (lastPath) sessionUpdate.lastPath = lastPath;

    const incomingUid = await tryVerifyUid(body?.idToken);

    // Promotion logic: if an ephemeral bounce becomes an active guest or a user logs in,
    // upgrade the retention tier and extend the TTL appropriately.
    if (!session.uid) {
      if (incomingUid) {
        sessionUpdate.uid = incomingUid;
        sessionUpdate.isAnonymous = false;
        sessionUpdate.retentionTier = 'user';
        sessionUpdate.expiresAt = new Date(Date.now() + TTL_USER_DAYS * 86400000);
      } else {
        const currentPages = incomingPageCount || session.pageCount || 1;
        const currentSeconds = (session.activeSeconds || 0) + delta;
        if ((currentPages > 1 || currentSeconds >= 15) && session.retentionTier !== 'guest') {
          sessionUpdate.retentionTier = 'guest';
          sessionUpdate.expiresAt = new Date(Date.now() + TTL_GUEST_ACTIVE_DAYS * 86400000);
        }
      }
    }

    // analytics_pages used to increment ONLY on the session's entry path, so
    // it measured landing pages while the dashboard presented slices of it as
    // blog- and stock-page popularity. A blog post reached by navigating from
    // the homepage was never counted at all. Counting a view whenever the
    // reported path differs from the session's last known path closes that
    // gap without double-counting the ~25s heartbeats that sit on one page.
    const isNavigation = !!lastPath && lastPath !== session.lastPath;
    if (incomingPageCount > (session.pageCount || 0)) sessionUpdate.pageCount = incomingPageCount;
    if (action === 'end') sessionUpdate.endedAt = FieldValue.serverTimestamp();

    const dailyUpdate: Record<string, any> = {
      dateKey,
      totalActiveSeconds: FieldValue.increment(delta),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (action === 'end') {
      dailyUpdate.completedSessions = FieldValue.increment(1);

      // A "bounce" — one page, barely any active time — is a standard engagement
      // signal: high bounce rate usually means the landing page isn't hooking people.
      const finalPageCount = sessionUpdate.pageCount ?? (session.pageCount || 1);
      const finalActiveSeconds = (session.activeSeconds || 0) + delta;
      if (finalPageCount <= BOUNCE_MAX_PAGE_COUNT && finalActiveSeconds <= BOUNCE_MAX_ACTIVE_SECONDS) {
        dailyUpdate.bounces = FieldValue.increment(1);
      }
    }

    // An 'end' beacon is NOT naturally idempotent: `pagehide` can fire more
    // than once for the same session (bfcache restore, mobile tab switching,
    // a visibilitychange→hidden immediately followed by pagehide), and each
    // one used to increment `completedSessions` again. That silently inflated
    // the denominator behind avgSessionSeconds and bounceRate — analytics_daily
    // was observed with completedSessions (89) exceeding totalSessions (83)
    // on the same day, which is structurally impossible.
    //
    // So the 'end' path now runs in a transaction that re-reads the session
    // and only counts the completion if this is the first time the session is
    // being ended. Heartbeats stay on the cheaper batch path — they only
    // accumulate additive time, which double-firing cannot corrupt the same way.
    const dailyRef = db.collection('analytics_daily').doc(dateKey);
    const userTimeRef = session.uid && delta > 0 ? db.collection('users').doc(session.uid) : null;
    const navPageRef = isNavigation ? db.collection('analytics_pages').doc(pathToDocId(lastPath!)) : null;
    const navPageUpdate = {
      path: lastPath,
      views: FieldValue.increment(1),
      lastDateKey: dateKey,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (action === 'end') {
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(sessionRef);
        const alreadyEnded = fresh.exists && !!fresh.data()?.endedAt;

        if (alreadyEnded) {
          // Re-fired end beacon: still record any trailing active time, but
          // never re-count the session as completed (or re-count a bounce).
          delete dailyUpdate.completedSessions;
          delete dailyUpdate.bounces;
        }

        tx.set(sessionRef, sessionUpdate, { merge: true });
        tx.set(dailyRef, dailyUpdate, { merge: true });
        if (userTimeRef) {
          tx.set(userTimeRef, { totalActiveSeconds: FieldValue.increment(delta) }, { merge: true });
        }
        if (navPageRef) tx.set(navPageRef, navPageUpdate, { merge: true });
      });
      return NextResponse.json({ success: true });
    }

    const batch = db.batch();
    batch.set(sessionRef, sessionUpdate, { merge: true });
    batch.set(dailyRef, dailyUpdate, { merge: true });
    if (userTimeRef) {
      batch.set(userTimeRef, { totalActiveSeconds: FieldValue.increment(delta) }, { merge: true });
    }
    if (navPageRef) batch.set(navPageRef, navPageUpdate, { merge: true });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Analytics track error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
