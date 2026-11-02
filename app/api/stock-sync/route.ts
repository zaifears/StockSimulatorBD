import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyCronSecret } from '@/lib/utils/cronAuth';
import { fetchDseDirect } from '@/lib/dseDirect';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// A healthy VPS answers in well under a second. Waiting longer on a dead one
// just burns function time on every cron tick (Vercel Hobby has a monthly
// compute budget), so give up early and fall through to the direct DSE fetch.
const VPS_TIMEOUT_MS = 6000;

// Once the VPS has failed and we've served prices straight from DSE, don't
// re-probe it on every tick (~3 min). Retry only this often to notice recovery.
const VPS_RETRY_COOLDOWN_MS = 15 * 60 * 1000;

type PriceSource = 'dse' | 'dse-direct' | 'lankabd-failsafe';

// DSE's live feed drops some instruments (corporate bonds, debentures) between
// its pre-open reset and the session start, then adds them back. A write in
// that window would make those holdings vanish from market_info/latest and be
// valued at ৳0. Carry them forward as "not traded today" rows instead — the
// same shape the feed uses for an untraded stock, so they're valued at their
// last price and can't be traded. A symbol absent this long is gone for real.
const CARRY_FORWARD_MAX_MS = 7 * 24 * 60 * 60 * 1000;

type StockRow = Record<string, any> & { symbol: string };

function carryForwardMissing(fresh: StockRow[], previous: unknown, nowMs: number): StockRow[] {
  if (!Array.isArray(previous)) return [];
  const present = new Set(fresh.map((s) => s.symbol));
  const carried: StockRow[] = [];
  for (const prev of previous as StockRow[]) {
    if (!prev || typeof prev.symbol !== 'string' || present.has(prev.symbol)) continue;
    if (typeof prev.missingSince === 'string') {
      if (nowMs - new Date(prev.missingSince).getTime() <= CARRY_FORWARD_MAX_MS) carried.push(prev);
      continue;
    }
    const lastPrice = prev.traded !== false && prev.ltp > 0 ? prev.ltp : prev.ycp || 0;
    carried.push({
      ...prev,
      ltp: 0,
      ycp: lastPrice,
      change: 0,
      changePercent: 0,
      trade: 0,
      value: 0,
      volume: 0,
      traded: false,
      missingSince: new Date(nowMs).toISOString(),
    });
  }
  return carried;
}

function getPythonApiBase(): string {
  const envUrl = process.env.PYTHON_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }
  return 'https://dse.shahoriar.bd';
}

function buildSyncUrl(): string {
  if (process.env.MARKET_SYNC_URL) return process.env.MARKET_SYNC_URL;
  return `${getPythonApiBase()}/api/market_sync`;
}

function buildLankaFailsafeUrl(): string {
  if (process.env.LANKA_PRICE_SYNC_URL) return process.env.LANKA_PRICE_SYNC_URL;
  return `${getPythonApiBase()}/api/lanka_price_sync`;
}

