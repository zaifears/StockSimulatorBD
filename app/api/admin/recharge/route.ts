// app/api/admin/recharge/route.ts
// Server-side admin recharge approval/rejection with atomic Firestore operations

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';

// Ensure Firebase Admin is initialized with full credentials
import '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Fixed BDT → coin exchange rate, mirrored from the client's conversion in
// app/coins/page.tsx (PRICE_PER_10K_COINS / COINS_PER_10_BDT). This is the
// single source of truth for how many coins a recharge is worth — see the
// comment inside the transaction below for why the credited amount is
// recomputed from this rate instead of trusted from client input.
const PRICE_PER_10K_COINS = 20; // 20 BDT = 10,000 coins (500 coins per taka)
const COINS_PER_10_BDT = 10000;

function coinsForAmount(amountBdt: number): number {
  return Math.floor(amountBdt / PRICE_PER_10K_COINS) * COINS_PER_10_BDT;
}

export async function POST(req: NextRequest) {
  try {
    // 🔒 Verify admin access via Firebase custom claims
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, requestId, userId, coins, userName, rejectionReason } = body;

    if (!action || !requestId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: action, requestId' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const requestRef = db.collection('recharge_requests').doc(requestId);

    // ─────────────────────────────────────────────
    // REJECT
    // ─────────────────────────────────────────────
    if (action === 'reject') {
      // Verify request exists and is still pending
      const requestDoc = await requestRef.get();
      if (!requestDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Recharge request not found' },
          { status: 404 }
        );
      }

      const requestData = requestDoc.data();
      if (requestData?.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: `Request is already ${requestData?.status}` },
          { status: 409 }
        );
      }

      await requestRef.update({
        status: 'rejected',
        processedAt: FieldValue.serverTimestamp(),
        processedBy: adminCheck.uid,
        rejectionReason: rejectionReason || 'No reason provided',
      });

      return NextResponse.json({
        success: true,
        message: `Request from ${userName || 'user'} rejected`,
      });
    }

    // ─────────────────────────────────────────────
    // APPROVE — Atomic transaction
    // ─────────────────────────────────────────────
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Cap maximum coins per request (safety valve — mirrors the max BDT
    // amount firestore.rules allows on recharge_requests.amount)
    const MAX_COINS_PER_REQUEST = 2_500_000; // 2.5M coins = 5,000 BDT at 500 coins/taka

    const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
    const simulatorStateRef = db.doc(`artifacts/${appId}/users/${userId}/simulator/state`);
    const userDocRef = db.collection('users').doc(userId);

    let creditedCoins = 0;
    let bonusCoins = 0;
    let isBossUser = false;

    // Run as a Firestore transaction — either both writes succeed or neither does
    await db.runTransaction(async (transaction) => {
      // 1. Read the request doc inside the transaction (ensures consistency)
      const requestDoc = await transaction.get(requestRef);
      if (!requestDoc.exists) {
        throw new Error('Recharge request not found');
      }

      const requestData = requestDoc.data();
      if (requestData?.status !== 'pending') {
        throw new Error(`Request is already ${requestData?.status}. Cannot approve.`);
      }

      // 🔒 SECURITY: never trust a client-supplied coin amount for the actual
      // credit. Recompute it server-side from the request's own `amount`
      // (BDT) field — the only value firestore.rules validates on create
      // (0 < amount <= 5000). Requests are created directly from the client
      // via the Firestore SDK (app/coins/page.tsx), and the rules never
      // checked that `coins` matched `amount`, so a user could otherwise
      // write an inflated `coins` field onto their own pending request and
      // have it paid out at face value here.
      const requestAmount = requestData?.amount;
      if (typeof requestAmount !== 'number' || !Number.isFinite(requestAmount) || requestAmount <= 0 || requestAmount > 5000) {
        throw new Error('Recharge request has an invalid amount and cannot be approved');
      }
      const baseCoins = coinsForAmount(requestAmount);
      if (baseCoins <= 0 || baseCoins > MAX_COINS_PER_REQUEST) {
        throw new Error('Computed coin amount is out of the allowed range');
      }

      // 👑 Check if user is on active Boss tier for +10% coin bonus
      const userDoc = await transaction.get(userDocRef);
      const userData = userDoc.exists ? userDoc.data() : null;
      const now = Date.now();
      isBossUser = userData?.accountTier === 'Boss' || (typeof userData?.bossUntil === 'number' && userData.bossUntil > now);

      if (isBossUser) {
        bonusCoins = Math.round(baseCoins * 0.10);
        creditedCoins = baseCoins + bonusCoins;
      } else {
        creditedCoins = baseCoins;
      }

      if (typeof coins === 'number' && coins !== baseCoins) {
        console.warn(
          `⚠️ Recharge request ${requestId}: client-submitted coins (${coins}) did not match base amount-derived coins (${baseCoins}). Crediting the authoritative value.`
        );
      }

      // 2. Read the simulator state (may not exist yet for new users)
      const stateDoc = await transaction.get(simulatorStateRef);

      // 3. Credit coins to simulator balance
      if (stateDoc.exists) {
        transaction.update(simulatorStateRef, {
          balance: FieldValue.increment(creditedCoins),
        });
      } else {
        // User has no simulator state yet — create with recharge amount as initial balance
        transaction.set(simulatorStateRef, {
          balance: creditedCoins,
          createdAt: FieldValue.serverTimestamp(),
          createdBy: 'admin-recharge',
        });
      }

      // 4. Mark request as approved
      transaction.update(requestRef, {
        status: 'approved',
        processedAt: FieldValue.serverTimestamp(),
        processedBy: adminCheck.uid,
        creditedCoins,
        baseCoins,
        bonusCoins,
        isBossUser,
      });
    });

    console.log(
      `✅ Admin ${adminCheck.uid} approved recharge: ${creditedCoins.toLocaleString()} coins (bonus: ${bonusCoins.toLocaleString()}) → user ${userId} (request ${requestId})`
    );

    return NextResponse.json({
      success: true,
      message: isBossUser
        ? `Approved! ${creditedCoins.toLocaleString()} coins (including +10% Boss bonus: +${bonusCoins.toLocaleString()}) credited to ${userName || userId}`
        : `Approved! ${creditedCoins.toLocaleString()} coins credited to ${userName || userId}`,
    });
  } catch (error: any) {
    console.error('❌ Admin recharge error:', error);

    // Return specific error for known transaction failures
    if (error.message?.includes('already')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process recharge request' },
      { status: 500 }
    );
  }
}
