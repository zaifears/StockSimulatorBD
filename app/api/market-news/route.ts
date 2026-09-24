import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getNewsUrl(symbol?: string | null): string {
  const envUrl = process.env.PYTHON_API_URL?.trim();
  const base = envUrl
    ? envUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '')
    : 'https://dse.shahoriar.bd';

  const query = symbol ? `?symbol=${encodeURIComponent(symbol.toUpperCase())}` : '';
  return `${base}/api/market_news${query}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.trim().toUpperCase();

  const url = getNewsUrl(symbol);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StockSimulatorBD-Web/1.0' },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
        },
      });
    }
  } catch (err) {
    console.warn('[market-news] VPS fetch failed, falling back to direct DSE:', err);
  }

  // Fallback to direct DSE news
  try {
    const directRes = await fetch('https://new.dsebd.org/api/live/news', {
      headers: { 'User-Agent': 'StockSimulatorBD-Web/1.0' },
      next: { revalidate: 60 },
    });

    if (directRes.ok) {
      const raw = await directRes.json();
      let rows = raw.rows || [];
      if (symbol) {
        rows = rows.filter((r: any) => String(r.code || '').toUpperCase() === symbol);
      }
      return NextResponse.json(
        { news: rows, total: rows.length, timestamp: Date.now() },
        {
          headers: {
            'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
          },
        }
      );
    }
  } catch (directErr) {
    console.error('[market-news] Direct DSE fallback also failed:', directErr);
  }

  return NextResponse.json({ news: [], total: 0, error: 'News feed currently unavailable' }, { status: 503 });
}
