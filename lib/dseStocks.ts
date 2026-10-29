export type DseStock = {
  symbol: string;
  name: string;
  /**
   * False when the symbol came from the live market roster but has no entry in
   * `dseCompanyNames.ts` yet, so `name` is just the ticker echoed back. Page copy
   * uses this to avoid writing "GPX is listed ... under the ticker GPX".
   */
  nameKnown: boolean;
};

import { DSE_COMPANY_NAMES, getCompanyName } from './dseCompanyNames';

const APP_ID = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';

/**
 * Top actively traded & benchmark DSE equity symbols pre-rendered at build time.
 * Keeping this list pruned to ~45 high-volume scrips strictly adheres to Vercel's
 * 10 GB Hobby deployment storage ceiling by avoiding 400+ redundant serverless lambda bundles.
 * All other DSE equities render on-demand via ISR (dynamicParams = true) upon first visit.
 */
export const TOP_STATIC_DSE_SYMBOLS = [
  'GP', 'BATBC', 'SQURPHARMA', 'BEXIMCO', 'BRACBANK', 'RENATA', 'LHBL', 'ISLAMIBANK',
  'BXPHARMA', 'UPGDCL', 'BERGERPBL', 'MARICO', 'EBL', 'OLYMPIC', 'CITYBANK',
  'WALTONHIL', 'IDLC', 'PUBALIBANK', 'PRIMEBANK', 'ALARABANK', 'DUTCHBANGL',
  'SUMITPOWER', 'TITASGAS', 'JAMUNAOIL', 'MPETROLEUM', 'PADMAOIL', 'HEIDELBCEM',
  'LAFSURCEML', 'MEGHNACEM', 'PREMIERBAN', 'DHAKABANK', 'EXIMBANK', 'FIRSTSBANK',
  'GPHISPAT', 'BSRMSTEEL', 'BSRMLTD', 'ACI', 'ACIFORMULA', 'BEACONPHAR', 'IBNSINA',
  'ROBI', 'UNILEVERCL', 'LINDEBD', 'KOHINOOR', 'ORIONPHARM', 'BBSCABLES'
];

/**
 * Curated roster shipped in the repo. Always available, needs a commit to change,
 * and remains the source of company names.
 */
const LOCAL_STOCKS: DseStock[] = Object.entries(DSE_COMPANY_NAMES)
  .map(([symbol, name]) => ({ symbol, name, nameKnown: true }))
  .sort((a, b) => a.symbol.localeCompare(b.symbol));

function toStock(symbol: string): DseStock {
  const name = getCompanyName(symbol);
  return { symbol, name: name ?? symbol, nameKnown: name !== null };
}

interface LatestPriceInfo {
  ltp: number;
  ycp?: number;
  close?: number;
}

interface MarketLatestSnapshot {
  symbols: string[] | null;
  prices: Map<string, LatestPriceInfo>;
}

let marketSnapshotPromise: Promise<MarketLatestSnapshot> | null = null;

async function fetchMarketLatestSnapshot(): Promise<MarketLatestSnapshot> {
  const prices = new Map<string, LatestPriceInfo>();
  try {
    // Side-effect import initialises Firebase Admin with the service account.
    await import('./firebaseAdmin');
    const { getFirestore } = await import('firebase-admin/firestore');

    const snap = await getFirestore()
      .doc(`artifacts/${APP_ID}/public/data/market_info/latest`)
      .get();

    if (!snap.exists) return { symbols: null, prices };

    const stocks = (snap.data()?.stocks ?? []) as Array<{
      symbol?: unknown;
      ltp?: number;
      ycp?: number;
      close?: number;
    }>;

    const symbols: string[] = [];
    for (const s of stocks) {
      if (typeof s.symbol === 'string') {
        const sym = s.symbol.trim().toUpperCase();
        if (sym.length > 0 && /^[A-Z0-9().\-]+$/.test(sym)) {
          symbols.push(sym);
          prices.set(sym, {
            ltp: typeof s.ltp === 'number' && s.ltp > 0 ? s.ltp : 0,
            ycp: typeof s.ycp === 'number' && s.ycp > 0 ? s.ycp : undefined,
            close: typeof s.close === 'number' && s.close > 0 ? s.close : undefined,
          });
        }
      }
    }

    return {
      symbols: symbols.length > 0 ? symbols : null,
      prices,
    };
  } catch {
    // Missing credentials at build time, network failure, permission error: all
    // degrade to the shipped roster instead of breaking the route.
    return { symbols: null, prices };
  }
}

function getMarketSnapshot(): Promise<MarketLatestSnapshot> {
  if (!marketSnapshotPromise) {
    marketSnapshotPromise = fetchMarketLatestSnapshot().catch(() => ({
      symbols: null,
      prices: new Map(),
    }));
  }
  return marketSnapshotPromise;
}

/**
 * Memoised for the life of the process. `generateStaticParams` plus 400+ page
 * renders would otherwise hit Firestore once per page during a build.
 */
let rosterPromise: Promise<DseStock[]> | null = null;

