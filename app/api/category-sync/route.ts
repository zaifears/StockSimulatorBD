import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

function buildSyncUrl(): string {
  if (process.env.CATEGORY_SYNC_URL) return process.env.CATEGORY_SYNC_URL;
  // Production: Vercel routes /api/category_sync to the Python function.
  const base = `https://${process.env.VERCEL_URL}`;
  return `${base}/api/category_sync`;
}

// Every DSE category board combined sums to ~390-400 symbols on a healthy
// day (verified 2026-08-24: A=195, B=74, G=0, N=0, Z=126, total 395, zero
// symbols in more than one category). A response far short of that means
// the scrape partially failed — reject rather than overwrite a previously-
// good map with a partial one. This is a fixed floor and doesn't adapt if
// DSE's total listing count genuinely grows or shrinks over time — the
// drop-vs-previous check below is the adaptive counterpart to this.
const MIN_CATEGORIZED = 200;

// A day-over-day drop bigger than this fraction is treated as a scrape
// problem, not real DSE activity — real category reassignments are a slow
// trickle (occasional AGM-driven moves), never a mass one-day shift. Guards
// against a scenario the fixed floor above wouldn't catch: DSE narrows the
// page (e.g. drops one category's rows) but the total still clears 200.
const MAX_DROP_FRACTION = 0.15;

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('[category-sync] CRON_SECRET env var is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');
  const isAuthed = authHeader === `Bearer ${expectedSecret}` || apiKey === expectedSecret;

  if (!isAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scrapeUrl = buildSyncUrl();
  console.log(`[category-sync] Fetching: ${scrapeUrl}`);

  let categories: Record<string, string>;
  let counts: Record<string, number>;

  try {
    const pythonRes = await fetch(scrapeUrl, {
      headers: { 'User-Agent': 'StockSimulatorBD-CategorySync/1.0' },
    });

    if (!pythonRes.ok) {
      const body = await pythonRes.text();
      throw new Error(`Python scraper HTTP ${pythonRes.status}: ${body.slice(0, 300)}`);
    }

    const contentType = pythonRes.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const body = await pythonRes.text();
      throw new Error(
        `Python scraper returned non-JSON (${contentType}). Route misconfigured? Body: ${body.slice(0, 300)}`
      );
    }

    const payload = await pythonRes.json();
    categories = payload.categories;
    counts = payload.counts;
  } catch (err: any) {
    console.error('[category-sync] Scrape failed:', err.message);
    return NextResponse.json({ error: `Scrape failed: ${err.message}` }, { status: 502 });
  }

  const symbolCount = categories ? Object.keys(categories).length : 0;
  if (!categories || symbolCount < MIN_CATEGORIZED) {
    const msg = `Scraper returned ${symbolCount} categorized symbols (need ≥ ${MIN_CATEGORIZED}) — aborting write`;
    console.error(`[category-sync] ${msg}`);
    return NextResponse.json({ error: msg, counts }, { status: 422 });
  }

  try {
    const db = getAdminDb();
    const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID;

    if (!appId) {
      throw new Error('NEXT_PUBLIC_SIMULATOR_APP_ID env var is not set');
    }

    const categoriesRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('market_info')
      .doc('categories');

    // Adaptive fail-safe: refuse to overwrite a healthy previous sync with a
    // suspiciously smaller one. Only engages once there's a prior sync large
    // enough to trust as a baseline — the very first run, or one recovering
    // from an already-bad state, has nothing meaningful to compare against.
    const existingSnap = await categoriesRef.get();
    const previousTotal = existingSnap.exists ? (existingSnap.data()?.totalCategorized as number | undefined) : undefined;

    if (typeof previousTotal === 'number' && previousTotal >= MIN_CATEGORIZED) {
      const dropFraction = (previousTotal - symbolCount) / previousTotal;
      if (dropFraction > MAX_DROP_FRACTION) {
        const msg =
          `New sync (${symbolCount} symbols) is ${(dropFraction * 100).toFixed(0)}% below the previous ` +
          `known-good sync (${previousTotal} symbols) — that's a bigger single-day move than real DSE ` +
          `category activity produces. Aborting write; previous data is untouched.`;
        console.error(`[category-sync] ${msg}`);
        return NextResponse.json({ error: msg, previousTotal, newTotal: symbolCount, counts }, { status: 422 });
      }
    }

    await categoriesRef.set({
      categories,
      counts,
      lastUpdated: new Date().toISOString(),
      totalCategorized: symbolCount,
    });

    console.log(`[category-sync] ✓ Wrote ${symbolCount} categories to ${appId}`, counts);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${symbolCount} stock categories.`,
      counts,
      appId,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[category-sync] Firestore write failed:', err.message);
    return NextResponse.json({ error: `DB write failed: ${err.message}` }, { status: 500 });
  }
}
