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

function buildSyncUrl(): string {
  if (process.env.MARKET_SYNC_URL) return process.env.MARKET_SYNC_URL;
  // Production: Vercel routes /api/market_sync to the Python function
  const base = `https://${process.env.VERCEL_URL}`;
  return `${base}/api/market_sync`;
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

  // ── Scrape ────────────────────────────────────────────────────────────────
  const scrapeUrl = buildSyncUrl();
  console.log(`[stock-sync] Fetching: ${scrapeUrl}`);

  let marketData: unknown[];

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

    marketData = await pythonRes.json();

  } catch (err: any) {
    console.error('[stock-sync] Scrape failed:', err.message);
    return NextResponse.json({ error: `Scrape failed: ${err.message}` }, { status: 502 });
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!Array.isArray(marketData) || marketData.length < 50) {
    const msg = `Scraper returned ${Array.isArray(marketData) ? marketData.length : 'non-array'} stocks — aborting write`;
    console.error(`[stock-sync] ${msg}`);
    return NextResponse.json({ error: msg }, { status: 422 });
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
    });

    console.log(`[stock-sync] ✓ Wrote ${marketData.length} stocks to ${appId}`);

    return NextResponse.json({
      success:     true,
      message:     `Successfully synced ${marketData.length} stocks.`,
      appId,
      timestamp:   new Date().toISOString(),
    });

  } catch (err: any) {
    console.error('[stock-sync] Firestore write failed:', err.message);
    return NextResponse.json({ error: `DB write failed: ${err.message}` }, { status: 500 });
  }
}