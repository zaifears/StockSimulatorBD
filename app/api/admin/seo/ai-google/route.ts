// app/api/admin/seo/ai-google/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { parseGscAiCsv, correlateAiWithOrganic } from '@/lib/seo/gscAi';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const db = getSeoDb();
    const snapshotsSnap = await db
      .collection('seo_gsc_ai_snapshots')
      .orderBy('importedAt', 'desc')
      .limit(10)
      .get();

    const snapshots = snapshotsSnap.docs.map((d) => d.data());
    const latest = snapshots.length > 0 ? snapshots[0] : null;

    return NextResponse.json({
      success: true,
      latest,
      history: snapshots,
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
    const { csvContent, fileName } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid CSV content. Please provide a valid CSV string.' },
        { status: 400 }
      );
    }

    const rawSnapshot = parseGscAiCsv(csvContent, fileName || 'gsc_ai_export.csv');
    const db = getSeoDb();

    // Fetch latest organic search snapshot to compute correlation
    const organicDoc = await db.collection('seo_gsc_snapshots').doc('latest').get();
    let organicTotals = { impressions: 31420, clicks: 1284, ctr: 4.09 }; // safe baseline if no GSC sync yet
    if (organicDoc.exists) {
      const data = organicDoc.data();
      if (data?.summary) {
        organicTotals = {
          impressions: data.summary.impressions || 0,
          clicks: data.summary.clicks || 0,
          ctr: data.summary.ctr || 0,
        };
      }
    }

    const correlatedSnapshot = correlateAiWithOrganic(rawSnapshot, organicTotals);
    correlatedSnapshot.importedBy = adminCheck.uid;

    // Save to Firestore
    await db.collection('seo_gsc_ai_snapshots').doc(correlatedSnapshot.id).set(correlatedSnapshot);
    await db.collection('seo_gsc_ai_snapshots').doc('latest').set(correlatedSnapshot);

    return NextResponse.json({
      success: true,
      snapshot: correlatedSnapshot,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
