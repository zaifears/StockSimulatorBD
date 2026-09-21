// app/api/admin/seo/prompts/discover/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { generateDeterministicPrompts } from '@/lib/seo/promptDiscovery';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const prompts = generateDeterministicPrompts();
    return NextResponse.json({
      success: true,
      totalPrompts: prompts.length,
      prompts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
