// app/api/auth/sync-tier/route.ts
// Secure endpoint to synchronize and auto-downgrade expired user tiers to 'Bro'.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { autoDowngradeUserIfExpired } from '@/lib/serverTier';
import { getEffectiveTier } from '@/lib/tier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7).trim();

    const adminAuth = getAdminAuth();
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const uid = decodedToken.uid;
    const db = getAdminDb();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const downgraded = await autoDowngradeUserIfExpired(db, uid, userData);
    const effectiveTier = getEffectiveTier(userData);

    return NextResponse.json({
      success: true,
      downgraded,
      accountTier: effectiveTier,
    });
  } catch (error: any) {
    console.error('❌ sync-tier API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
