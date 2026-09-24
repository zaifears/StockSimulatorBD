import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function buildChartScrapeUrl(request: Request, symbol: string): string {
  const envUrl = process.env.PYTHON_API_URL?.trim();
  if (envUrl) {
    if (envUrl.includes('/dse_chart')) {
      return `${envUrl}?symbol=${symbol}`;
    }
    const cleanBase = envUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    return `${cleanBase}/api/dse_chart?symbol=${symbol}`;
  }
  const host = request.headers.get('host') || 'localhost:3000';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('[::1]');
  const base = isLocal ? `http://${host}` : `https://${host}`;
  return `${base}/api/dse_chart?symbol=${symbol}`;
}

const THREE_MIN_MS = 3 * 60 * 1000;
const DEADLOCK_MS  = 15 * 1000;

export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get('symbol')?.toUpperCase();
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  let db, docRef;
  try {
    db     = getAdminDb();
    docRef = db.collection('stock_charts').doc(symbol);
  } catch (initError: any) {
    console.error('[Gatekeeper] Firebase init failed:', initError.message);
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const docSnap = await docRef.get();
    const now     = Date.now();

    if (docSnap.exists) {
      const data         = docSnap.data()!;
      const hasData      = Array.isArray(data.chartData) && data.chartData.length > 0;
      const isStale      = !hasData || (now - (data.lastUpdated || 0)) > THREE_MIN_MS;
      const isDeadlocked = data.isScraping && (now - (data.lockTime || 0)) > DEADLOCK_MS;

      if (!isStale) return NextResponse.json(data.chartData);
      if (data.isScraping && !isDeadlocked && hasData) return NextResponse.json(data.chartData);
    }

    await docRef.set({ isScraping: true, lockTime: now }, { merge: true });

    try {
      const scrapeUrl = buildChartScrapeUrl(request, symbol);

      console.log(`[Gatekeeper] Scraping: ${scrapeUrl}`);

      const pythonRes = await fetch(scrapeUrl);

      if (!pythonRes.ok) {
        throw new Error(`Python scraper HTTP ${pythonRes.status}`);
      }

      const contentType = pythonRes.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const body = await pythonRes.text();
        console.error('[Gatekeeper] Non-JSON response:', body.slice(0, 300));
        throw new Error('Python scraper returned non-JSON — route misconfigured');
      }

      const freshChartData = await pythonRes.json();

      await docRef.set({
        chartData:   freshChartData,
        lastUpdated: Date.now(),
        isScraping:  false,
        lockTime:    0,
      });

      return NextResponse.json(freshChartData);

    } catch (scrapeError: any) {
      await docRef.set({ isScraping: false, lockTime: 0 }, { merge: true }).catch(() => {});
      throw scrapeError;
    }

  } catch (error: any) {
    console.error('[Gatekeeper] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}