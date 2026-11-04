/**
 * Humanize Firebase Authentication Error Codes
 * Converts technical Firebase errors into user-friendly messages
 */

export function humanizeAuthError(error: any): string {
  // Check error code
  const code = error?.code || error?.message || '';
  
  // Email/Password errors
  if (code.includes('auth/user-not-found')) {
    return 'No account found with this email. Did you mean to sign up?';
  }
  
  if (code.includes('auth/wrong-password')) {
    return 'Incorrect password. Try again, use "Forgot password?", or — if you signed up with Google or GitHub — use that button instead.';
  }
  
  if (code.includes('auth/invalid-credential')) {
    // Modern Firebase returns this for a wrong password too. If the person
    // ever used "Continue with Google" on this email, Firebase replaced their
    // unverified password with the Google login, so point them there.
    return 'Email or password is incorrect. Check and try again, use "Forgot password?", or — if you signed up with Google or GitHub — use that button instead.';
  }
  
  if (code.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  
  if (code.includes('auth/weak-password')) {
    return 'Password is too weak. Use at least 6 characters with an uppercase and a lowercase letter.';
  }
  
  if (code.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  
  if (code.includes('auth/user-disabled')) {
    return 'This account has been disabled. Contact support for help.';
  }
  
  if (code.includes('auth/too-many-requests')) {
    return '⚠️ Too many failed attempts. Your account is temporarily locked. Reset your password to unlock immediately.';
  }
  
  if (code.includes('auth/operation-not-allowed')) {
    return 'This sign-in method is not currently enabled. Try another method.';
  }
  
  // Email-link (magic link) errors
  if (code.includes('auth/invalid-action-code') || code.includes('auth/expired-action-code')) {
    return 'This sign-in link has expired or was already used. Request a new one below.';
  }

  if (code.includes('auth/missing-continue-uri') || code.includes('auth/unauthorized-continue-uri')) {
    return 'Email sign-in links are not set up yet. Please use your password or Google for now.';
  }

  // Social auth errors
  if (code.includes('auth/popup-blocked')) {
    return '⚠️ Popup blocked! Please allow popups for this site in your browser settings. If using an in-app browser, try Safari or Firefox.';
  }
  
  if (code.includes('auth/popup-closed-by-user')) {
    return 'Sign-in was cancelled. Please try again.';
  }
  
  if (code.includes('auth/cancelled-popup-request')) {
    return 'Another sign-in popup is already open. Please close it and try again.';
  }
  
  if (code.includes('auth/account-exists-with-different-credential')) {
    return 'This email is already registered with a different sign-in method. Sign in the way you did the first time (Google, GitHub, or email and password).';
  }
  
  if (code.includes('auth/credential-already-in-use')) {
    return 'This account is already linked to another user.';
  }

  if (code.includes('auth/internal-error')) {
    return 'Authentication could not be completed due to a browser/session issue. Try again, disable strict privacy blockers for this site, or use email/password.';
  }

  if (code.includes('auth/redirect-failed')) {
    return 'Redirect sign-in failed. Please try popup sign-in again, or use email/password.';
  }
  
  // Network errors
  if (code.includes('timed out') || code.includes('timeout')) {
    return '⏱️ Connection took too long. Check your internet and try again.';
  }
  
  if (code.includes('network') || code.includes('offline')) {
    return '📡 Network error. Please check your internet connection and try again.';
  }
  
  // Generic fallback — don't expose raw error messages to users
  return 'An error occurred during sign-in. Please try again.';
}

/**
 * Map Firebase error code to technical issue for debugging
 */
export function debugAuthError(error: any): string {
  const code = error?.code || 'UNKNOWN';
  console.error(`[AUTH ERROR] ${code}:`, error?.message);
  return code;
}
