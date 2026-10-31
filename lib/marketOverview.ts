// lib/marketOverview.ts
// DSE's own market overview (indices, breadth, session totals), as published at
// new.dsebd.org/api/live/market and mirrored by the VPS at /api/market_overview.
// Used by the homepage index board. Only index-level and market-wide figures are
// read here: no company-level data leaves this module.
import { VPS_BASE_URL } from '@/lib/vpsClient';

export interface IndexQuote {
  key: string;
  value: number;
  change: number;
  percent: number;
}

export interface MarketOverview {
  indices: IndexQuote[];
  breadth: { advanced: number; declined: number; unchanged: number } | null;
  totals: { trades: number; volume: number; turnover: number } | null;
  session: { isOpen: boolean; sessionDate: string | null };
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Keeps the fields the board shows and drops the rest of DSE's payload (movers etc.). */
export function pickMarketOverview(raw: any): MarketOverview | null {
  const indices: IndexQuote[] = Array.isArray(raw?.indices)
    ? raw.indices
        .filter((i: any) => typeof i?.key === 'string' && num(i.value) !== null)
        .map((i: any) => ({ key: i.key, value: i.value, change: num(i.change) ?? 0, percent: num(i.percent) ?? 0 }))
    : [];
  if (!indices.some((i) => i.key === 'DSEX')) return null;

  const b = raw?.breadth;
  const t = raw?.totals;
  return {
    indices,
    breadth:
      num(b?.advanced) !== null && num(b?.declined) !== null
        ? { advanced: b.advanced, declined: b.declined, unchanged: num(b.unchanged) ?? 0 }
        : null,
    totals:
      num(t?.turnover) !== null
        ? { trades: num(t.trades) ?? 0, volume: num(t.volume) ?? 0, turnover: t.turnover }
        : null,
    session: {
      isOpen: raw?.session?.isOpen === true,
      sessionDate: typeof raw?.session?.sessionDate === 'string' ? raw.session.sessionDate : null,
    },
  };
}

/**
 * Server-side read for the first paint: the VPS mirror first, then DSE directly.
 * Returns null rather than throwing, so the homepage never fails on market data.
 */
export async function fetchMarketOverview(revalidateSeconds = 300): Promise<MarketOverview | null> {
  const sources: Array<{ url: string; headers: Record<string, string> }> = [
    { url: `${VPS_BASE_URL}/api/market_overview`, headers: { 'User-Agent': 'StockSimulatorBD-Web/1.0' } },
    ...['https://new.dsebd.org/api/live/market', 'https://www.dsebd.org/api/live/market'].map((url) => ({
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json',
        Referer: 'https://new.dsebd.org/',
      },
    })),
  ];
  for (const { url, headers } of sources) {
    try {
      const res = await fetch(url, { headers, next: { revalidate: revalidateSeconds }, signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const picked = pickMarketOverview(await res.json());
      if (picked) return picked;
    } catch {
      // try the next source
    }
  }
  return null;
}
