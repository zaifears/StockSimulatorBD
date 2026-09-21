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

    // 🔒 DEDUP CHECK 1: welcomeBonusGranted flag on user doc
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const userData = (userSnap.data() || {}) as Record<string, any>;
      if (userData.welcomeBonusGranted === true) {
        const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
        const stateRef = db.doc(`artifacts/${appId}/users/${userId}/simulator/state`);
        const stateSnap = await stateRef.get();
        const currentBalance = stateSnap.exists ? (stateSnap.data()?.balance || 0) : 0;

        console.log(`ℹ️ Welcome bonus already granted for user ${userId}`);
        return NextResponse.json({
          success: true,
          message: 'Welcome bonus already granted',
          newBalance: currentBalance,
          alreadyGranted: true,
        });
      }
    }

    // 🔒 DEDUP CHECK 2: coinTransactions collection
    const previousBonus = await db.collection('coinTransactions')
      .where('userId', '==', userId)
      .where('reason', '==', 'welcome_bonus')
      .where('success', '==', true)
      .limit(1)
      .get();

    if (!previousBonus.empty) {
      console.log(`ℹ️ Welcome bonus transaction exists for user ${userId}`);
      await userRef.set({ welcomeBonusGranted: true }, { merge: true });

      const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
      const stateRef = db.doc(`artifacts/${appId}/users/${userId}/simulator/state`);
      const stateSnap = await stateRef.get();
      const currentBalance = stateSnap.exists ? (stateSnap.data()?.balance || 0) : 0;

      return NextResponse.json({
        success: true,
        message: 'Welcome bonus already granted',
        newBalance: currentBalance,
        alreadyGranted: true,
      });
    }

    // 💎 Grant 10,000 to simulator/state.balance (the REAL user balance)
    const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
    const simulatorStateRef = db.doc(`artifacts/${appId}/users/${userId}/simulator/state`);
    const timestamp = new Date();

    const result = await db.runTransaction(async (transaction) => {
      const stateDoc = await transaction.get(simulatorStateRef);
      let beforeBalance = 0;
      let newBalance = 10000;

      if (stateDoc.exists) {
        beforeBalance = stateDoc.data()?.balance || 0;
        newBalance = beforeBalance + 10000;
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

      return { beforeBalance, newBalance };
    });

    // Mark welcome bonus as granted on user doc
    await userRef.set({
      welcomeBonusGranted: true,
      lastCoinUpdate: timestamp,
      lastCoinAction: 'welcome_bonus',
    }, { merge: true });

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
