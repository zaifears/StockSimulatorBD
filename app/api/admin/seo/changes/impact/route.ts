// app/api/admin/seo/changes/impact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getChangeImpacts, recordChangeImpact } from '@/lib/seo/changeImpact';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const impacts = await getChangeImpacts();
    return NextResponse.json({
      success: true,
      impacts,
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
    const { changeId, path, description, beforeMetrics } = body;

    if (!changeId || !path) {
      return NextResponse.json({ success: false, error: 'changeId and path are required' }, { status: 400 });
    }

    const record = await recordChangeImpact(changeId, path, description || 'SEO Update', beforeMetrics);
    return NextResponse.json({
      success: true,
      record,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
