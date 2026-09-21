// app/api/admin/seo/crux/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { fetchCruxMetrics } from '@/lib/seo/crux';
import { absoluteUrl } from '@/lib/siteUrl';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const target = path ? absoluteUrl(path) : undefined;

  try {
    const data = await fetchCruxMetrics(target);
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
