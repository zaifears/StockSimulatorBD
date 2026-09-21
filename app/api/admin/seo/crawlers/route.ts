// app/api/admin/seo/crawlers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getCrawlerSummaries, logCrawlerRequest } from '@/lib/seo/crawlers';
import { auditRobotsConfig } from '@/lib/seo/robotsAudit';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const [summaries, robotsAudit] = await Promise.all([
      getCrawlerSummaries(),
      auditRobotsConfig(),
    ]);

    return NextResponse.json({
      success: true,
      summaries,
      robotsAudit,
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
    const userAgent = req.headers.get('user-agent') || '';
    const { pathname } = new URL(req.url);
    await logCrawlerRequest(userAgent, pathname, 200, true);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
