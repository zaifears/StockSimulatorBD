import { NextRequest, NextResponse } from 'next/server';
import { searchCompanies } from '@/lib/dseCompanyNames';

export const runtime = 'nodejs';

/**
 * GET /api/companies/search?q=[query]&limit=[number]
 * Fast, edge-cacheable company name & ticker search for Dhaka Stock Exchange instruments.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);

  if (!q) {
    return NextResponse.json(
      { ok: true, count: 0, results: [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  }

  const results = searchCompanies(q, limit);

  return NextResponse.json(
    {
      ok: true,
      count: results.length,
      results,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
