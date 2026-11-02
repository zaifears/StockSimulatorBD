// Direct DSE price fetch — the Vercel-side fallback for when the Oracle VPS
// (which normally runs api/market_sync.py and api/category_sync.py) is
// unreachable.
//
// One ~40 KB JSON GET, no dependencies. Mirrors parse_new_dse_payload() in
// api/market_sync.py: keep the two in step (field mapping, government
// securities filter, value in millions of BDT -> raw BDT).

// dsebd.org, www.dsebd.org and new.dsebd.org are one CloudFront distribution;
// www is canonical, the apex is a second hostname in case one name misroutes.
// The second attempt also adds a cache-busting query string: that cache
// (~15s TTL) occasionally holds a transient empty response, and the query
// string is part of its cache key, so the retry reaches DSE's origin.
const DSE_PRICE_URLS = [
  'https://www.dsebd.org/api/live/prices',
  'https://dsebd.org/api/live/prices',
];

const DEFAULT_COLS = [
  'code', 'ltp', 'ycp', 'open', 'high', 'low', 'close',
  'volume', 'value', 'trades', 'percent', 'category',
  'board', 'sector', 'assetType',
];

// Same floor as the Python scraper's "unusually low count" guard.
const MIN_STOCKS = 50;

export interface DirectStock {
  symbol: string;
  ltp: number;
  high: number;
  low: number;
  close: number;
  ycp: number;
  change: number;
  changePercent: number;
  trade: number;
  value: number;
  volume: number;
  traded: boolean;
}

export interface DirectDseResult {
  stocks: DirectStock[];
  marketStatus: string | null;
  url: string;
}

function isGovernmentSecurity(code: string, assetType: string, sector: string, board: string): boolean {
  const c = code.trim().toUpperCase();
  const a = assetType.trim().toUpperCase();
  const s = sector.trim().toUpperCase();
  const b = board.trim().toUpperCase();

  if (['GOVDBT', 'GSEC', 'TBOND'].includes(a)) return true;
  if (['TBOND', 'G-SEC', 'TREASURY'].includes(s) || s.includes('G-SEC') || s.includes('T.BOND') || s.includes('TREASURY')) return true;
  if (b === 'YIELDDBT') return true;
  return c.startsWith('TB') || c.startsWith('GSEC') || c.startsWith('BGT');
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function parseDsePayload(data: any): { stocks: DirectStock[]; marketStatus: string | null } {
  const cols: string[] = Array.isArray(data?.cols) ? data.cols : DEFAULT_COLS;
  const rows: unknown[][] = Array.isArray(data?.rows) ? data.rows : [];
  const idx = (name: string, fallback: number) => {
    const i = cols.indexOf(name);
    return i >= 0 ? i : fallback;
  };

  const codeI = idx('code', 0);
  const ltpI = idx('ltp', 1);
  const ycpI = idx('ycp', 2);
  const highI = idx('high', 4);
  const lowI = idx('low', 5);
  const closeI = idx('close', 6);
  const volumeI = idx('volume', 7);
  const valueI = idx('value', 8);
  const tradesI = idx('trades', 9);
  const percentI = idx('percent', 10);
  const boardI = idx('board', 12);
  const sectorI = idx('sector', 13);
  const assetI = idx('assetType', 14);

  const stocks: DirectStock[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length <= codeI) continue;
    const symbol = String(row[codeI]).trim().toUpperCase();
    if (!symbol || symbol === 'TRADING CODE') continue;

    const board = row.length > boardI ? String(row[boardI]).trim() : '';
    const sector = row.length > sectorI ? String(row[sectorI]).trim() : '';
    const assetType = row.length > assetI ? String(row[assetI]).trim() : '';
    if (isGovernmentSecurity(symbol, assetType, sector, board)) continue;

    const ltp = num(row[ltpI]);
    const ycp = num(row[ycpI]);
    const close = num(row[closeI]);
    const trade = num(row[tradesI]);

    let change = 0;
    let changePercent = 0;
    if (trade > 0 || ltp > 0) {
      change = ltp > 0 ? round2(ltp - ycp) : round2(close - ycp);
      changePercent = round2(num(row[percentI]));
    }

    stocks.push({
      symbol,
      ltp,
      high: num(row[highI]),
      low: num(row[lowI]),
      close,
      ycp,
      change,
      changePercent,
      trade,
      // DSE reports turnover in millions of BDT; the app uses raw BDT.
      value: round2(num(row[valueI]) * 1_000_000),
      volume: num(row[volumeI]),
      traded: trade > 0,
    });
  }

  const session = data?.session;
  const marketStatus =
    session && typeof session === 'object' && 'isOpen' in session
      ? session.isOpen ? 'Open' : 'Closed'
      : null;

  return { stocks, marketStatus };
}

