import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import * as admin from 'firebase-admin';

// Force Node.js to ignore DSEBD's broken SSL certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Initialize Firebase Admin SDK (only once)
const getFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }
  
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
};

/**
 * Check if DSE market is currently open
 * Market Hours: 10:00 AM - 2:30 PM (Sun-Thu), Bangladesh Time (UTC+6)
 */
function isMarketHours(): boolean {
  const now = new Date();
  // Safe UTC+6 conversion for Bangladesh Time that won't break in Vercel
  const bdTime = new Date(now.getTime() + (6 * 60 * 60 * 1000));
  
  const hour = bdTime.getUTCHours();
  const minute = bdTime.getUTCMinutes();
  const dayOfWeek = bdTime.getUTCDay();
  
  // Market closed on Friday (5) and Saturday (6)
  if (dayOfWeek === 5 || dayOfWeek === 6) return false;
  
  // Market hours: 10:00 AM to 2:30 PM (14:30) - scraper runs slightly wider window
  return (hour >= 9 && hour < 15);
}

/**
 * Fetch with timeout and retry logic
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3, timeoutMs = 15000): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) return response;
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function GET(request: NextRequest) {
  // GET request also triggers sync (for cron services that only support GET)
  return handleStockSync(request);
}

export async function POST(request: NextRequest) {
  return handleStockSync(request);
}

async function handleStockSync(request: NextRequest) {
  try {
    // Verify API key from x-api-key header
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.SIMULATOR_SYNC_KEY;
    
    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      );
    }

    // Check if force sync is requested (bypasses market hours check)
    const forceSync = request.headers.get('x-force-sync') === 'true';
    
    // Skip sync during off-hours unless forced
    if (!forceSync && !isMarketHours()) {
      return NextResponse.json({
        success: true,
        message: 'Skipped: Market is closed',
        marketOpen: false,
        timestamp: new Date().toISOString()
      });
    }

    // Fetch DSE data with timeout and retry
    const response = await fetchWithRetry(
      'https://www.dsebd.org/latest_share_price_scroll_l.php',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch DSE data: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Parse the table data
    const marketData: Array<{
      symbol: string;
      ltp: number;
      change: number;
      changePercent: number;
    }> = [];

    $('table.table tr').each((index, element) => {
      // Skip header row
      if (index === 0) return;

      const cells = $(element).find('td');
      
      if (cells.length >= 8) {
        try {
          // Table columns (0-indexed): 
          // 0: Serial#, 1: Trading Code, 2: LTP, 3: High, 4: Low, 5: CLOSEP, 6: YCP, 7: Change, 8: Trade, 9: Value, 10: Volume
          const symbol = $(cells[1]).text().trim(); // Trading Code
          const ltpText = $(cells[2]).text().trim().replace(/,/g, ''); // LTP - remove commas
          const changeText = $(cells[7]).text().trim().replace(/,/g, ''); // Change - remove commas

          const ltp = parseFloat(ltpText);
          const change = parseFloat(changeText);

          // Calculate change percent (protected against divide-by-zero Infinity errors)
          const previousPrice = ltp - change;
          const changePercent = (ltp > 0 && previousPrice > 0) ? (change / previousPrice) * 100 : 0;

          if (symbol && !isNaN(ltp)) {
            marketData.push({
              symbol,
              ltp: Number(ltp.toFixed(2)),
              change: Number(change.toFixed(2)),
              changePercent: Number(changePercent.toFixed(2))
            });
          }
        } catch (err) {
          console.error(`Error parsing row ${index}:`, err);
        }
      }
    });

    // Initialize Firebase Admin and update Firestore
    getFirebaseAdmin();
    const db = admin.firestore();
    
    const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'skilldash-dse-v1';
    
    // Path: artifacts/{appId}/public/data/market_info/latest (6 segments - even ✓)
    const docRef = db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('market_info').doc('latest');

    // Write ONLY price data — categories live in a separate document
    // (market_info/categories) updated by the weekly cron, so we never overwrite them
    
    // SAFETY GUARD: Do not wipe the database if the scrape failed
    if (marketData.length < 50) {
      throw new Error(`Scrape returned unusually low results (${marketData.length} stocks). Aborting database write to prevent wiping data.`);
    }

    await docRef.set({
      stocks: marketData,
      lastUpdated: new Date().toISOString(),
      totalStocks: marketData.length
    });

    return NextResponse.json({
      success: true,
      message: 'Market data synced successfully',
      stockCount: marketData.length,
      marketOpen: isMarketHours(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stock sync error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync market data',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
