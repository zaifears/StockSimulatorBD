import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isMarketOpenServer } from '@/lib/utils/marketHours';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) return null;

  try {
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
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const now = new Date();
  const nowMs = now.getTime();
  const marketOpen = isMarketOpenServer(now);

  const baseResponse: Record<string, any> = {
    status: 'healthy',
    timestamp: now.toISOString(),
    service: 'StockSimulatorBD API',
    version: '1.0.0',
    marketOpen,
  };

  const app = getAdminApp();
  const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';

  if (!app) {
    return NextResponse.json(
      { ...baseResponse, error: 'Database uninitialized' },
      { status: 200 }
    );
  }

  try {
    const db = getFirestore(app);
    const marketInfoCol = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('market_info');

    const [latestSnap, catSnap, secSnap] = await Promise.all([
      marketInfoCol.doc('latest').get(),
      marketInfoCol.doc('categories').get(),
      marketInfoCol.doc('sectors').get(),
    ]);

    const latestData = latestSnap.exists ? latestSnap.data() : null;
    const catData = catSnap.exists ? catSnap.data() : null;
    const secData = secSnap.exists ? secSnap.data() : null;

    // 1. Price Feed (Primary DSE vs Backup LankaBangla)
    let priceStatus: 'healthy' | 'failsafe-active' | 'stale' | 'down' = 'healthy';
    let isStale = false;
    let ageMinutes: number | null = null;
    const lastUpdated = latestData?.lastUpdated;
    const source: string = latestData?.source || 'dse';
    const totalStocks = latestData?.totalStocks || (Array.isArray(latestData?.stocks) ? latestData.stocks.length : 0);

    if (lastUpdated) {
      ageMinutes = Math.round((nowMs - new Date(lastUpdated).getTime()) / 60000);
      if (marketOpen && ageMinutes > 15) {
        isStale = true;
        priceStatus = 'stale';
      } else if (source === 'lankabd-failsafe') {
        priceStatus = 'failsafe-active';
      }
    } else {
      isStale = true;
      priceStatus = 'down';
    }

    // 2. Categories Sync (Daily)
    let catStatus: 'healthy' | 'stale' | 'missing' = 'healthy';
    let catAgeHours: number | null = null;
    if (catData?.lastUpdated) {
      catAgeHours = Math.round((nowMs - new Date(catData.lastUpdated).getTime()) / 3600000);
      if (catAgeHours > 48) catStatus = 'stale';
    } else {
      catStatus = 'missing';
    }

    // 3. Sectors Sync (Bi-weekly)
    let secStatus: 'healthy' | 'stale' | 'missing' = 'healthy';
    let secAgeDays: number | null = null;
    const secUpdated = secData?.lastChanged || secData?.lastChecked;
    if (secUpdated) {
      secAgeDays = Math.round((nowMs - new Date(secUpdated).getTime()) / 86400000);
      if (secAgeDays > 30) secStatus = 'stale';
    } else {
      secStatus = 'missing';
    }

    // Determine overall health status
    let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (priceStatus === 'down' || (priceStatus === 'stale' && marketOpen)) {
      overallStatus = 'down';
    } else if (priceStatus === 'failsafe-active' || catStatus === 'stale' || secStatus === 'stale') {
      overallStatus = 'degraded';
    }

    const httpStatus = overallStatus === 'down' ? 503 : 200;

    return NextResponse.json({
      ...baseResponse,
      status: overallStatus,
      scrapers: {
        priceFeed: {
          status: priceStatus,
          source,
          lastUpdated: lastUpdated || null,
          ageMinutes,
          isStale,
          totalStocks,
          marketStatus: latestData?.marketStatus ?? null,
        },
        categorySync: {
          status: catStatus,
          lastUpdated: catData?.lastUpdated || null,
          ageHours: catAgeHours,
          totalCategorized: catData?.totalCategorized || 0,
        },
        sectorSync: {
          status: secStatus,
          lastChecked: secData?.lastChecked || null,
          lastChanged: secData?.lastChanged || null,
          ageDays: secAgeDays,
          totalSectors: secData?.totalSectors || 0,
        },
      },
    }, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      ...baseResponse,
      status: 'error',
      error: err.message,
    }, { status: 500 });
  }
}
