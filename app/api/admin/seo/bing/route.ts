// app/api/admin/seo/bing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import {
  getBingConfig,
  saveBingConfig,
  fetchBingTrafficStats,
  fetchBingQueryStats,
  fetchBingCrawlStats,
  fetchBingBacklinks,
} from '@/lib/seo/bing';

import { getSeoDb } from '@/lib/firebaseSeoAdmin';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const config = await getBingConfig();
    const db = getSeoDb();
    const [traffic, queries, crawl, backlinks, gscSnap, gscConnSnap] = await Promise.all([
      fetchBingTrafficStats(config.apiKey || '', config.siteUrl || ''),
      fetchBingQueryStats(config.apiKey || '', config.siteUrl || ''),
      fetchBingCrawlStats(config.apiKey || '', config.siteUrl || ''),
      fetchBingBacklinks(config.apiKey || '', config.siteUrl || ''),
      db.collection('gsc_query_snapshots').get(),
      db.collection('gsc_connections').doc('default').get(),
    ]);

    // Calculate totals across verticals
    const totalClicks = traffic.reduce((acc, t) => acc + t.clicks, 0);
    const totalImpressions = traffic.reduce((acc, t) => acc + t.impressions, 0);
    const avgCtr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0;
    const chatTraffic = traffic.find((t) => t.vertical === 'chat');
    const latestCrawl = crawl[0];

    // Real GSC Comparison Data
    const gscConnected = gscConnSnap.data()?.status === 'connected';
    const gscQueries = gscSnap.docs.map((d) => d.data() as any);
    const gscClicks = gscQueries.reduce((acc, q) => acc + (q.clicks || 0), 0);
    const gscImpressions = gscQueries.reduce((acc, q) => acc + (q.impressions || 0), 0);
    const gscCtr = gscImpressions > 0 ? Math.round((gscClicks / gscImpressions) * 10000) / 100 : 0;
    const gscAvgPos = gscQueries.length > 0 ? Math.round((gscQueries.reduce((acc, q) => acc + (q.position || 0), 0) / gscQueries.length) * 10) / 10 : 0;

    return NextResponse.json({
      success: true,
      config: {
        connected: config.connected,
        siteUrl: config.siteUrl,
        lastSyncAt: config.lastSyncAt,
      },
      summary: {
        totalClicks,
        totalImpressions,
        avgCtr,
        chatClicks: chatTraffic?.clicks || 0,
        chatImpressions: chatTraffic?.impressions || 0,
        pagesInIndex: latestCrawl?.inIndex || 0,
        inboundLinks: latestCrawl?.inLinks || 0,
      },
      gsc: {
        connected: !!gscConnected,
        clicks: gscClicks,
        impressions: gscImpressions,
        ctr: gscCtr,
        position: gscAvgPos,
      },
      traffic,
      queries,
      crawl,
      backlinks,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { apiKey, siteUrl } = body;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API Key is required.' }, { status: 400 });
    }

    await saveBingConfig(apiKey.trim(), siteUrl);

    return NextResponse.json({
      success: true,
      message: 'Bing Webmaster API configuration saved and connected successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
