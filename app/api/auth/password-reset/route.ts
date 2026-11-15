// app/api/auth/password-reset/route.ts
// "Forgot password" / "Set a password": emails a one-time link to
// /auth/reset. No auth required, so it is built not to leak anything:
//   - the answer is the same whether or not the email has an account
//   - rate-limited per IP and per email address (server-side, Firestore)
//   - reCAPTCHA is verified here, not trusted from the browser (a signed-in
//     caller sends their ID token instead and gets a link for their own email)
//   - the link is built from the site's own URL, never the Host header
// If Resend is not configured or the send fails for a real account, the
// answer is { ok: false, fallback: true } and the browser asks Firebase to
// send its built-in reset email instead (lib/passwordReset.ts).

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { getClientIP } from '@/lib/apiUtils';
import { checkPersistentRateLimit } from '@/lib/utils/persistentRateLimit';
import { sendPasswordResetEmail } from '@/lib/passwordResetEmail';
import { SITE_URL } from '@/lib/siteUrl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR_MS = 60 * 60 * 1000;

const PROVIDER_NAMES: Record<string, string> = {
  'google.com': 'Google',
  'github.com': 'GitHub',
  'facebook.com': 'Facebook',
};

const sha = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 32);

async function passesRecaptcha(token: unknown): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  // Same policy as the sign-in form: enforced in production only.
  if (process.env.NODE_ENV !== 'production') return true;
  if (!secret) return false;
  if (typeof token !== 'string' || !token) return false;
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    if (!data.success) return false;
    const raw = Number(process.env.RECAPTCHA_MIN_SCORE_FORGOT_PASSWORD ?? process.env.RECAPTCHA_MIN_SCORE);
    const min = Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.2;
    return typeof data.score !== 'number' || data.score >= min;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  // A signed-in caller (Profile: "forgot current password" / "set a
  // password") proves who they are with their ID token instead of reCAPTCHA,
  // and can only ask for their own address.
  let signedInEmail: string | null = null;
  const bearer = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (bearer) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(bearer);
      signedInEmail = decoded.email?.toLowerCase() || null;
    } catch {
      return NextResponse.json({ ok: false, error: 'Please sign in again and retry.' }, { status: 401 });
    }
    if (!signedInEmail) {
      return NextResponse.json({ ok: false, error: 'This account has no email address.' }, { status: 400 });
    }
  }

  const email = signedInEmail || (typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '');
  if (!email || email.length > 100 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }

  // Decided before looking anything up, so it says nothing about the account.
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, fallback: true });
  }

  if (!signedInEmail && !(await passesRecaptcha(body?.recaptchaToken))) {
    return NextResponse.json(
      { ok: false, error: 'Security check failed. Please refresh the page and try again.' },
      { status: 400 }
    );
  }

  // Generous per IP (mobile carriers here put many people behind one IP),
  // tight per address so nobody's inbox can be flooded.
  const ip = getClientIP(req);
  const [ipOk, emailOk] = await Promise.all([
    checkPersistentRateLimit(`pwreset_ip_${sha(ip)}`, { maxRequests: 10, windowMs: HOUR_MS }),
    checkPersistentRateLimit(`pwreset_em_${sha(email)}`, { maxRequests: 3, windowMs: HOUR_MS }),
  ]);
  if (!ipOk || !emailOk) {
    return NextResponse.json(
      { ok: false, error: 'Too many reset requests. Please wait an hour, or use the link we already sent.' },
      { status: 429 }
    );
  }

  try {
    const adminAuth = getAdminAuth();
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') return NextResponse.json({ ok: true });
      throw err;
    }
    if (user.disabled) return NextResponse.json({ ok: true });

    // Firebase mints the one-time code; we only re-point the link at our own
    // page. The origin is the configured site URL (request origin in local
    // dev only), never the Host header.
    const firebaseLink = await adminAuth.generatePasswordResetLink(email);
    const oobCode = new URL(firebaseLink).searchParams.get('oobCode');
    if (!oobCode) throw new Error('No oobCode in generated link');
    const origin = process.env.NODE_ENV === 'production' ? SITE_URL : req.nextUrl.origin;
    const resetUrl = `${origin.replace(/\/$/, '')}/auth/reset?oobCode=${encodeURIComponent(oobCode)}`;

    const providerIds = user.providerData.map((p) => p.providerId);
    const hasPassword = providerIds.includes('password');
    const socialProvider = PROVIDER_NAMES[providerIds.find((id) => PROVIDER_NAMES[id]) || ''];

    const sent = await sendPasswordResetEmail({ to: email, resetUrl, hasPassword, socialProvider });
    if (!sent) return NextResponse.json({ ok: false, fallback: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ password-reset route failed:', error);
    // Let Firebase's own email cover for us.
    return NextResponse.json({ ok: false, fallback: true });
  }
}
