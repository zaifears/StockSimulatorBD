// app/api/admin/auth-methods/route.ts
// Sign-in button usage for /admin: today, last 7 days and last 30 days, from
// the per-day docs written by app/api/auth/method-event.
//
// Only called after the admin clicks "Turn on Analytics", so a normal /admin
// visit costs nothing. Each call reads the 30 day docs, then deletes any day
// older than 30 days (and the retired `all_time` doc), so storage never grows.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getLastNDhakaDateKeys } from '@/lib/utils/dhakaTime';
import { AUTH_METHODS, type AuthMethod, type AuthMethodCounts } from '@/lib/authMethods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RETENTION_DAYS = 30;

type Totals = Record<AuthMethod, AuthMethodCounts>;

const emptyTotals = (): Totals =>
  Object.fromEntries(AUTH_METHODS.map((m) => [m, { clicks: 0, signIns: 0, signUps: 0 }])) as Totals;

function addInto(target: Totals, methods: any) {
  if (!methods || typeof methods !== 'object') return;
  for (const m of AUTH_METHODS) {
    const c = methods[m];
    if (!c) continue;
    target[m].clicks += Number(c.clicks) || 0;
    target[m].signIns += Number(c.signIns) || 0;
    target[m].signUps += Number(c.signUps) || 0;
  }
}

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ success: false, error: adminCheck.error }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const col = db.collection('auth_method_stats');
    const dayKeys = getLastNDhakaDateKeys(RETENTION_DAYS); // oldest → today
    const snaps = await db.getAll(...dayKeys.map((k) => col.doc(`day_${k}`)));

    const today = emptyTotals();
    const last7 = emptyTotals();
    const last30 = emptyTotals();
    snaps.forEach((snap, i) => {
      const methods = snap.data()?.methods;
      const daysAgo = dayKeys.length - 1 - i;
      addInto(last30, methods);
      if (daysAgo < 7) addInto(last7, methods);
      if (daysAgo === 0) addInto(today, methods);
    });

    // Retention: drop days that fell out of the 30-day window. The query only
    // touches the expired docs (normally one a day), so it stays cheap.
    try {
      const expired = await col.where('date', '<', dayKeys[0]).limit(100).get();
      const batch = db.batch();
      expired.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(col.doc('all_time')); // retired in favour of per-day docs; no-op if absent
      await batch.commit();
    } catch (cleanupErr) {
      console.warn('auth-methods retention cleanup failed:', cleanupErr);
    }

    return NextResponse.json({ success: true, today, last7, last30 });
  } catch (error) {
    console.error('admin auth-methods error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load sign-in stats' }, { status: 500 });
  }
}
