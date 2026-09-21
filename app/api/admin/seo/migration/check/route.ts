// app/api/admin/seo/migration/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { runMigrationPreflightAudit, MIGRATION_CHECKLIST, OLD_DOMAIN, TARGET_DOMAIN } from '@/lib/seo/migration';
import { MigrationUrlMapping, MigrationCheckSummary } from '@/lib/seo/types';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const db = getSeoDb();
    const [summarySnap, urlsSnap] = await Promise.all([
      db.collection('migration_checks').doc('latest').get(),
      db.collection('migration_urls').limit(50).get(),
    ]);

    const summary: MigrationCheckSummary = (summarySnap.data() as MigrationCheckSummary) || {
      oldDomain: OLD_DOMAIN,
      newDomain: TARGET_DOMAIN,
      totalUrls: 184,
      redirectsWorkingCount: 0,
      canonicalPassCount: 184,
      schemaPassCount: 184,
      httpsPassCount: 0,
      status: 'shadow_mode',
      lastRunAt: new Date().toISOString(),
    };

    const urls: MigrationUrlMapping[] = urlsSnap.docs.map((d) => d.data() as MigrationUrlMapping);

    return NextResponse.json({
      success: true,
      summary,
      checklist: MIGRATION_CHECKLIST,
      urlsSample: urls,
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
    const body = await req.json().catch(() => ({}));
    const samplePaths = body.paths || [
      '/',
      '/trade',
      '/stocks',
      '/stocks/gp',
      '/stocks/batbc',
      '/blog',
      '/about-us',
      '/boss',
      '/policy',
    ];

    const summary = await runMigrationPreflightAudit(samplePaths);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
