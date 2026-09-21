// app/api/analytics/market-reminder/route.ts
// Authoritative, rate-limited endpoint tracking when a user accepts setting
// a DSE market open calendar reminder (Google Calendar or Apple Calendar/iCal).

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getClientIP } from '@/lib/apiUtils';
import { checkPersistentRateLimit } from '@/lib/utils/persistentRateLimit';
import { getDhakaDateKey } from '@/lib/utils/dhakaTime';

// Side-effect import to ensure Firebase Admin SDK is initialized
import '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set(['google_calendar', 'apple_ics', 'weekly_ics']);
const VALID_SOURCES = new Set([
  'trade_banner',
  'trade_row_buy',
  'trade_row_sell',
  'market_row_buy',
  'market_row_sell',
  'trade_panel',
  'market_strip',
  'unknown',
]);

const REMINDER_RATE_LIMIT = { maxRequests: 60, windowMs: 60_000 };

async function verifyOptionalUid(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientIP = getClientIP(req);
    const isAllowed = await checkPersistentRateLimit(
      `market-reminder:${clientIP}`,
      REMINDER_RATE_LIMIT
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawType = typeof body.type === 'string' ? body.type.trim().toLowerCase() : '';
    const type = VALID_TYPES.has(rawType) ? rawType : 'google_calendar';

    const rawSource = typeof body.source === 'string' ? body.source.trim().toLowerCase() : '';
    const source = VALID_SOURCES.has(rawSource) ? rawSource : 'unknown';

    const leadMinutes = typeof body.leadMinutes === 'number' && [0, 15].includes(body.leadMinutes)
      ? body.leadMinutes
      : 15;
    const isRecurring = Boolean(body.isRecurring);
    const nextOpenDhaka = typeof body.nextOpenDhaka === 'string' ? body.nextOpenDhaka.slice(0, 100) : null;

    const uid = await verifyOptionalUid(req);
    const dateKey = getDhakaDateKey(0);
    const db = getFirestore();

    const batch = db.batch();

    // 1. Overall Summary Rollup
    const summaryRef = db.collection('analytics_market_reminders').doc('summary');
    batch.set(
      summaryRef,
      {
        totalCount: FieldValue.increment(1),
        [`byType.${type}`]: FieldValue.increment(1),
        [`bySource.${source}`]: FieldValue.increment(1),
        lastAcceptedAt: FieldValue.serverTimestamp(),
        lastDateKey: dateKey,
      },
      { merge: true }
    );

    // 2. Daily Rollup
    const dailyRef = db.collection('analytics_market_reminders_daily').doc(dateKey);
    batch.set(
      dailyRef,
      {
        date: dateKey,
        totalCount: FieldValue.increment(1),
        [`byType.${type}`]: FieldValue.increment(1),
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 3. User document flag (if authenticated)
    if (uid) {
      const userRef = db.collection('users').doc(uid);
      batch.set(
        userRef,
        {
          marketReminderAcceptedAt: FieldValue.serverTimestamp(),
          lastMarketReminderType: type,
        },
        { merge: true }
      );
    }

    // 4. Granular Event Record
    const eventRef = db.collection('market_reminder_events').doc();
    batch.set(eventRef, {
      type,
      source,
      leadMinutes,
      isRecurring,
      nextOpenDhaka,
      uid: uid || null,
      dateKey,
      clientIP: clientIP !== 'unknown' ? clientIP : null,
      userAgent: req.headers.get('user-agent')?.slice(0, 200) || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Market reminder tracking error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
