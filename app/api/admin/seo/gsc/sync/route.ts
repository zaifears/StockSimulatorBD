// app/api/admin/seo/gsc/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { GscQueryData } from '@/lib/seo/types';
import { generateSeoOpportunities } from '@/lib/seo/opportunities';
import { decryptToken, encryptToken } from '@/lib/seo/crypto';
import { SITE_URL } from '@/lib/siteUrl';

async function getValidAccessToken(connectionDoc: any): Promise<string | null> {
  const clientId = process.env.GOOGLE_GSC_CLIENT_ID || process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GSC_CLIENT_SECRET || process.env.GSC_CLIENT_SECRET;

  if (!connectionDoc?.encryptedRefreshToken || !clientId || !clientSecret) {
    return null;
  }

  // If access token is still valid (with 5 min buffer)
  if (connectionDoc.encryptedAccessToken && connectionDoc.tokenExpiresAt > Date.now() + 300000) {
    return decryptToken(connectionDoc.encryptedAccessToken);
  }

  // Refresh the token using the decrypted refresh token
  try {
    const refreshToken = decryptToken(connectionDoc.encryptedRefreshToken);
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      console.warn('GSC Token refresh failed:', data);
      return null;
    }

    const db = getSeoDb();
    await db.collection('gsc_connections').doc('default').update({
      encryptedAccessToken: encryptToken(data.access_token),
      tokenExpiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    });

    return data.access_token;
  } catch (err) {
    console.error('Error in GSC token refresh:', err);
    return null;
  }
}

import { discoverGscSites } from '@/lib/seo/gscSites';

