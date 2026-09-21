// app/api/admin/seo/llm-export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { generateSeoMarkdownReport, buildSeoIntelligenceData } from '@/lib/seo/exporter';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'markdown';
  const download = searchParams.get('download') === 'true';

  try {
    if (format === 'json') {
      const data = await buildSeoIntelligenceData();
      return NextResponse.json(data);
    }

    const markdown = await generateSeoMarkdownReport();

    const headers: Record<string, string> = {
      'Content-Type': 'text/markdown; charset=utf-8',
    };

    if (download) {
      headers['Content-Disposition'] = `attachment; filename="stocksimulatorbd-seo-report-${new Date().toISOString().split('T')[0]}.md"`;
    }

    return new NextResponse(markdown, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
