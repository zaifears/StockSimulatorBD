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
