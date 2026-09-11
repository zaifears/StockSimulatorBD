// app/api/admin/tier/route.ts
// Server-side admin handler for Boss tier subscriptions, approvals, rejections, and manual grants.

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ success: false, error: adminCheck.error }, { status: 401 });
    }

    const db = getFirestore();

    const [pendingSnap, approvedSnap, rejectedSnap, activeBossSnap] = await Promise.all([
      db.collection('boss_requests').where('status', '==', 'pending').count().get(),
      db.collection('boss_requests').where('status', '==', 'approved').count().get(),
      db.collection('boss_requests').where('status', '==', 'rejected').count().get(),
      db.collection('users').where('accountTier', '==', 'Boss').count().get(),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        pendingCount: pendingSnap.data().count,
        approvedCount: approvedSnap.data().count,
        rejectedCount: rejectedSnap.data().count,
        activeBossCount: activeBossSnap.data().count,
      },
    });
  } catch (error: any) {
    console.error('❌ Admin tier stats error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ success: false, error: adminCheck.error }, { status: 401 });
    }

    const body = await req.json();
    const { action, requestId, userId, durationDays, rejectionReason } = body;

    const db = getFirestore();

    // ─────────────────────────────────────────────
    // 1. REJECT REQUEST
    // ─────────────────────────────────────────────
    if (action === 'reject') {
      if (!requestId) {
        return NextResponse.json({ success: false, error: 'Missing requestId' }, { status: 400 });
      }

      const requestRef = db.collection('boss_requests').doc(requestId);
      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
      }

      if (requestDoc.data()?.status !== 'pending') {
        return NextResponse.json({ success: false, error: 'Request is already processed' }, { status: 409 });
      }

      await requestRef.update({
        status: 'rejected',
        processedAt: FieldValue.serverTimestamp(),
        processedBy: adminCheck.uid,
        rejectionReason: rejectionReason || 'Payment verification failed',
      });

      return NextResponse.json({ success: true, message: 'Boss request rejected' });
    }

    // ─────────────────────────────────────────────
    // 2. APPROVE REQUEST
    // ─────────────────────────────────────────────
    if (action === 'approve') {
      if (!requestId || !userId) {
        return NextResponse.json({ success: false, error: 'Missing requestId or userId' }, { status: 400 });
      }

      const requestRef = db.collection('boss_requests').doc(requestId);
      const userRef = db.collection('users').doc(userId);

      await db.runTransaction(async (transaction) => {
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists) throw new Error('Request not found');

        const requestData = requestDoc.data();
        if (requestData?.status !== 'pending') {
          throw new Error(`Request is already ${requestData?.status}`);
        }

        const days = typeof durationDays === 'number' && durationDays > 0 ? durationDays : (requestData?.durationDays || 31);
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.exists ? userDoc.data() : null;

        // If user is already active Boss, extend from their current expiry; otherwise start from now
        const now = Date.now();
        const currentUntil = (userData?.bossUntil && userData.bossUntil > now) ? userData.bossUntil : now;
        const newBossUntil = currentUntil + (days * 86400 * 1000);

        // Update user to Boss
        transaction.set(
          userRef,
          {
            accountTier: 'Boss',
            bossUntil: newBossUntil,
            bossSince: userData?.bossSince || FieldValue.serverTimestamp(),
            lastBossPlan: requestData?.planName || 'Monthly Boss',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        // Mark request approved
        transaction.update(requestRef, {
          status: 'approved',
          processedAt: FieldValue.serverTimestamp(),
          processedBy: adminCheck.uid,
          grantedUntil: newBossUntil,
        });
      });

      console.log(`✅ Admin ${adminCheck.uid} approved Boss tier for user ${userId} (request ${requestId})`);
      return NextResponse.json({ success: true, message: 'Boss tier activated successfully' });
    }

    // ─────────────────────────────────────────────
    // 3. MANUAL DIRECT GRANT
    // ─────────────────────────────────────────────
    if (action === 'manual_grant') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
      }

      const days = typeof durationDays === 'number' && durationDays > 0 ? durationDays : 31;
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return NextResponse.json({ success: false, error: 'User document not found' }, { status: 404 });
      }

      const userData = userDoc.data();
      const now = Date.now();
      const currentUntil = (userData?.bossUntil && userData.bossUntil > now) ? userData.bossUntil : now;
      const newBossUntil = currentUntil + (days * 86400 * 1000);

      await userRef.set(
        {
          accountTier: 'Boss',
          bossUntil: newBossUntil,
          bossSince: userData?.bossSince || FieldValue.serverTimestamp(),
          lastBossPlan: `Admin Manual Grant (${days} Days)`,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`👑 Admin ${adminCheck.uid} manually granted Boss tier to ${userId} for ${days} days`);
      return NextResponse.json({
        success: true,
        message: `Boss tier granted to user for ${days} days`,
        bossUntil: newBossUntil,
      });
    }

    // ─────────────────────────────────────────────
    // 4. REVOKE BOSS TIER (REVERT TO BRO)
    // ─────────────────────────────────────────────
    if (action === 'revoke') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
      }

      const userRef = db.collection('users').doc(userId);
      await userRef.set(
        {
          accountTier: 'Bro',
          bossUntil: 0,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`🛡️ Admin ${adminCheck.uid} revoked Boss tier from ${userId}`);
      return NextResponse.json({ success: true, message: 'User reverted to Bro tier' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('❌ Admin tier action error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Action failed' }, { status: 500 });
  }
}
