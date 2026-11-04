// app/api/auth/method-event/route.ts
// Counts which sign-in button people use. Two events:
//   click   — a sign-in attempt started (no auth; best-effort, IP rate-limited)
//   success — a sign-in completed (Bearer ID token required; verified against
//             the token's real provider and counted once per sign-in session)
// Totals live in server-only Firestore docs `auth_method_stats/day_YYYY-MM-DD`
// (the rules' catch-all denies clients), kept 30 days: app/api/admin/auth-methods
// deletes older days when /admin's analytics is turned on.

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { getClientIP } from '@/lib/apiUtils';
import { getDhakaDateKey } from '@/lib/utils/dhakaTime';
import { isAuthMethod, methodFromProvider, PROVIDERS_FOR_METHOD, type AuthMethod } from '@/lib/authMethods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A success is only counted if the Firebase sign-in itself happened recently,
// so replaying an old token can't inflate the numbers.
const FRESH_SIGN_IN_MS = 15 * 60 * 1000;
// "New account" = the Firebase account was created around this sign-in.
const NEW_ACCOUNT_MS = 10 * 60 * 1000;

const noContent = () => new NextResponse(null, { status: 204 });

async function increment(method: AuthMethod, fields: Partial<Record<'clicks' | 'signIns' | 'signUps', number>>) {
  const db = getAdminDb();
  const counts: Record<string, FieldValue> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v) counts[k] = FieldValue.increment(v);
  }
  const payload = { methods: { [method]: counts }, updatedAt: FieldValue.serverTimestamp() };
  const today = getDhakaDateKey();
  await db.collection('auth_method_stats').doc(`day_${today}`).set({ ...payload, date: today }, { merge: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const event = body?.event;
    const claimed = body?.method;

    if (event === 'click') {
      if (!isAuthMethod(claimed)) return NextResponse.json({ error: 'Unknown method' }, { status: 400 });
      const { checkPersistentRateLimit } = await import('@/lib/utils/persistentRateLimit');
      // Generous: Bangladeshi carriers put many real users behind one IP.
      const allowed = await checkPersistentRateLimit(`auth-click:${getClientIP(req)}`, {
        maxRequests: 40,
        windowMs: 10 * 60 * 1000,
      });
      if (allowed) await increment(claimed, { clicks: 1 });
      return noContent();
    }

    if (event !== 'success') return NextResponse.json({ error: 'Unknown event' }, { status: 400 });

    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminAuth = getAdminAuth();
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(authHeader.substring(7).trim());
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const authTimeMs = (decoded.auth_time || 0) * 1000;
    if (!authTimeMs || Date.now() - authTimeMs > FRESH_SIGN_IN_MS) return noContent();

    // Trust the client's button only if it matches the real provider.
    const provider = decoded.firebase?.sign_in_provider;
    const method: AuthMethod | null =
      isAuthMethod(claimed) && provider && PROVIDERS_FOR_METHOD[claimed].includes(provider)
        ? claimed
        : methodFromProvider(provider);
    if (!method) return noContent();

    // Count each sign-in session once, even if the client reports it twice.
    const db = getAdminDb();
    const seenRef = db.collection('auth_method_seen').doc(decoded.uid);
    const firstReport = await db.runTransaction(async (tx) => {
      const seen = await tx.get(seenRef);
      if (seen.exists && seen.data()?.authTime === decoded.auth_time) return false;
      tx.set(seenRef, { authTime: decoded.auth_time, method, at: FieldValue.serverTimestamp() });
      return true;
    });
    if (!firstReport) return noContent();

    const user = await adminAuth.getUser(decoded.uid);
    const createdMs = Date.parse(user.metadata.creationTime || '');
    const isNewAccount = Number.isFinite(createdMs) && Math.abs(authTimeMs - createdMs) < NEW_ACCOUNT_MS;

    await increment(method, { signIns: 1, signUps: isNewAccount ? 1 : 0 });
    return noContent();
  } catch (error) {
    // Analytics must never break sign-in; log and move on.
    console.error('auth method-event error:', error);
    return noContent();
  }
}
