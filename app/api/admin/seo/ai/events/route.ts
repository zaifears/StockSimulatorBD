// app/api/admin/seo/ai/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getCitationTimeline, getCitationEvents } from '@/lib/seo/citationHistory';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const [history, events] = await Promise.all([
      getCitationTimeline(),
      getCitationEvents(),
    ]);

    return NextResponse.json({
      success: true,
      ...history,
      events,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
