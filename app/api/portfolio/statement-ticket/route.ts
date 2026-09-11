// app/api/portfolio/statement-ticket/route.ts
// Authoritative server-side verification and cooldown ticket for PDF Statement generation
// 🔒 Anti-Tamper Security: Even with DevTools / console access, non-Boss users cannot generate statements

import { NextRequest, NextResponse } from 'next/server';
import '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { formatDhakaClock } from '@/lib/utils/dhakaTime';

const COOLDOWN_SECONDS = 120; // 120 seconds (2 minutes) rate-limit blocker

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (authErr: any) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid authentication session' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    const db = getFirestore();
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User record not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data() || {};

    // 🔒 AUTHORITATIVE TIER VERIFICATION
    // Inspects accountTier and bossUntil directly in Firestore via Admin SDK
    const nowMs = Date.now();
    const bossUntilMs = userData.bossUntil ? (typeof userData.bossUntil.toMillis === 'function' ? userData.bossUntil.toMillis() : Number(userData.bossUntil)) : 0;
    const isBoss = userData.accountTier === 'Boss' || bossUntilMs > nowMs;

    if (!isBoss) {
      return NextResponse.json(
        {
          success: false,
          error: 'Boss Tier required to download portfolio statements',
          isBoss: false,
        },
        { status: 403 }
      );
    }

    // 🔒 120-SECOND ANTI-ABUSE COOLDOWN BLOCKER (Server Enforced)
    const lastExportAtMs = userData.lastStatementExportAt ? (typeof userData.lastStatementExportAt.toMillis === 'function' ? userData.lastStatementExportAt.toMillis() : Number(userData.lastStatementExportAt)) : 0;
    const timeSinceLast = (nowMs - lastExportAtMs) / 1000;

    if (timeSinceLast < COOLDOWN_SECONDS) {
      const remaining = Math.ceil(COOLDOWN_SECONDS - timeSinceLast);
      return NextResponse.json(
        {
          success: false,
          error: 'Please Wait',
          cooldownRemaining: remaining,
        },
        { status: 429 }
      );
    }

    // Update cooldown timestamp in user document
    await userDocRef.update({
      lastStatementExportAt: FieldValue.serverTimestamp(),
    });

    // Derive institutional-style IDs
    const ticketId = `SSBD-STMT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const clientCode = `6${userId.replace(/[^0-9]/g, '').padEnd(4, '8').slice(0, 4)}`;
    const numericPart = userId.replace(/[^0-9]/g, '').padEnd(10, '7').slice(0, 10);
    const boId = `12039800${numericPart.slice(0, 8)}`;
    const userName = userData.displayName || decodedToken.name || userData.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'Valued Trader');
    const userEmail = decodedToken.email || userData.email || 'N/A';

    return NextResponse.json({
      success: true,
      ticket: {
        ticketId,
        clientCode,
        boId,
        userName: userName.toUpperCase(),
        userEmail,
        timestamp: new Date().toISOString(),
        dhakaTimeStr: `${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' })} ${formatDhakaClock()}`,
      },
    });
  } catch (error: any) {
    console.error('❌ Statement ticket error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