async function buildRoster(): Promise<DseStock[]> {
  const { symbols: live } = await getMarketSnapshot();
  if (!live) return LOCAL_STOCKS;

  // Union, not replacement. New listings gain a page automatically; symbols that
  // drop out of the live snapshot keep theirs, so URLs Google has already indexed
  // do not start returning 404 the day a company is suspended or delisted.
  const bySymbol = new Map<string, DseStock>();
  for (const stock of LOCAL_STOCKS) bySymbol.set(stock.symbol, stock);
  for (const symbol of live) {
    if (!bySymbol.has(symbol)) bySymbol.set(symbol, toStock(symbol));
  }

  return [...bySymbol.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export async function getAllDseStocks(): Promise<DseStock[]> {
  if (!rosterPromise) {
    rosterPromise = buildRoster().catch(() => LOCAL_STOCKS);
  }
  return rosterPromise;
}

/** The shipped roster on its own, for callers that must not touch the network. */
export function getLocalDseStocks(): DseStock[] {
  return LOCAL_STOCKS;
}

/**
 * Resolves the authoritative latest traded price or previous close for a given ticker.
 * Shares the memoized market_info/latest snapshot to prevent duplicate Firestore queries.
 */
export async function getStockLatestPrice(symbol: string): Promise<number> {
  const { prices } = await getMarketSnapshot();
  const data = prices.get(symbol.trim().toUpperCase());
  if (!data) return 0;
  return data.ltp > 0 ? data.ltp : (data.close && data.close > 0 ? data.close : (data.ycp || 0));
}

export interface ServerStockFundamentals {
  code: string;
  name?: string;
  sector?: string;
  category?: string;
  price?: number;
  pe?: number;
  eps?: number;
  nav?: number;
  marketCap?: number;
  paidUpCapital?: number;
  authorizedCapital?: number;
  dividendYield?: number;
  weekHigh52?: number;
  weekLow52?: number;
  listingYear?: number;
  sharePattern?: Array<{
    date: string;
    pattern: {
      sponsor?: number;
      government?: number;
      institution?: number;
      foreign?: number;
      public?: number;
    };
  }>;
  dividendHistory?: Array<{
    year: number;
    cash?: number;
    stock?: number;
    yieldPct?: number;
  }>;
  recentAnnouncements?: Array<{
    id?: string | number;
    type?: string;
    title?: string;
    summary?: string;
    body?: string;
    date?: string;
    filedAt?: string;
  }>;
  disclosures?: Array<{
    id?: string | number;
    type?: string;
    title?: string;
    summary?: string;
    body?: string;
    date?: string;
    filedAt?: string;
  }>;
}

export interface ServerStockNewsItem {
  id: string;
  code: string;
  name?: string;
  title?: string;
  type?: string;
  date?: string;
  time?: string;
  summary?: string;
  body?: string;
  filedAt?: string;
}

async function fetchVpsJsonViaHttps(urlStr: string, timeoutMs = 4000): Promise<any> {
  const https = await import('node:https');
  const zlib = await import('node:zlib');

  const rawJson = await new Promise<string>((resolve, reject) => {
    const req = https.get(
      urlStr,
      {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'User-Agent': 'StockSimulatorBD-SSR/1.0',
        },
        timeout: timeoutMs,
      },
      (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        const stream =
          res.headers['content-encoding']?.toLowerCase() === 'gzip'
            ? res.pipe(zlib.createGunzip())
            : res;
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        stream.on('error', reject);
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('VPS request timeout'));
    });
    req.on('error', reject);
  });

  return JSON.parse(rawJson);
}

/**
 * Per-symbol memoized cache of pruned fundamentals and disclosures from the Oracle VPS.
 * Fetching per-symbol (/api/fundamentals/{sym}) transfers ~25 KB in ~350ms instead of
 * downloading the full 10.6 MB directory on cold ISR starts, and pruning unused arrays
 * (recentAnnouncements, multiYearFinancials, peTrend) shrinks the Next.js RSC payload by ~96%.
 */
interface RawSymbolBundle {
  fundamentals: ServerStockFundamentals | null;
  fallbackAnnouncements: ServerStockNewsItem[];
}

const symbolBundleCache = new Map<string, Promise<RawSymbolBundle>>();
const symbolNewsCache = new Map<string, Promise<ServerStockNewsItem[] | null>>();

function numericNewsId(val: unknown): number {
  const digits = String(val ?? '').replace(/\D+/g, '');
  return digits ? Number(digits) : 0;
}

