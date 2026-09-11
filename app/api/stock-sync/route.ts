import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  return initializeApp({
    credential: admin.credential.cert({
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_CERT_URL,
    } as admin.ServiceAccount),
  });
}

function getBaseUrl(request: NextRequest): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function buildSyncUrl(request: NextRequest): string {
  if (process.env.MARKET_SYNC_URL) return process.env.MARKET_SYNC_URL;
  return `${getBaseUrl(request)}/api/market_sync`;
}

function buildLankaFailsafeUrl(request: NextRequest): string {
  if (process.env.LANKA_PRICE_SYNC_URL) return process.env.LANKA_PRICE_SYNC_URL;
  return `${getBaseUrl(request)}/api/lanka_price_sync`;
}

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    // Hard fail — never run unprotected in any environment
    console.error('[stock-sync] CRON_SECRET env var is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const apiKey     = request.headers.get('x-api-key');
  const isAuthed   =
    authHeader === `Bearer ${expectedSecret}` ||
    apiKey     === expectedSecret;

  if (!isAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Scrape Primary (DSE) ──────────────────────────────────────────────────
  const scrapeUrl = buildSyncUrl(request);
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
      // No explicit timeout here — Vercel's 60s maxDuration is the hard ceiling
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
    const failsafeUrl = buildLankaFailsafeUrl(request);
    console.log(`[stock-sync] Fetching fallback backup: ${failsafeUrl}`);

    try {
      const failsafeRes = await fetch(failsafeUrl, {
        headers: { 'User-Agent': 'StockSimulatorBD-SyncFallback/1.0' },
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
    const db    = getFirestore(getAdminApp());
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

    return NextResponse.json({
      success:     true,
      source,
      message:     source === 'dse'
        ? `Successfully synced ${marketData.length} stocks from DSE.`
        : `Primary DSE failed (${primaryError}); successfully synced ${marketData.length} stocks from LankaBangla backup.`,
      marketStatus,
      appId,
      timestamp:   new Date().toISOString(),
    });

  } catch (err: any) {
    console.error('[stock-sync] Firestore write failed:', err.message);
    return NextResponse.json({ error: `DB write failed: ${err.message}` }, { status: 500 });
  }
}