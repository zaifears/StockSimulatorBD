// lib/authMethods.ts
// The sign-in buttons we track, shared by the client tracker, the
// /api/auth/method-event route and the /admin card. Client-safe.

export const AUTH_METHODS = [
  'google',
  'google_one_tap',
  'github',
  'facebook',
  'email_password',
  'email_link',
] as const;

export type AuthMethod = (typeof AUTH_METHODS)[number];

export const AUTH_METHOD_LABELS: Record<AuthMethod, string> = {
  google: 'Continue with Google',
  google_one_tap: 'Google One Tap',
  github: 'Continue with GitHub',
  facebook: 'Continue with Facebook',
  email_password: 'Email + password',
  email_link: 'Email sign-in link',
};

export function isAuthMethod(value: unknown): value is AuthMethod {
  return typeof value === 'string' && (AUTH_METHODS as readonly string[]).includes(value);
}

/**
 * Firebase's `sign_in_provider` claim for each method. Used server-side so a
 * client can't credit a Google sign-in to the Facebook button. Email-link
 * sign-ins report "emailLink" or "password" depending on SDK version.
 */
export const PROVIDERS_FOR_METHOD: Record<AuthMethod, readonly string[]> = {
  google: ['google.com'],
  google_one_tap: ['google.com'],
  github: ['github.com'],
  facebook: ['facebook.com'],
  email_password: ['password'],
  email_link: ['emailLink', 'password'],
};

/** Best guess when the client didn't say which button was used. */
export function methodFromProvider(provider: string | undefined): AuthMethod | null {
  switch (provider) {
    case 'google.com': return 'google';
    case 'github.com': return 'github';
    case 'facebook.com': return 'facebook';
    case 'password': return 'email_password';
    case 'emailLink': return 'email_link';
    default: return null;
  }
}

export interface AuthMethodCounts {
  clicks: number;
  signIns: number;
  signUps: number;
}
