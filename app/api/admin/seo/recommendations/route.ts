// app/api/admin/seo/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { generateSeoOpportunities } from '@/lib/seo/opportunities';
import { SeoOpportunity } from '@/lib/seo/types';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status') || 'all';

  try {
    const db = getSeoDb();
    let queryRef: any = db.collection('seo_recommendations');

    if (statusFilter !== 'all') {
      queryRef = queryRef.where('status', '==', statusFilter);
    }

    const snap = await queryRef.get();
    const recommendations: SeoOpportunity[] = snap.docs.map((d: any) => d.data() as SeoOpportunity);

    return NextResponse.json({
      success: true,
      count: recommendations.length,
      recommendations,
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
    const body = await req.json();
    const { action, id } = body;
    const db = getSeoDb();

    if (action === 'generate') {
      const generated = await generateSeoOpportunities();
      return NextResponse.json({
        success: true,
        count: generated.length,
        recommendations: generated,
      });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing recommendation id' }, { status: 400 });
    }

    if (action === 'approve') {
      await db.collection('seo_recommendations').doc(id).update({
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: adminCheck.uid,
      });
      return NextResponse.json({ success: true, id, status: 'approved' });
    }

    if (action === 'dismiss') {
      await db.collection('seo_recommendations').doc(id).update({
        status: 'dismissed',
        dismissedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, id, status: 'dismissed' });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
