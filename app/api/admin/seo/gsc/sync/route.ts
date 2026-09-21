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

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const db = getSeoDb();
    const [queriesSnap, connSnap] = await Promise.all([
      db.collection('gsc_query_snapshots').get(),
      db.collection('gsc_connections').doc('default').get(),
    ]);

    const queries: GscQueryData[] = queriesSnap.docs.map((d) => d.data() as GscQueryData);

    const connData = connSnap.data();
    const connectionInfo = {
      connected: connData?.status === 'connected',
      propertyUrl: connData?.propertyUrl || `${SITE_URL}/`,
      lastConnectedAt: connData?.lastConnectedAt || null,
      lastSyncAt: connData?.lastSyncAt || null,
    };

    return NextResponse.json({
      success: true,
      queries,
      connection: connectionInfo,
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
    let liveSynced = false;
    let syncedQueries: GscQueryData[] = [];

    if (accessToken && connData?.propertyUrl) {
      // Query Google Search Console Search Analytics API
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];

      const gscApiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        connData.propertyUrl
      )}/searchAnalytics/query`;

      const gscRes = await fetch(gscApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['query', 'page'],
          rowLimit: 100,
        }),
      });

      if (gscRes.ok) {
        const gscData = await gscRes.json();
        const rows = gscData.rows || [];

        syncedQueries = rows.map((r: any) => ({
          query: r.keys?.[0] || '',
          targetPages: [r.keys?.[1] || '/'],
          clicks: r.clicks || 0,
          impressions: r.impressions || 0,
          ctr: r.ctr || 0,
          position: r.position || 0,
          trend: 'stable',
        }));

        liveSynced = true;
      }
    }

    if (!liveSynced || syncedQueries.length === 0) {
      return NextResponse.json({
        success: false,
        liveSynced: false,
        error: !accessToken
          ? 'Google Search Console not connected or token expired. Please connect OAuth first.'
          : 'No queries returned from Search Console for this property.',
      }, { status: 400 });
    }

    // Persist query snapshots in SEO Firestore
    const batch = db.batch();
    for (const q of syncedQueries) {
      const docRef = db.collection('gsc_query_snapshots').doc(encodeURIComponent(q.query.slice(0, 50)));
      batch.set(docRef, q, { merge: true });
    }

    // Record last sync timestamp
    batch.set(
      db.collection('gsc_connections').doc('default'),
      {
        lastSyncAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await batch.commit();

    // Trigger opportunity engine
    const opps = await generateSeoOpportunities();

    return NextResponse.json({
      success: true,
      liveSynced,
      syncedQueriesCount: syncedQueries.length,
      opportunitiesGenerated: opps.length,
      lastSyncAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('GSC Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