async function fetchVpsPrices(url: string): Promise<{ stocks: unknown[]; marketStatus: string | null }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'StockSimulatorBD-Sync/1.0' },
    signal: AbortSignal.timeout(VPS_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Python scraper HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const body = await res.text();
    throw new Error(
      `Python scraper returned non-JSON (${contentType}). ` +
      `Route misconfigured? Body: ${body.slice(0, 300)}`
    );
  }

  const payload = await res.json();

  // api/market_sync.py used to return a bare array and now returns
  // { stocks, marketStatus }. Accept both so the Python function and this
  // route can never be out of step, in either direction.
  const stocks = Array.isArray(payload) ? payload : payload?.stocks;
  if (!Array.isArray(stocks) || stocks.length < 50) {
    throw new Error(`Primary scraper returned insufficient stocks (${Array.isArray(stocks) ? stocks.length : 'non-array'})`);
  }
  return { stocks, marketStatus: typeof payload?.marketStatus === 'string' ? payload.marketStatus : null };
}

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authResult = verifyCronSecret(request);
  if (!authResult.ok) {
    if (authResult.status === 500) {
      console.error('[stock-sync] CRON_SECRET env var is not set');
    }
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: 'DB write failed: NEXT_PUBLIC_SIMULATOR_APP_ID env var is not set' }, { status: 500 });
  }

  const marketRef = getAdminDb()
    .collection('artifacts')
    .doc(appId)
    .collection('public')
    .doc('data')
    .collection('market_info')
    .doc('latest');

  // ── VPS circuit breaker ───────────────────────────────────────────────────
  // One Firestore read. If the last write came from the direct-DSE fallback
  // and we probed the VPS recently, skip it this tick.
  const nowMs = Date.now();
  let vpsLastTriedAt: string | null = null;
  let skipVps = false;
  let previousStocks: unknown = null;
  try {
    const prev = (await marketRef.get()).data();
    previousStocks = prev?.stocks;
    if (prev?.source === 'dse-direct' && typeof prev.vpsLastTriedAt === 'string') {
      vpsLastTriedAt = prev.vpsLastTriedAt;
      skipVps = nowMs - new Date(prev.vpsLastTriedAt).getTime() < VPS_RETRY_COOLDOWN_MS;
    }
  } catch (err: any) {
    console.warn('[stock-sync] Could not read previous state, trying VPS anyway:', err.message);
  }

  let marketData: unknown[] | null = null;
  // DSE's own "Market Status: Open/Closed". null when unavailable — consumers
  // treat null as "no opinion" and fall back to the holiday calendar. See
  // lib/utils/marketHours.ts.
  let marketStatus: string | null = null;
  let source: PriceSource = 'dse';
  let primaryError: string | null = null;

  // ── 1. Primary: Oracle VPS running api/market_sync.py ─────────────────────
  if (skipVps) {
    primaryError = `VPS skipped (failed recently, retrying every ${VPS_RETRY_COOLDOWN_MS / 60000}m)`;
  } else {
    const scrapeUrl = buildSyncUrl();
    console.log(`[stock-sync] Fetching primary DSE: ${scrapeUrl}`);
    vpsLastTriedAt = new Date(nowMs).toISOString();
    try {
      ({ stocks: marketData, marketStatus } = await fetchVpsPrices(scrapeUrl));
    } catch (err: any) {
      primaryError = err.message || 'Unknown error';
      console.warn(`[stock-sync] VPS scrape failed (${primaryError}), fetching DSE directly...`);
    }
  }

  // ── 2. Fallback: straight from DSE, from this function ────────────────────
  if (!marketData) {
    try {
      const direct = await fetchDseDirect();
      marketData = direct.stocks;
      marketStatus = direct.marketStatus;
      source = 'dse-direct';
      console.log(`[stock-sync] Direct DSE fetch OK — ${direct.stocks.length} stocks from ${direct.url}`);
    } catch (directErr: any) {
      console.warn(`[stock-sync] ${directErr.message}; trying LankaBangla failsafe...`);
    }
  }

  // ── 3. Last resort: LankaBangla failsafe (also hosted on the VPS) ─────────
  if (!marketData) {
    const failsafeUrl = buildLankaFailsafeUrl();
    console.log(`[stock-sync] Fetching fallback backup: ${failsafeUrl}`);

    try {
      const failsafeRes = await fetch(failsafeUrl, {
        headers: { 'User-Agent': 'StockSimulatorBD-SyncFallback/1.0' },
        signal: AbortSignal.timeout(VPS_TIMEOUT_MS),
      });

      if (!failsafeRes.ok) {
        const body = await failsafeRes.text();
        throw new Error(`Lanka failsafe HTTP ${failsafeRes.status}: ${body.slice(0, 300)}`);
      }

      const contentType = failsafeRes.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const body = await failsafeRes.text();
        throw new Error(`Lanka failsafe returned non-JSON (${contentType}): ${body.slice(0, 300)}`);
      }

      const payload = await failsafeRes.json();
      const stocks = Array.isArray(payload) ? payload : payload?.stocks;
      if (Array.isArray(stocks) && stocks.length >= 100) {
        marketData = stocks;
        marketStatus = null; // LankaBangla doesn't publish exchange open/closed banner
        source = 'lankabd-failsafe';
        console.log(`[stock-sync] Fallback successful — acquired ${stocks.length} stocks from LankaBangla`);
      } else {
        throw new Error(`Lanka failsafe returned insufficient stocks (${Array.isArray(stocks) ? stocks.length : 'non-array'})`);
      }
    } catch (fallbackErr: any) {
      console.error('[stock-sync] All sources failed — VPS, direct DSE and LankaBangla failsafe:', {
        primaryError,
        fallbackError: fallbackErr.message,
      });
      return NextResponse.json(
        { error: `All scrape sources failed: Primary (${primaryError}), Fallback (${fallbackErr.message})` },
        { status: 502 }
      );
    }
  }

  const carried = carryForwardMissing(marketData as StockRow[], previousStocks, nowMs);
  if (carried.length > 0) {
    // Keep DSE's own symbol order so the carried rows sit where they always did.
    marketData = [...(marketData as StockRow[]), ...carried].sort((a, b) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0
    );
    console.log(`[stock-sync] Carried forward ${carried.length} symbols missing from this snapshot`);
  }

  // ── Write to Firestore ────────────────────────────────────────────────────
  try {
    await marketRef.set({
      stocks:      marketData,
      lastUpdated: new Date().toISOString(),
      totalStocks: marketData.length,
      marketStatus,
      source,
      ...(vpsLastTriedAt ? { vpsLastTriedAt } : {}),
      ...(primaryError ? { primaryError } : {}),
    });

    console.log(
      `[stock-sync] ✓ Wrote ${marketData.length} stocks to ${appId} (source: ${source}, DSE status: ${marketStatus ?? 'unknown'})`
    );

    const message =
      source === 'dse'
        ? `Successfully synced ${marketData.length} stocks from DSE.`
        : source === 'dse-direct'
          ? `VPS unavailable (${primaryError}); synced ${marketData.length} stocks directly from DSE.`
          : `Primary DSE failed (${primaryError}); successfully synced ${marketData.length} stocks from LankaBangla backup.`;

    return NextResponse.json(
      {
        success:     true,
        source,
        message,
        marketStatus,
        appId,
        timestamp:   new Date().toISOString(),
      },
      {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );

  } catch (err: any) {
    console.error('[stock-sync] Firestore write failed:', err.message);
    return NextResponse.json({ error: `DB write failed: ${err.message}` }, { status: 500 });
  }
}
