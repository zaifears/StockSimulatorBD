import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import * as admin from 'firebase-admin';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60 seconds for scraping

const GROUPS = ['A', 'B', 'N', 'Z'];

// ── Firebase Admin initialization with credentials ──
function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  
  // Initialize with credentials from environment variables
  const credentials = {
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
  };

  return initializeApp({
    credential: admin.credential.cert(credentials as any),
  });
}

function getDb() {
  return getFirestore(getAdminApp());
}

async function scrapeGroup(group: string) {
  const url = `https://www.dsebd.org/latest_share_price_scroll_group.php?group=${group}`;
  try {
    const response = await fetch(url, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 0 } 
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const symbols: string[] = [];

    // DSE Table Parsing Logic
    // The table contains trading codes in the 2nd column (index 1)
    $('.table-bordered tr').each((_, row) => {
      let symbol = $(row).find('td').eq(1).text().trim();
      // Cleanup: Remove any extra spaces or newlines
      symbol = symbol.replace(/\s+/g, '').trim();

      // Basic validation: DSE codes are alphanumeric, ignore headers
      if (symbol && symbol !== 'TradingCode' && !symbol.includes('Unknown') && symbol.length > 0) {
        symbols.push(symbol);
      }
    });

    return { group, symbols };
  } catch (error) {
    console.error(`Failed to scrape group ${group}:`, error);
    return { group, symbols: [] };
  }
}

export async function GET(req: NextRequest) {
  // Security: Check for Vercel Cron secret (optional but recommended)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Scrape all 4 groups in parallel
    const results = await Promise.all(GROUPS.map(scrapeGroup));
    
    // Create a map of symbol -> category for quick lookup
    const categoryMap = new Map<string, string>();
    for (const { group, symbols } of results) {
      for (const symbol of symbols) {
        categoryMap.set(symbol, group);
      }
    }

    // 2. Write categories to a SEPARATE document so the 3-minute stock-sync
    //    never overwrites them. Categories only change on Tuesdays.
    const db = getDb();
    const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'skilldash-dse-v1';
    const categoriesRef = db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('market_info').doc('categories');

    // Build a plain object { symbol: category } for Firestore
    const categoryObject: Record<string, string> = {};
    for (const [symbol, group] of categoryMap.entries()) {
      categoryObject[symbol] = group;
    }

    // SAFETY GUARD: Prevent wiping data if scrape fails
    if (categoryMap.size < 50) {
      throw new Error(`Scrape returned unusually low results (${categoryMap.size}). Aborting DB write to prevent data loss.`);
    }

    await categoriesRef.set({
      categories: categoryObject,
      lastUpdated: new Date().toISOString(),
      totalCategorized: categoryMap.size
    });

    const totalUpdated = categoryMap.size;
    console.log(`✅ Scraper completed: Saved ${totalUpdated} stock categories to separate document`);

    return NextResponse.json({
      success: true,
      updated: totalUpdated,
      details: results.map(r => ({ group: r.group, count: r.symbols.length }))
    });

  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
