import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getFundamentalsUrl(symbol: string): string {
  const envUrl = process.env.PYTHON_API_URL?.trim();
  const base = envUrl
    ? envUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '')
    : 'https://dse.shahoriar.bd';

  return `${base}/api/fundamentals/${encodeURIComponent(symbol.toUpperCase())}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  const url = getFundamentalsUrl(symbol);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StockSimulatorBD-Web/1.0' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
        },
      });
    }

    if (res.status === 404) {
      return NextResponse.json({ error: `Fundamentals for ${symbol.toUpperCase()} not found` }, { status: 404 });
    }
  } catch (err) {
    console.warn(`[fundamentals] VPS fetch failed for ${symbol}:`, err);
  }

  return NextResponse.json(
    { error: `Fundamentals for ${symbol.toUpperCase()} temporarily unavailable` },
    { status: 503 }
  );
}
