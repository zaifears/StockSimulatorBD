// app/api/admin/seo/sitemaps/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { auditSitemapDiscrepancies } from '@/lib/seo/sitemaps';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const report = await auditSitemapDiscrepancies();
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
