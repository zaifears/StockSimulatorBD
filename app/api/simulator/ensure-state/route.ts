// app/api/simulator/ensure-state/route.ts
// Server-side, race-free replacement for the client-side "doc not found ->
// setDoc zero state" fallback that used to live in hooks/useSimulator.ts.
//
// That client fallback fired whenever onSnapshot reported the simulator
// state doc missing, including transient false-negatives (stale cache,
// offline blips) racing against a real trade — and firestore.rules'
// create/update distinction was the only thing standing between that write
// and silently zeroing an existing user's balance and portfolio. Several
// accounts were wiped this way (see incident where trade_history showed
// real trades but simulator/state read balance:0, portfolio:[] with no
// matching history entry for the write that caused it).
//
// This route does the same "create if missing" job, but atomically: the
// existence check and the write happen inside one Admin SDK transaction, so
// there is no window between "client believes doc is missing" and "client
// writes the zero doc" for a real state to be clobbered. firestore.rules no
// longer grants the client any write on this path at all (see below) — this
// route is now the only way the zero-value doc gets created.

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Missing or invalid Authorization header' }, { status: 401 });
    }
    const token = authHeader.substring(7).trim();

    const adminAuth = getAuth();
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }
    const uid = decodedToken.uid;

    const db = getFirestore();
    const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
    const stateRef = db.doc(`artifacts/${appId}/users/${uid}/simulator/state`);
    const userRef = db.collection('users').doc(uid);

    const state = await db.runTransaction(async (transaction) => {
      const [stateDoc, userDoc] = await Promise.all([
        transaction.get(stateRef),
        transaction.get(userRef),
      ]);

      const userData = userDoc.exists ? userDoc.data() : null;
      if (!userDoc.exists || !userData?.createdAt) {
        const derivedEmail = decodedToken.email || userData?.email || null;
        const derivedName =
          userData?.name ||
          (decodedToken as any).name ||
          (derivedEmail ? String(derivedEmail).split('@')[0] : 'User');
        transaction.set(
          userRef,
          {
            name: derivedName,
            email: derivedEmail,
            displayName: userData?.displayName || (decodedToken as any).name || null,
            photoURL: userData?.photoURL || decodedToken.picture || null,
            status: userData?.status || 'Other',
            provider: userData?.provider || decodedToken.firebase?.sign_in_provider || 'email',
            accountTier: userData?.accountTier || 'Bro',
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      if (stateDoc.exists) {
        return stateDoc.data();
      }
      const initialState = { balance: 0, portfolio: [], totalInvested: 0, realizedGainLoss: 0 };
      transaction.set(stateRef, initialState);
      return initialState;
    });

    return NextResponse.json({ success: true, balance: state?.balance ?? 0 });
  } catch (error: any) {
    console.error('❌ Ensure-state API error:', error);
    return NextResponse.json({ success: false, error: 'Failed to initialize simulator state' }, { status: 500 });
  }
}
