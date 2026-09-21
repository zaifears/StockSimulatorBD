// app/api/admin/seo/keywords/autocomplete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const seed = searchParams.get('seed') || 'dse';

  try {
    const googleUrl = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=BD&q=${encodeURIComponent(seed)}`;
    const res = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch suggestions' }, { status: 502 });
    }

    const json = await res.json();
    const suggestions: string[] = Array.isArray(json[1]) ? json[1] : [];

    // Classify intent for each suggestion
    const classified = suggestions.map((keyword) => {
      const lower = keyword.toLowerCase();
      let intent: 'Informational' | 'Transactional' | 'Commercial' | 'Navigational' = 'Informational';

      if (lower.includes('buy') || lower.includes('open bo') || lower.includes('recharge') || lower.includes('app') || lower.includes('simulator')) {
        intent = 'Transactional';
      } else if (lower.includes('best') || lower.includes('review') || lower.includes('compare') || lower.includes('top')) {
        intent = 'Commercial';
      } else if (lower.includes('dsebd') || lower.includes('login') || lower.includes('portal')) {
        intent = 'Navigational';
      }

      return {
        keyword,
        intent,
        hasDedicatedPage: lower.includes('simulator') || lower.includes('paper trading'),
      };
    });

    return NextResponse.json({
      success: true,
      seed,
      count: classified.length,
      suggestions: classified,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
