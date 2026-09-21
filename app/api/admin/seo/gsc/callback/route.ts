// app/api/admin/seo/gsc/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { encryptToken } from '@/lib/seo/crypto';
import { SITE_URL, absoluteUrl } from '@/lib/siteUrl';

import { discoverGscSites } from '@/lib/seo/gscSites';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateParam = searchParams.get('state');
  const stateCookie = req.cookies.get('gsc_oauth_state')?.value;

  if (error) {
    return NextResponse.redirect(absoluteUrl(`/admin/seo/search?gsc_error=${encodeURIComponent(error)}`));
  }

  // Verify OAuth CSRF State to prevent connection hijacking (RFC 6749 §10.12)
  let stateValid = false;
  if (stateParam) {
    if (stateCookie && stateCookie === stateParam) {
      stateValid = true;
    } else {
      // Fallback verification via isolated SEO Firestore in case browser privacy shields
      // (e.g. Brave Shields, Safari ITP, partitioned storage) dropped the redirect cookie
      try {
        const seoDb = getSeoDb();
        const stateDoc = await seoDb.collection('seo_oauth_states').doc(stateParam).get();
        if (stateDoc.exists) {
          const data = stateDoc.data();
          // Verify 15-minute validity window
          if (data?.createdAt && Date.now() - data.createdAt < 15 * 60 * 1000) {
            stateValid = true;
          }
          // Consume state (one-time use nonce)
          await stateDoc.ref.delete().catch(() => {});
        }
      } catch (dbErr) {
        console.warn('Error verifying OAuth state doc:', dbErr);
      }
    }
  }

  if (!stateValid) {
    return NextResponse.redirect(absoluteUrl('/admin/seo/search?gsc_error=invalid_csrf_state'));
  }

  if (!code) {
    return NextResponse.redirect(absoluteUrl('/admin/seo/search?gsc_error=missing_code'));
  }

  const clientId = process.env.GOOGLE_GSC_CLIENT_ID || process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GSC_CLIENT_SECRET || process.env.GSC_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_GSC_REDIRECT_URI || absoluteUrl('/api/admin/seo/gsc/callback');

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(absoluteUrl('/admin/seo/search?gsc_error=missing_credentials'));
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      const errDetail = tokenData.error_description || tokenData.error || 'Token exchange failed';
      return NextResponse.redirect(absoluteUrl(`/admin/seo/search?gsc_error=${encodeURIComponent(errDetail)}`));
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Encrypt tokens using AES-256-GCM before writing to Firestore
    const encryptedRefreshToken = refresh_token ? encryptToken(refresh_token) : null;
    const encryptedAccessToken = encryptToken(access_token);

    const seoDb = getSeoDb();
    const connectionRef = seoDb.collection('gsc_connections').doc('default');
    const existingSnap = await connectionRef.get();
    const existingData = existingSnap.data();

    // If Google didn't return a new refresh token on re-auth, preserve existing encrypted refresh token
    const finalEncryptedRefreshToken = encryptedRefreshToken || existingData?.encryptedRefreshToken;

    // Auto-discover verified sites from Google Search Console API
    const { properties, matchedProperty } = await discoverGscSites(access_token);

    await connectionRef.set(
      {
        status: 'connected',
        propertyUrl: matchedProperty,
        availableProperties: properties.map((p) => p.siteUrl),
        encryptedAccessToken,
        encryptedRefreshToken: finalEncryptedRefreshToken,
        tokenExpiresAt: Date.now() + (expires_in || 3600) * 1000,
        lastConnectedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const response = NextResponse.redirect(
      absoluteUrl(`/admin/seo/search?gsc_connected=true&property=${encodeURIComponent(matchedProperty)}`)
    );
    response.cookies.delete('gsc_oauth_state');
    return response;
  } catch (err: any) {
    console.error('GSC OAuth Callback Error:', err);
    return NextResponse.redirect(absoluteUrl(`/admin/seo/search?gsc_error=${encodeURIComponent(err.message)}`));
  }
}
