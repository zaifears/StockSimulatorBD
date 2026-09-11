// app/api/admin/tier/route.ts
// Server-side admin handler for Boss tier subscriptions, approvals, rejections, email search, and manual grants.

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
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

    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get('search')?.trim();
    const pendingOnly = searchParams.get('pending');

    const db = getFirestore();

    // ─────────────────────────────────────────────
    // 1. SEARCH USER BY EMAIL OR UID
    // ─────────────────────────────────────────────
    if (searchQuery) {
      // A. Try direct UID match
      const userDoc = await db.collection('users').doc(searchQuery).get();
      if (userDoc.exists) {
        return NextResponse.json({
          success: true,
          user: { id: userDoc.id, ...userDoc.data() },
        });
      }

      // B. Try matching email in Firestore users collection
      let emailSnap = await db.collection('users').where('email', '==', searchQuery).limit(5).get();
      if (emailSnap.empty) {
        emailSnap = await db.collection('users').where('email', '==', searchQuery.toLowerCase()).limit(5).get();
      }

      if (!emailSnap.empty) {
        const found = emailSnap.docs[0];
        return NextResponse.json({
          success: true,
          user: { id: found.id, ...found.data() },
        });
      }

      // C. Fallback: Lookup in Firebase Admin Auth by email
      try {
        const authUser = await getAuth().getUserByEmail(searchQuery);
        if (authUser) {
          const docSnap = await db.collection('users').doc(authUser.uid).get();
          const docData = docSnap.exists ? docSnap.data() : null;
          return NextResponse.json({
            success: true,
            user: {
              id: authUser.uid,
              name: docData?.name || authUser.displayName || authUser.email?.split('@')[0] || 'User',
              email: authUser.email,
              displayName: authUser.displayName,
              accountTier: docData?.accountTier || 'Bro',
              bossUntil: docData?.bossUntil || 0,
              createdAt: docData?.createdAt || authUser.metadata.creationTime,
              provider: authUser.providerData[0]?.providerId || 'email',
              ...docData,
            },
          });
        }
      } catch {
        // Auth user not found
      }

      return NextResponse.json(
        { success: false, error: `No registered user found with email or UID: "${searchQuery}"` },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────
    // 2. FETCH PENDING REQUESTS
    // ─────────────────────────────────────────────
    if (pendingOnly === 'true') {
      const pendingSnap = await db
        .collection('boss_requests')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get();

      const requests = pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ success: true, requests });
    }

    // ─────────────────────────────────────────────
    // 3. STATS SUMMARY
    // ─────────────────────────────────────────────
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
    console.error('❌ Admin tier GET error:', error);
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
    const { action, requestId, userId, email, durationDays, rejectionReason } = body;

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
    // 2. APPROVE REQUEST (1-CLICK DIRECT)
    // ─────────────────────────────────────────────
    if (action === 'approve') {
      if (!requestId || !userId) {
        return NextResponse.json({ success: false, error: 'Missing requestId or userId' }, { status: 400 });
      }

      const requestRef = db.collection('boss_requests').doc(requestId);
      const userRef = db.collection('users').doc(userId);

      let calculatedUntil = 0;
      let targetUserName = '';

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
        targetUserName = userData?.name || requestData?.userName || 'User';

        // If user is already active Boss, extend from their current expiry; otherwise start from now
        const now = Date.now();
        const currentUntil = (userData?.bossUntil && userData.bossUntil > now) ? userData.bossUntil : now;
        const newBossUntil = currentUntil + (days * 86400 * 1000);
        calculatedUntil = newBossUntil;

        // Update user to Boss (Server-side authoritative write)
        transaction.set(
          userRef,
          {
            accountTier: 'Boss',
            bossUntil: newBossUntil,
            bossSince: userData?.bossSince || FieldValue.serverTimestamp(),
            lastBossPlan: requestData?.planName || (days >= 180 ? 'Semester Boss' : 'Monthly Boss'),
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

      console.log(`✅ Admin ${adminCheck.uid} approved Boss tier for user ${userId} (${targetUserName}, request ${requestId})`);
      return NextResponse.json({
        success: true,
        message: `Boss tier activated successfully for ${targetUserName}!`,
        bossUntil: calculatedUntil,
      });
    }

    // ─────────────────────────────────────────────
    // 3. MANUAL DIRECT GRANT (BY USERID OR EMAIL)
    // ─────────────────────────────────────────────
    if (action === 'manual_grant') {
      let targetUid = userId?.trim();
      const targetEmail = (email || body.userEmail)?.trim();

      // If no UID provided, resolve via email
      if (!targetUid && targetEmail) {
        let emailSnap = await db.collection('users').where('email', '==', targetEmail).limit(1).get();
        if (emailSnap.empty) {
          emailSnap = await db.collection('users').where('email', '==', targetEmail.toLowerCase()).limit(1).get();
        }

        if (!emailSnap.empty) {
          targetUid = emailSnap.docs[0].id;
        } else {
          try {
            const authUser = await getAuth().getUserByEmail(targetEmail);
            targetUid = authUser.uid;
          } catch {
            return NextResponse.json(
              { success: false, error: `No registered user found with email: ${targetEmail}` },
              { status: 404 }
            );
          }
        }
      }

      if (!targetUid) {
        return NextResponse.json({ success: false, error: 'Missing userId or email to grant Boss tier' }, { status: 400 });
      }

      const days = typeof durationDays === 'number' && durationDays > 0 ? durationDays : 31;
      const userRef = db.collection('users').doc(targetUid);
      const userDoc = await userRef.get();

      const userData = userDoc.exists ? userDoc.data() : null;
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

      console.log(`👑 Admin ${adminCheck.uid} manually granted Boss tier to ${targetUid} (${userData?.email || targetEmail || 'no-email'}) for ${days} days`);
      return NextResponse.json({
        success: true,
        message: `Boss tier granted to ${userData?.name || targetEmail || targetUid} for ${days} days!`,
        userId: targetUid,
        bossUntil: newBossUntil,
      });
    }

    // ─────────────────────────────────────────────
    // 4. REVOKE BOSS TIER (REVERT TO BRO)
    // ─────────────────────────────────────────────
    if (action === 'revoke') {
      let targetUid = userId?.trim();
      const targetEmail = (email || body.userEmail)?.trim();

      if (!targetUid && targetEmail) {
        let emailSnap = await db.collection('users').where('email', '==', targetEmail).limit(1).get();
        if (emailSnap.empty) {
          emailSnap = await db.collection('users').where('email', '==', targetEmail.toLowerCase()).limit(1).get();
        }
        if (!emailSnap.empty) {
          targetUid = emailSnap.docs[0].id;
        } else {
          try {
            const authUser = await getAuth().getUserByEmail(targetEmail);
            targetUid = authUser.uid;
          } catch {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
          }
        }
      }

      if (!targetUid) {
        return NextResponse.json({ success: false, error: 'Missing userId or email' }, { status: 400 });
      }

      const userRef = db.collection('users').doc(targetUid);
      await userRef.set(
        {
          accountTier: 'Bro',
          bossUntil: 0,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`🛡️ Admin ${adminCheck.uid} revoked Boss tier from ${targetUid}`);
      return NextResponse.json({ success: true, message: 'User reverted to Bro tier' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('❌ Admin tier action error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Action failed' }, { status: 500 });
  }
}
