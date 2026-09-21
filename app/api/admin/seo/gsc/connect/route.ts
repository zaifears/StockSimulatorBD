// app/api/admin/seo/gsc/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { absoluteUrl } from '@/lib/siteUrl';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_GSC_CLIENT_ID || process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GSC_CLIENT_SECRET || process.env.GSC_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        error: 'Missing Search Console credentials. Set GOOGLE_GSC_CLIENT_ID and GOOGLE_GSC_CLIENT_SECRET in environment.',
      },
      { status: 400 }
    );
  }

  // Derive redirect URI
  const redirectUri =
    process.env.GOOGLE_GSC_REDIRECT_URI || absoluteUrl('/api/admin/seo/gsc/callback');

  // Random state to prevent CSRF
  const state = crypto.randomBytes(16).toString('hex');

  const scope = 'https://www.googleapis.com/auth/webmasters.readonly';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(
    scope
  )}&access_type=offline&prompt=consent&state=${state}`;

  const response = NextResponse.json({
    success: true,
    configured: true,
    authUrl,
    redirectUri,
  });

  response.cookies.set('gsc_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/api/admin/seo/gsc',
  });

  return response;
}
