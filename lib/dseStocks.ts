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

/**
 * Symbols currently carried in the live market snapshot the trade terminal reads.
 * Returns null on any failure so callers fall back to the shipped roster rather
 * than failing a build or serving an empty stock directory.
 */
async function fetchLiveSymbols(): Promise<string[] | null> {
  try {
    // Side-effect import initialises Firebase Admin with the service account.
    await import('./firebaseAdmin');
    const { getFirestore } = await import('firebase-admin/firestore');

    const snap = await getFirestore()
      .doc(`artifacts/${APP_ID}/public/data/market_info/latest`)
      .get();

    if (!snap.exists) return null;

    const stocks = (snap.data()?.stocks ?? []) as Array<{ symbol?: unknown }>;
    const symbols = stocks
      .map((s) => (typeof s.symbol === 'string' ? s.symbol.trim().toUpperCase() : ''))
      .filter((s) => s.length > 0 && /^[A-Z0-9().\-]+$/.test(s));

    return symbols.length > 0 ? symbols : null;
  } catch {
    // Missing credentials at build time, network failure, permission error: all
    // degrade to the shipped roster instead of breaking the route.
    return null;
  }
}

/**
 * Memoised for the life of the process. `generateStaticParams` plus 400+ page
 * renders would otherwise hit Firestore once per page during a build.
 */
let rosterPromise: Promise<DseStock[]> | null = null;

async function buildRoster(): Promise<DseStock[]> {
  const live = await fetchLiveSymbols();
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
