import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyCronSecret } from '@/lib/utils/cronAuth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authResult = verifyCronSecret(request);
  if (!authResult.ok) {
    if (authResult.status === 500) {
      console.error('[stock-sync] CRON_SECRET env var is not set');
    }
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  // ── Scrape Primary (DSE) ──────────────────────────────────────────────────
  const scrapeUrl = buildSyncUrl();
  console.log(`[stock-sync] Fetching primary DSE: ${scrapeUrl}`);

  let marketData: unknown[] | null = null;
  // DSE's own "Market Status: Open/Closed" as printed on the board we
  // scrape. null when the scraper couldn't find it (older payload shape, or
  // a parse miss) — consumers treat null as "no opinion" and fall back to
  // the holiday calendar. See lib/utils/marketHours.ts.
  let marketStatus: string | null = null;
  let source: 'dse' | 'lankabd-failsafe' = 'dse';
  let primaryError: string | null = null;

  try {
    const pythonRes = await fetch(scrapeUrl, {
      headers: { 'User-Agent': 'StockSimulatorBD-Sync/1.0' },
      signal: AbortSignal.timeout(25000),
    });

    if (!pythonRes.ok) {
      const body = await pythonRes.text();
      throw new Error(`Python scraper HTTP ${pythonRes.status}: ${body.slice(0, 300)}`);
    }

    const contentType = pythonRes.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const body = await pythonRes.text();
      throw new Error(
        `Python scraper returned non-JSON (${contentType}). ` +
        `Route misconfigured? Body: ${body.slice(0, 300)}`
      );
    }

    const payload = await pythonRes.json();

    // api/market_sync.py used to return a bare array and now returns
    // { stocks, marketStatus }. Accept both so the Python function and this
    // route can never be out of step, in either direction.
    const stocks = Array.isArray(payload) ? payload : payload?.stocks;
    if (Array.isArray(stocks) && stocks.length >= 50) {
      marketData = stocks;
      marketStatus = typeof payload?.marketStatus === 'string' ? payload.marketStatus : null;
    } else {
      throw new Error(`Primary scraper returned insufficient stocks (${Array.isArray(stocks) ? stocks.length : 'non-array'})`);
    }

  } catch (err: any) {
    primaryError = err.message || 'Unknown error';
    console.warn(`[stock-sync] Primary DSE scrape failed (${primaryError}), attempting automatic LankaBangla fallback...`);
  }

  // ── Automatic Fallback to LankaBangla if Primary Failed ──────────────────
  if (!marketData) {
    const failsafeUrl = buildLankaFailsafeUrl();
    console.log(`[stock-sync] Fetching fallback backup: ${failsafeUrl}`);

    try {
      const failsafeRes = await fetch(failsafeUrl, {
        headers: { 'User-Agent': 'StockSimulatorBD-SyncFallback/1.0' },
        signal: AbortSignal.timeout(25000),
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
      console.error('[stock-sync] Dual failure — primary DSE and LankaBangla failsafe both failed:', {
        primaryError,
        fallbackError: fallbackErr.message,
      });
      return NextResponse.json(
        { error: `Dual scrape failure: Primary (${primaryError}), Fallback (${fallbackErr.message})` },
        { status: 502 }
      );
    }
  }

  // ── Write to Firestore ────────────────────────────────────────────────────
  try {
    const db = getAdminDb();
    const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID;

    if (!appId) {
      throw new Error('NEXT_PUBLIC_SIMULATOR_APP_ID env var is not set');
    }

    const marketRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('market_info')
      .doc('latest');

    await marketRef.set({
      stocks:      marketData,
      lastUpdated: new Date().toISOString(),
      totalStocks: marketData.length,
      marketStatus,
      source,
      ...(primaryError ? { primaryError } : {}),
    });

    console.log(
      `[stock-sync] ✓ Wrote ${marketData.length} stocks to ${appId} (source: ${source}, DSE status: ${marketStatus ?? 'unknown'})`
    );

    return NextResponse.json(
      {
        success:     true,
        source,
        message:     source === 'dse'
          ? `Successfully synced ${marketData.length} stocks from DSE.`
          : `Primary DSE failed (${primaryError}); successfully synced ${marketData.length} stocks from LankaBangla backup.`,
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