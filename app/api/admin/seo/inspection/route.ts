// app/api/admin/seo/inspection/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getInspectionQueue, inspectUrl } from '@/lib/seo/inspection';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const queue = await getInspectionQueue();
    return NextResponse.json({
      success: true,
      queue,
      quota: {
        dailyLimit: 2000,
        usedToday: queue.filter((q) => {
          if (!q.lastInspectedAt) return false;
          const diff = Date.now() - new Date(q.lastInspectedAt).getTime();
          return diff < 86400000;
        }).length,
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
    const body = await req.json();
    const { path } = body;

    if (!path) {
      return NextResponse.json({ success: false, error: 'Path is required for inspection' }, { status: 400 });
    }

    const result = await inspectUrl(path);
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
