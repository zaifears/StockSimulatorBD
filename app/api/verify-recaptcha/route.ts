import { NextRequest, NextResponse } from 'next/server';

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

/**
 * Minimum acceptable reCAPTCHA v3 score, per action.
 *
 * Tunable without a code change via RECAPTCHA_MIN_SCORE (applies to every
 * action) or RECAPTCHA_MIN_SCORE_SIGNUP / _SIGNIN / _FORGOT_PASSWORD. If a
 * legitimate-user complaint comes in, lowering the env var is the first
 * lever; raising it is how to respond to a bot wave.
 */
function getScoreThreshold(action?: string): number {
  const parse = (raw: string | undefined): number | null => {
    if (!raw) return null;
    const n = Number(raw);
    // Ignore anything nonsensical rather than accidentally disabling the
    // check (or blocking everyone) because of a typo'd env var.
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
  };

  const perAction: Record<string, number> = {
    signup: 0.3,
    signin: 0.2,
    forgot_password: 0.2,
    // Sends an email, like forgot_password; same bar.
    email_link: 0.2,
  };

  const key = (action || '').toLowerCase();
  const specific = parse(process.env[`RECAPTCHA_MIN_SCORE_${key.toUpperCase()}`]);
  const global = parse(process.env.RECAPTCHA_MIN_SCORE);

  return specific ?? global ?? perAction[key] ?? 0.3;
}

export async function POST(request: NextRequest) {
  try {
    const { token, action } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'reCAPTCHA token is required' },
        { status: 400 }
      );
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error('CRITICAL: reCAPTCHA secret key not configured!')
      // In production, this should fail - bots could exploit this
      // Only allow bypass in development environment
      if (process.env.NODE_ENV === 'development') {
        console.warn('Development mode: Bypassing reCAPTCHA verification')
        return NextResponse.json({ success: true, score: 1.0, skipped: true });
      }
      return NextResponse.json(
        { success: false, error: 'Security configuration error. Please try again later.' },
        { status: 500 }
      );
    }

    // Verify with Google reCAPTCHA
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;
    
    const response = await fetch(verificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data: RecaptchaResponse = await response.json();

    if (!data.success) {
      console.error('reCAPTCHA verification failed:', data['error-codes']);
      return NextResponse.json(
        { success: false, error: 'Security verification failed. Please try again.' },
        { status: 400 }
      );
    }

    // For reCAPTCHA v3, check the score (0.0 - 1.0).
    //
    // This was a flat 0.5 — Google's generic starting suggestion — and it was
    // rejecting real people. Observed in production: legitimate sign-ins
    // scoring exactly 0.3 and being turned away with "Suspicious activity
    // detected".
    //
    // 0.3 is not a bot signal, it is reCAPTCHA's "I don't recognise this
    // visitor" band, and this app's audience lands in it constantly: most
    // users are on Bangladeshi mobile carriers, which NAT enormous numbers of
    // people behind a handful of IPs (the same property that had to be worked
    // around in lib/utils/persistentRateLimit.ts), often signed out of Google,
    // frequently on low-end Android browsers. A score-based hard block tuned
    // for a Western desktop audience mostly blocks customers here.
    //
    // Sign-in is deliberately the most lenient: the password is the actual
    // security boundary, and it already sits behind a per-email rate limiter
    // (app/auth/page.tsx) plus Firebase Auth's own abuse protection. Account
    // creation keeps a higher bar, since that is the real abuse vector.
    const score = data.score ?? 1.0;
    const threshold = getScoreThreshold(action);

    if (score < threshold) {
      console.warn(
        `reCAPTCHA score too low: ${score} (threshold: ${threshold}, action: ${action || 'unspecified'}, hostname: ${data.hostname || 'unknown'})`
      );
      return NextResponse.json(
        {
          success: false,
          error:
            'We could not verify this request automatically. Please try again, ' +
            'or switch off any VPN or ad blocker and reload the page.',
        },
        { status: 400 }
      );
    }

    // Verify action matches (optional but recommended)
    if (action && data.action && data.action !== action) {
      console.warn(`reCAPTCHA action mismatch: expected ${action}, got ${data.action}`);
      return NextResponse.json(
        { success: false, error: 'Invalid reCAPTCHA action' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
    });

  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify reCAPTCHA' },
      { status: 500 }
    );
  }
}