const MOCK_SIGNATURES = [
  'dse share price',
  'bangladesh stock market paper trading',
  'dse stock simulator',
  'gp share price dse',
  'best shares to buy in dse today',
  'how to trade in dse',
  'dse trading rules',
  'dse candlestick chart live',
  'beximco pharma share price',
];

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const db = getSeoDb();
    const [queriesSnap, connSnap, dimSnap] = await Promise.all([
      db.collection('gsc_query_snapshots').get(),
      db.collection('gsc_connections').doc('default').get(),
      db.collection('gsc_dimensions').doc('summary').get(),
    ]);

    let queries: GscQueryData[] = queriesSnap.docs.map((d) => d.data() as GscQueryData);
    const connData = connSnap.data();

    // Auto-detect and purge any stale mock queries from previous sessions
    const hasMockData = queries.some(
      (q) =>
        MOCK_SIGNATURES.includes(q.query?.toLowerCase()?.trim()) &&
        (q.impressions === 4820 || q.impressions === 3890 || q.clicks === 480)
    );

    if (hasMockData) {
      const purgeBatch = db.batch();
      for (const doc of queriesSnap.docs) {
        const queryText = (doc.data() as any)?.query?.toLowerCase()?.trim();
        if (MOCK_SIGNATURES.includes(queryText)) {
          purgeBatch.delete(doc.ref);
        }
      }
      await purgeBatch.commit().catch(() => {});
      queries = queries.filter((q) => !MOCK_SIGNATURES.includes(q.query?.toLowerCase()?.trim()));
    }

    const connectionInfo = {
      connected: connData?.status === 'connected',
      propertyUrl: connData?.propertyUrl || `sc-domain:${new URL(SITE_URL).hostname.replace(/^www\./, '')}`,
      availableProperties: connData?.availableProperties || [],
      lastConnectedAt: connData?.lastConnectedAt || null,
      lastSyncAt: connData?.lastSyncAt || null,
    };

    const dimensions = dimSnap.exists ? dimSnap.data() : null;

    return NextResponse.json({
      success: true,
      queries,
      connection: connectionInfo,
      dimensions,
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
    const db = getSeoDb();
    const connSnap = await db.collection('gsc_connections').doc('default').get();
    const connData = connSnap.data();

    const accessToken = await getValidAccessToken(connData);
    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          liveSynced: false,
          error:
            'Google Search Console is not connected or the refresh token has expired. Please click "Connect Search Console" to authorize.',
        },
        { status: 400 }
      );
    }

    // Resolve propertyUrl: self-heal if missing or currently an HTTP prefix that lacks permissions
    let activePropertyUrl = connData?.propertyUrl;
    if (!activePropertyUrl || activePropertyUrl.startsWith('http')) {
      const discovery = await discoverGscSites(accessToken);
      if (discovery.matchedProperty) {
        activePropertyUrl = discovery.matchedProperty;
        await db.collection('gsc_connections').doc('default').update({
          propertyUrl: activePropertyUrl,
          availableProperties: discovery.properties.map((p) => p.siteUrl),
        });
      }
    }

    if (!activePropertyUrl) {
      activePropertyUrl = `sc-domain:${new URL(SITE_URL).hostname.replace(/^www\./, '')}`;
    }

    // Google Search Console API query configuration
    const now = new Date();
    // 2-day buffer for Search Console indexing finalization
    const endDateObj = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const startDateObj = new Date(endDateObj.getTime() - 28 * 24 * 60 * 60 * 1000);
    const endDate = endDateObj.toISOString().split('T')[0];
    const startDate = startDateObj.toISOString().split('T')[0];

    const runGscQuery = async (propUrl: string, dimensions: string[]) => {
      const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        propUrl
      )}/searchAnalytics/query`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions,
          dataState: 'all',
          rowLimit: 250,
        }),
      });

      return res;
    };

    let gscRes = await runGscQuery(activePropertyUrl, ['query', 'page']);

    // Self-healing fallback: If propertyUrl gave 403 or 404, re-discover verified sites from Google and retry once
    if (!gscRes.ok && (gscRes.status === 403 || gscRes.status === 404)) {
      console.warn(`GSC query failed with ${gscRes.status} for ${activePropertyUrl}. Attempting site re-discovery...`);
      const discovery = await discoverGscSites(accessToken);
      if (discovery.matchedProperty && discovery.matchedProperty !== activePropertyUrl) {
        activePropertyUrl = discovery.matchedProperty;
        await db.collection('gsc_connections').doc('default').update({
          propertyUrl: activePropertyUrl,
          availableProperties: discovery.properties.map((p) => p.siteUrl),
        });
        gscRes = await runGscQuery(activePropertyUrl, ['query', 'page']);
      }
    }

    if (!gscRes.ok) {
      const errText = await gscRes.text();
      let parsedErr = 'Google Search Console API request failed.';
      try {
        const errJson = JSON.parse(errText);
        parsedErr = errJson.error?.message || errText;
      } catch {
        parsedErr = errText;
      }
      return NextResponse.json(
        {
          success: false,
          liveSynced: false,
          propertyUrl: activePropertyUrl,
          error: `Search Console API error (${gscRes.status}): ${parsedErr}`,
        },
        { status: 400 }
      );
    }

    const gscData = await gscRes.json();
    const rows = gscData.rows || [];

    // Aggregate queries across landing pages
    const queryMap = new Map<string, GscQueryData>();
    for (const r of rows) {
      const query = (r.keys?.[0] || '').trim();
      const page = r.keys?.[1] || '/';
      if (!query) continue;

      if (!queryMap.has(query)) {
        queryMap.set(query, {
          query,
          clicks: r.clicks || 0,
          impressions: r.impressions || 0,
          ctr: r.ctr ? Math.round(r.ctr * 1000) / 1000 : 0,
          position: r.position ? Math.round(r.position * 10) / 10 : 0,
          targetPages: [page],
          trend: 'stable',
        });
      } else {
        const existing = queryMap.get(query)!;
        const totalImp = existing.impressions + (r.impressions || 0);
        const totalClicks = existing.clicks + (r.clicks || 0);
        const weightedPos =
          totalImp > 0
            ? (existing.position * existing.impressions + (r.position || 0) * (r.impressions || 0)) / totalImp
            : existing.position;
        const ctr = totalImp > 0 ? totalClicks / totalImp : 0;

        if (!existing.targetPages.includes(page)) {
          existing.targetPages.push(page);
        }
        existing.clicks = totalClicks;
        existing.impressions = totalImp;
        existing.position = Math.round(weightedPos * 10) / 10;
        existing.ctr = Math.round(ctr * 1000) / 1000;
      }
    }

    const syncedQueries = Array.from(queryMap.values());

    // Also fetch real dimensions: Country and Device breakdown
    let countriesData: Array<{ country: string; clicks: number; impressions: number }> = [];
    let devicesData: Array<{ device: string; clicks: number; impressions: number }> = [];

    try {
      const [countryRes, deviceRes] = await Promise.all([
        runGscQuery(activePropertyUrl, ['country']),
        runGscQuery(activePropertyUrl, ['device']),
      ]);

      if (countryRes.ok) {
        const cJson = await countryRes.json();
        countriesData = (cJson.rows || []).slice(0, 10).map((r: any) => ({
          country: r.keys?.[0] || 'Unknown',
          clicks: r.clicks || 0,
          impressions: r.impressions || 0,
        }));
      }

      if (deviceRes.ok) {
        const dJson = await deviceRes.json();
        devicesData = (dJson.rows || []).slice(0, 5).map((r: any) => ({
          device: r.keys?.[0] || 'Unknown',
          clicks: r.clicks || 0,
          impressions: r.impressions || 0,
        }));
      }
    } catch (dimErr) {
      console.warn('Could not fetch dimension breakdown:', dimErr);
    }

    // Wipe stale existing query snapshots to ensure no old mock data remains
    const existingSnapshots = await db.collection('gsc_query_snapshots').get();
    const batch = db.batch();
    for (const doc of existingSnapshots.docs) {
      batch.delete(doc.ref);
    }

    // Persist real empirical query snapshots
    for (const q of syncedQueries) {
      const docId = encodeURIComponent(q.query.slice(0, 50).toLowerCase().replace(/\s+/g, '-'));
      const docRef = db.collection('gsc_query_snapshots').doc(docId);
      batch.set(docRef, q);
    }

    // Persist real dimension breakdown
    batch.set(
      db.collection('gsc_dimensions').doc('summary'),
      {
        countries: countriesData,
        devices: devicesData,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );

    // Update connection status
    batch.set(
      db.collection('gsc_connections').doc('default'),
      {
        status: 'connected',
        propertyUrl: activePropertyUrl,
        lastSyncAt: new Date().toISOString(),
        syncedQueriesCount: syncedQueries.length,
      },
      { merge: true }
    );

    await batch.commit();

    // Trigger opportunity engine
    const opps = await generateSeoOpportunities().catch(() => []);

    return NextResponse.json({
      success: true,
      liveSynced: true,
      propertyUrl: activePropertyUrl,
      syncedQueriesCount: syncedQueries.length,
      opportunitiesGenerated: opps.length,
      lastSyncAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('GSC Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const db = getSeoDb();
    const existingSnapshots = await db.collection('gsc_query_snapshots').get();
    const batch = db.batch();
    for (const doc of existingSnapshots.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Successfully purged ${existingSnapshots.size} query snapshots from SEO Firestore.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
