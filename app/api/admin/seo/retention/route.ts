// app/api/admin/seo/retention/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const db = getSeoDb();
    const now = Date.now();
    const d30 = new Date(now - 30 * 86400000).toISOString();
    const d60 = new Date(now - 60 * 86400000).toISOString();
    const d90 = new Date(now - 90 * 86400000).toISOString();

    const [jobsSnap, aiSnap, psiSnap, w3cSnap] = await Promise.all([
      db.collection('seo_jobs').where('startedAt', '<', d30).count().get(),
      db.collection('ai_visibility_results').where('observedAt', '<', d60).count().get(),
      db.collection('seo_pagespeed').where('auditedAt', '<', d90).count().get(),
      db.collection('seo_w3c').where('auditedAt', '<', d90).count().get(),
    ]);

    const jobsCount = jobsSnap.data().count;
    const aiCount = aiSnap.data().count;
    const psiCount = psiSnap.data().count;
    const w3cCount = w3cSnap.data().count;

    return NextResponse.json({
      success: true,
      pendingCleanup: {
        jobsOlderThan30d: jobsCount,
        aiObservationsOlderThan60d: aiCount,
        pageSpeedAuditsOlderThan90d: psiCount,
        w3cAuditsOlderThan90d: w3cCount,
        totalEligibleForDeletion: jobsCount + aiCount + psiCount + w3cCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const db = getSeoDb();
    const now = Date.now();
    const d30 = new Date(now - 30 * 86400000).toISOString();
    const d60 = new Date(now - 60 * 86400000).toISOString();
    const d90 = new Date(now - 90 * 86400000).toISOString();

    const [jobsSnap, aiSnap, psiSnap, w3cSnap] = await Promise.all([
      db.collection('seo_jobs').where('startedAt', '<', d30).limit(50).get(),
      db.collection('ai_visibility_results').where('observedAt', '<', d60).limit(50).get(),
      db.collection('seo_pagespeed').where('auditedAt', '<', d90).limit(50).get(),
      db.collection('seo_w3c').where('auditedAt', '<', d90).limit(50).get(),
    ]);

    const batch = db.batch();
    let totalDeleted = 0;

    jobsSnap.docs.forEach((d) => {
      // Don't delete the active crawl job singleton
      if (d.id !== 'active_crawl_job') {
        batch.delete(d.ref);
        totalDeleted++;
      }
    });

    aiSnap.docs.forEach((d) => {
      batch.delete(d.ref);
      totalDeleted++;
    });

    psiSnap.docs.forEach((d) => {
      batch.delete(d.ref);
      totalDeleted++;
    });

    w3cSnap.docs.forEach((d) => {
      batch.delete(d.ref);
      totalDeleted++;
    });

    if (totalDeleted > 0) {
      await batch.commit();
    }

    // Log the retention event
    await db.collection('seo_system_logs').add({
      event: 'RETENTION_CLEANUP',
      deletedCount: totalDeleted,
      triggeredByUid: adminCheck.uid,
      executedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      message: `Cleaned up ${totalDeleted} expired documents from SEO Firestore`,
    });
  } catch (error: any) {
    console.error('Retention Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
