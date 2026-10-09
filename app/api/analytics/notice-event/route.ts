// app/api/analytics/notice-event/route.ts
// Production-ready, authoritative analytics endpoint tracking impressions,
// clicks, dismissals, and submissions for once-per-user modal campaigns.
//
// Writes:
//   analytics_notices/{campaignId}             — aggregated campaign stats & CTR rollup
//   analytics_notices_daily/{campaignId}_{date} — daily breakdown
//   users/{uid}.noticesSeen.{campaignId}       — server-side seen/completed flag for logged-in users
//   notice_events/{eventId}                    — granular telemetry record

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getClientIP } from '@/lib/apiUtils';
import { checkPersistentRateLimit } from '@/lib/utils/persistentRateLimit';
import { getDhakaDateKey } from '@/lib/utils/dhakaTime';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';

// Side-effect import to ensure Firebase Admin SDK is initialized
import '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ACTIONS = new Set(['impression', 'click', 'dismiss', 'submit', 'copy']);
const RATE_LIMIT_CONFIG = { maxRequests: 120, windowMs: 60_000 };

interface AuthUserInfo {
  uid: string;
  email?: string | null;
  name?: string | null;
}

async function verifyOptionalUser(req: NextRequest): Promise<AuthUserInfo | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  try {
    const decoded = await getAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || null,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientIP = getClientIP(req);
    const isAllowed = await checkPersistentRateLimit(
      `notice-event:${clientIP}`,
      RATE_LIMIT_CONFIG
    );

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawCampaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : '';
    const campaignId = rawCampaignId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'default_notice';

    const rawAction = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
    if (!VALID_ACTIONS.has(rawAction)) {
      return NextResponse.json(
        { success: false, error: 'Invalid notice action. Must be impression, click, copy, dismiss, or submit.' },
        { status: 400 }
      );
    }

    const action = rawAction as 'impression' | 'click' | 'dismiss' | 'submit' | 'copy';
    const metadata = typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {};
    const authUser = await verifyOptionalUser(req);
    const uid = authUser?.uid || null;
    const dateKey = getDhakaDateKey(0);
    const nowIso = new Date().toISOString();
    const db = getFirestore();

    const batch = db.batch();

    // 1. Campaign summary rollup
    const summaryRef = db.collection('analytics_notices').doc(campaignId);
    batch.set(
      summaryRef,
      {
        campaignId,
        totalImpressions: FieldValue.increment(action === 'impression' ? 1 : 0),
        totalClicks: FieldValue.increment(action === 'click' ? 1 : 0),
        totalCopies: FieldValue.increment(action === 'copy' ? 1 : 0),
        totalDismissals: FieldValue.increment(action === 'dismiss' ? 1 : 0),
        totalSubmissions: FieldValue.increment(action === 'submit' ? 1 : 0),
        lastAction: action,
        lastEventAt: FieldValue.serverTimestamp(),
        lastDateKey: dateKey,
      },
      { merge: true }
    );

    // 2. Daily breakdown rollup
    const dailyDocId = `${campaignId}_${dateKey}`;
    const dailyRef = db.collection('analytics_notices_daily').doc(dailyDocId);
    batch.set(
      dailyRef,
      {
        campaignId,
        date: dateKey,
        impressions: FieldValue.increment(action === 'impression' ? 1 : 0),
        clicks: FieldValue.increment(action === 'click' ? 1 : 0),
        copies: FieldValue.increment(action === 'copy' ? 1 : 0),
        dismissals: FieldValue.increment(action === 'dismiss' ? 1 : 0),
        submissions: FieldValue.increment(action === 'submit' ? 1 : 0),
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 3. Mark user profile if user finished what was needed (click, copy, or submit)
    if (uid && (action === 'click' || action === 'copy' || action === 'submit')) {
      const userRef = db.collection('users').doc(uid);
      batch.set(
        userRef,
        {
          [`noticesSeen.${campaignId}`]: nowIso,
          lastNoticeInteraction: {
            campaignId,
            action,
            at: nowIso,
          },
        },
        { merge: true }
      );
    } else if (uid && action === 'dismiss') {
      const userRef = db.collection('users').doc(uid);
      batch.set(
        userRef,
        {
          lastNoticeDismissal: {
            campaignId,
            at: nowIso,
          },
        },
        { merge: true }
      );
    }

    // 4. Detailed audit event
    const eventRef = db.collection('notice_events').doc();
    batch.set(eventRef, {
      campaignId,
      action,
      uid,
      userEmail: authUser?.email || null,
      displayName: authUser?.name || null,
      clientIP: clientIP !== 'unknown' ? clientIP : null,
      userAgent: req.headers.get('user-agent')?.slice(0, 200) || null,
      metadata,
      dateKey,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json({ success: true, campaignId, action });
  } catch (error: any) {
    console.error('Notice telemetry error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ success: false, error: adminCheck.error || 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');

    const db = getFirestore();

    if (campaignId) {
      const doc = await db.collection('analytics_notices').doc(campaignId).get();
      if (!doc.exists) {
        return NextResponse.json({
          success: true,
          stats: { campaignId, totalImpressions: 0, totalClicks: 0, totalDismissals: 0, totalSubmissions: 0, ctr: 0 },
        });
      }

      const data = doc.data() || {};
      const impressions = Number(data.totalImpressions) || 0;
      const clicks = Number(data.totalClicks) || 0;
      const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;

      return NextResponse.json({
        success: true,
        stats: {
          campaignId,
          totalImpressions: impressions,
          totalClicks: clicks,
          totalDismissals: Number(data.totalDismissals) || 0,
          totalSubmissions: Number(data.totalSubmissions) || 0,
          ctr,
          lastEventAt: data.lastEventAt?.toDate?.()?.toISOString() || null,
        },
      });
    }

    // List all campaigns
    const snapshot = await db.collection('analytics_notices').limit(50).get();
    const campaigns: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      const impressions = Number(data.totalImpressions) || 0;
      const clicks = Number(data.totalClicks) || 0;
      const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;

      campaigns.push({
        campaignId: doc.id,
        totalImpressions: impressions,
        totalClicks: clicks,
        totalDismissals: Number(data.totalDismissals) || 0,
        totalSubmissions: Number(data.totalSubmissions) || 0,
        ctr,
        lastEventAt: data.lastEventAt?.toDate?.()?.toISOString() || null,
      });
    });

    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    console.error('Error fetching notice analytics:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
