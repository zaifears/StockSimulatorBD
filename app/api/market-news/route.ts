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
      signal: AbortSignal.timeout(6000),
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
  for (const dseUrl of ['https://new.dsebd.org/api/live/news', 'https://www.dsebd.org/api/live/news']) {
    try {
      const directRes = await fetch(dseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://new.dsebd.org/',
        },
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(6000),
      });

      if (directRes.ok) {
        const raw = await directRes.json();
        let rows = raw.rows || [];
        if (symbol) {
          const targetSymbols = new Set(
            symbol
              .split(',')
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean)
          );
          rows = rows.filter((r: any) => targetSymbols.has(String(r.code || '').toUpperCase()));
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
      console.error(`[market-news] Direct DSE fallback (${dseUrl}) failed:`, directErr);
    }
  }

  return NextResponse.json({ news: [], total: 0, error: 'News feed currently unavailable' }, { status: 503 });
}
