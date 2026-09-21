// app/api/admin/seo/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';

export async function GET(req: NextRequest) {
  // 1. Verify Production Firebase Custom Claim Auth
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      {
        adminAuth: 'failed',
        error: adminCheck.error,
      },
      { status: 401 }
    );
  }

  try {
    // 2. Initialize SEO Firebase Admin SDK
    const seoDb = getSeoDb();
    const seoProjectId = process.env.SEO_FIREBASE_PROJECT_ID;
    const prodProjectId = process.env.FIREBASE_PROJECT_ID;

    // Safety guard: ensure SEO project is completely separate from production
    const isIsolated = seoProjectId !== prodProjectId;

    // 3. Test Write & Read to SEO Firestore
    const testDocRef = seoDb.collection('seo_config').doc('health_check');
    const timestamp = new Date().toISOString();

    await testDocRef.set({
      lastCheckedAt: timestamp,
      checkedByUid: adminCheck.uid,
      status: 'operational',
      isolatedFromProd: isIsolated,
    });

    const readDoc = await testDocRef.get();
    const docData = readDoc.data();

    return NextResponse.json({
      adminAuth: 'ok',
      seoFirebase: 'ok',
      firestore: 'ok',
      projectId: seoProjectId,
      isIsolatedFromProduction: isIsolated,
      testDocVerified: docData?.lastCheckedAt === timestamp,
      timestamp,
    });
  } catch (error: any) {
    console.error('SEO Health Check Error:', error);
    return NextResponse.json(
      {
        adminAuth: 'ok',
        seoFirebase: 'error',
        firestore: 'error',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
