// app/api/admin/seo/entity-sources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { auditEntityConsistency } from '@/lib/seo/entityAudit';
import { getFinancialSourceGraph } from '@/lib/seo/sourceGraph';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const entityChecks = auditEntityConsistency();
    const sourceGraph = getFinancialSourceGraph();

    return NextResponse.json({
      success: true,
      entityChecks,
      sourceGraph,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
