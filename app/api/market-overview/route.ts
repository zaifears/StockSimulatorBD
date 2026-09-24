import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getOverviewUrl(): string {
  const envUrl = process.env.PYTHON_API_URL?.trim();
  if (envUrl) {
    const cleanBase = envUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    return `${cleanBase}/api/market_overview`;
  }
  return 'https://dse.shahoriar.bd/api/market_overview';
}

export async function GET() {
  const url = getOverviewUrl();
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StockSimulatorBD-Web/1.0' },
      next: { revalidate: 15 },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=30',
        },
      });
    }
  } catch (err) {
    console.warn('[market-overview] VPS fetch failed, falling back to direct DSE:', err);
  }

  // Fallback to direct DSE API if VPS is unreachable
  try {
    const directRes = await fetch('https://new.dsebd.org/api/live/market', {
      headers: { 'User-Agent': 'StockSimulatorBD-Web/1.0' },
      next: { revalidate: 15 },
      signal: AbortSignal.timeout(6000),
    });
    if (directRes.ok) {
      const data = await directRes.json();
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=30',
        },
      });
    }
  } catch (directErr) {
    console.error('[market-overview] Direct DSE fallback also failed:', directErr);
  }

  return NextResponse.json(
    { error: 'Unable to retrieve live market overview' },
    { status: 503 }
  );
}