/**
 * Mirrors fetch_categories_from_new_dse() in api/category_sync.py: the same
 * prices payload carries every instrument's market category (A/B/G/N/Z).
 */
export function parseDseCategories(data: any): { categories: Record<string, string>; counts: Record<string, number> } {
  const cols: string[] = Array.isArray(data?.cols) ? data.cols : DEFAULT_COLS;
  const rows: unknown[][] = Array.isArray(data?.rows) ? data.rows : [];
  const idx = (name: string, fallback: number) => {
    const i = cols.indexOf(name);
    return i >= 0 ? i : fallback;
  };
  const codeI = idx('code', 0);
  const catI = idx('category', 11);
  const boardI = idx('board', 12);
  const sectorI = idx('sector', 13);
  const assetI = idx('assetType', 14);

  const categories: Record<string, string> = {};
  const counts: Record<string, number> = { A: 0, B: 0, G: 0, N: 0, Z: 0 };
  for (const row of rows) {
    if (!Array.isArray(row) || row.length <= codeI) continue;
    const symbol = String(row[codeI]).trim().toUpperCase();
    if (!symbol || symbol === 'TRADING CODE') continue;

    const board = row.length > boardI ? String(row[boardI]).trim() : '';
    const sector = row.length > sectorI ? String(row[sectorI]).trim() : '';
    const assetType = row.length > assetI ? String(row[assetI]).trim() : '';
    if (isGovernmentSecurity(symbol, assetType, sector, board)) continue;

    const cat = row.length > catI ? String(row[catI]).trim().toUpperCase() : '';
    if (!cat) continue;
    categories[symbol] = cat;
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return { categories, counts };
}

/**
 * Fetches the raw live-prices payload straight from DSE, trying each
 * dsebd.org hostname in turn. Each attempt is capped so a hung host can't eat
 * the function's whole time budget. `accept` rejects a payload (e.g. too few
 * rows) so the next host gets a chance.
 */
export async function fetchDsePricesPayload<T>(
  accept: (data: any) => T,
  timeoutMs = 8000
): Promise<{ result: T; url: string }> {
  let lastError = 'no DSE endpoint tried';

  for (const [i, baseUrl] of DSE_PRICE_URLS.entries()) {
    const url = i === 0 ? baseUrl : `${baseUrl}?_=${Date.now()}`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StockSimulatorBD-Sync/1.0)',
          Accept: 'application/json',
          Referer: 'https://www.dsebd.org/markets/latest-share-price',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { result: accept(await res.json()), url };
    } catch (err: any) {
      lastError = `${new URL(url).host}: ${err?.message || 'unknown error'}`;
    }
  }

  throw new Error(`Direct DSE fetch failed (${lastError})`);
}

/** Live prices straight from DSE, in the same shape api/market_sync.py returns. */
export async function fetchDseDirect(timeoutMs = 8000): Promise<DirectDseResult> {
  const { result, url } = await fetchDsePricesPayload((data) => {
    const parsed = parseDsePayload(data);
    if (parsed.stocks.length < MIN_STOCKS) {
      throw new Error(`unusually low stock count (${parsed.stocks.length})`);
    }
    return parsed;
  }, timeoutMs);
  return { ...result, url };
}
