// app/api/auth/grant-social-bonus/route.ts
// Server-side endpoint to grant 10,000 coin welcome bonus to new social login users

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const adminAuth = getAdminAuth();
    const db = getAdminDb();
    // 🔒 AUTHENTICATION: Verify user is authenticated
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    const body = await request.json();
    const provider = body.provider || 'unknown';

    // 🔒 Rate-limit: 5 requests per user per minute to prevent flooding
    const { checkPersistentRateLimit } = await import('@/lib/utils/persistentRateLimit');
    const isRateAllowed = await checkPersistentRateLimit(`welcome-bonus:${userId}`, {
      maxRequests: 5,
      windowMs: 60_000,
    });
    if (!isRateAllowed) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please slow down.' },
        { status: 429 }
      );
    }

    const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
    const userRef = db.collection('users').doc(userId);
    const simulatorStateRef = db.doc(`artifacts/${appId}/users/${userId}/simulator/state`);
    const timestamp = new Date();

    // 🔒 ATOMIC TRANSACTION: Check user doc AND credit balance in a single atomic transaction.
    // This eliminates the TOCTOU concurrency race condition where concurrent requests could multiply bonuses.
    const result = await db.runTransaction(async (transaction) => {
      const [userDoc, stateDoc] = await Promise.all([
        transaction.get(userRef),
        transaction.get(simulatorStateRef),
      ]);

      const currentBalance = stateDoc.exists ? (stateDoc.data()?.balance || 0) : 0;

      if (userDoc.exists && userDoc.data()?.welcomeBonusGranted === true) {
        return {
          alreadyGranted: true,
          beforeBalance: currentBalance,
          newBalance: currentBalance,
        };
      }

      let beforeBalance = currentBalance;
      let newBalance = beforeBalance + 10000;

      if (stateDoc.exists) {
        transaction.update(simulatorStateRef, {
          balance: newBalance,
          lastBonusGranted: timestamp,
        });
      } else {
        // Create simulator state with 10k balance
        transaction.set(simulatorStateRef, {
          balance: 10000,
          portfolio: [],
          totalInvested: 0,
          realizedGainLoss: 0,
          createdAt: timestamp,
          createdBy: 'welcome-bonus',
          lastBonusGranted: timestamp,
        });
      }

      // Mark welcome bonus as granted on user doc INSIDE the transaction
      transaction.set(
        userRef,
        {
          welcomeBonusGranted: true,
          lastCoinUpdate: timestamp,
          lastCoinAction: 'welcome_bonus',
        },
        { merge: true }
      );

      return {
        alreadyGranted: false,
        beforeBalance,
        newBalance,
      };
    });

    if (result.alreadyGranted) {
      console.log(`ℹ️ Welcome bonus already granted for user ${userId}`);
      return NextResponse.json({
        success: true,
        message: 'Welcome bonus already granted',
        newBalance: result.newBalance,
        alreadyGranted: true,
      });
    }

    // 📝 Log the transaction
    try {
      await db.collection('coinTransactions').add({
        userId,
        amount: 10000,
        action: 'add',
        reason: 'welcome_bonus',
        timestamp,
        success: true,
        beforeBalance: result.beforeBalance,
        afterBalance: result.newBalance,
        description: `Welcome bonus (${provider})`,
        metadata: {
          userAgent: 'server-side',
          environment: process.env.NODE_ENV || 'development',
          transactionType: 'coin_addition',
          reasonCategory: 'welcome_bonus',
          isBonus: true,
          provider,
        },
      });
    } catch (logError: any) {
      console.warn('⚠️ Failed to log coin transaction:', logError.message);
    }

    console.log(`✅ Granted 10,000 welcome bonus to user ${userId} (${provider}), balance: ${result.beforeBalance} → ${result.newBalance}`);

    return NextResponse.json({
      success: true,
      message: 'Welcome bonus granted successfully',
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    console.error('❌ Grant Welcome Bonus API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
