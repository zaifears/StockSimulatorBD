import { getAdminAuth } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Get Firebase Admin auth
    const adminAuth = getAdminAuth();

    // Verify the token with Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Create a session cookie (14 days expiration)
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn: 14 * 24 * 60 * 60 * 1000, // 14 days
    });

    // Return the session cookie in a response header
    const response = NextResponse.json({ success: true, uid });
    response.cookies.set('__session', sessionCookie, {
      maxAge: 14 * 24 * 60 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 401 }
    );
  }
}