async function fetchSymbolBundle(sym: string): Promise<RawSymbolBundle> {
  const vpsBase = (process.env.NEXT_PUBLIC_VPS_API_URL || 'https://dse.shahoriar.bd').replace(/\/+$/, '');
  const urlStr = `${vpsBase}/api/fundamentals/${encodeURIComponent(sym)}`;

  try {
    const raw = (await fetchVpsJsonViaHttps(urlStr, 4000)) as ServerStockFundamentals;
    if (!raw || typeof raw !== 'object') {
      return { fundamentals: null, fallbackAnnouncements: [] };
    }

    const compName = raw.name || sym;
    const rawAnnouncements = raw.recentAnnouncements || raw.disclosures || [];
    const fallbackAnnouncements: ServerStockNewsItem[] = [];

    for (const disc of rawAnnouncements) {
      if (!disc || typeof disc !== 'object') continue;
      const discId = String(disc.id ?? '');
      const rawSummary = disc.summary || disc.title || 'Corporate Disclosure';
      const summaryWithCode = rawSummary.toUpperCase().startsWith(`${sym}:`)
        ? rawSummary
        : `${sym}: ${rawSummary}`;
      fallbackAnnouncements.push({
        id: discId || `${sym}-${disc.date || ''}-${fallbackAnnouncements.length}`,
        code: sym,
        name: compName,
        type: disc.type || 'Disclosure',
        summary: summaryWithCode,
        body: disc.body || '',
        date: disc.date || '',
        filedAt: disc.filedAt || disc.date || '',
      });
    }

    // Prune to only the fields rendered by CompanyFundamentalsCard & StockDetailsPage
    // (~820 bytes vs ~25 KB raw), keeping Vercel ISR HTML/RSC payloads lean.
    const pruned: ServerStockFundamentals = {
      code: raw.code || sym,
      ...(raw.name !== undefined ? { name: raw.name } : {}),
      ...(raw.sector !== undefined ? { sector: raw.sector } : {}),
      ...(raw.category !== undefined ? { category: raw.category } : {}),
      ...(raw.price !== undefined ? { price: raw.price } : {}),
      ...(raw.pe !== undefined ? { pe: raw.pe } : {}),
      ...(raw.eps !== undefined ? { eps: raw.eps } : {}),
      ...(raw.nav !== undefined ? { nav: raw.nav } : {}),
      ...(raw.marketCap !== undefined ? { marketCap: raw.marketCap } : {}),
      ...(raw.paidUpCapital !== undefined ? { paidUpCapital: raw.paidUpCapital } : {}),
      ...(raw.authorizedCapital !== undefined ? { authorizedCapital: raw.authorizedCapital } : {}),
      ...(raw.dividendYield !== undefined ? { dividendYield: raw.dividendYield } : {}),
      ...(raw.weekHigh52 !== undefined ? { weekHigh52: raw.weekHigh52 } : {}),
      ...(raw.weekLow52 !== undefined ? { weekLow52: raw.weekLow52 } : {}),
      ...(raw.listingYear !== undefined ? { listingYear: raw.listingYear } : {}),
      ...(Array.isArray(raw.sharePattern) && raw.sharePattern.length > 0
        ? { sharePattern: raw.sharePattern.slice(-1) }
        : {}),
      ...(Array.isArray(raw.dividendHistory) && raw.dividendHistory.length > 0
        ? { dividendHistory: raw.dividendHistory }
        : {}),
    };

    return { fundamentals: pruned, fallbackAnnouncements };
  } catch {
    return { fundamentals: null, fallbackAnnouncements: [] };
  }
}

function getSymbolBundle(symbol: string): Promise<RawSymbolBundle> {
  const sym = symbol.trim().toUpperCase();
  let p = symbolBundleCache.get(sym);
  if (!p) {
    p = fetchSymbolBundle(sym);
    symbolBundleCache.set(sym, p);
  }
  return p;
}

export async function getStockFundamentals(symbol: string): Promise<ServerStockFundamentals | null> {
  const { fundamentals } = await getSymbolBundle(symbol);
  return fundamentals;
}

async function fetchSymbolNews(sym: string): Promise<ServerStockNewsItem[] | null> {
  const vpsBase = (process.env.NEXT_PUBLIC_VPS_API_URL || 'https://dse.shahoriar.bd').replace(/\/+$/, '');
  const urlStr = `${vpsBase}/api/market_news?symbol=${encodeURIComponent(sym)}`;

  try {
    const parsed = await fetchVpsJsonViaHttps(urlStr, 4000);
    if (parsed && Array.isArray(parsed.news)) {
      return (parsed.news as ServerStockNewsItem[]).slice(0, 10);
    }
  } catch {
    // Fall back to announcements embedded in fundamentals response if /api/market_news fails
  }

  const { fundamentals, fallbackAnnouncements } = await getSymbolBundle(sym);
  if (fundamentals) {
    fallbackAnnouncements.sort((a, b) => numericNewsId(b.id) - numericNewsId(a.id));
    return fallbackAnnouncements.slice(0, 10);
  }

  return null;
}

/**
 * Resolves official DSE corporate disclosures and PSI news for a symbol on the server.
 */
export async function getStockNews(symbol: string): Promise<ServerStockNewsItem[] | null> {
  const sym = symbol.trim().toUpperCase();
  let p = symbolNewsCache.get(sym);
  if (!p) {
    p = fetchSymbolNews(sym);
    symbolNewsCache.set(sym, p);
  }
  return p;
}
