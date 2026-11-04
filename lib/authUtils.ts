// Security utilities for authentication
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 100;
};

// Shown live under the sign-up password field. Must stay in step with
// validatePassword below.
export const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'At least 6 characters', test: (pw) => pw.length >= 6 && pw.length <= 128 },
  { label: 'One uppercase letter (A–Z)', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter (a–z)', test: (pw) => /[a-z]/.test(pw) },
];

export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be less than 128 characters' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  return { isValid: true, message: '' };
};

export const sanitizeError = (error: any): string => {
  // Security: Don't expose internal Firebase error details
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';
  
  // Log for debugging (remove in production if needed)
  console.error('Auth error code:', errorCode);
  console.error('Auth error message:', errorMessage);
  
  switch (errorCode) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'Email address is already registered.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled. Please contact support.';
    case 'auth/internal-error':
      return 'An internal error occurred. Please try again.';
    default:
      // Security: Don't expose raw error messages to users
      return 'Authentication failed. Please try again.';
  }
};

// Defense-in-depth only: client-side sessionStorage rate limiting is trivially
// bypassable. Server-side reCAPTCHA v3 is the primary bot protection.
export const rateLimit = (() => {
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  // Load persisted attempts from sessionStorage
  const loadAttempts = (): { [key: string]: number[] } => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = sessionStorage.getItem('stocksimulatorbd_rate_limit');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const saveAttempts = (attempts: { [key: string]: number[] }) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('stocksimulatorbd_rate_limit', JSON.stringify(attempts));
    } catch {
      // sessionStorage full or unavailable - continue without persistence
    }
  };

  return (identifier: string): boolean => {
    const now = Date.now();
    const attempts = loadAttempts();
    const userAttempts = attempts[identifier] || [];
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(time => now - time < WINDOW_MS);
    
    if (recentAttempts.length >= MAX_ATTEMPTS) {
      return false; // Rate limited
    }
    
    // Add current attempt
    recentAttempts.push(now);
    attempts[identifier] = recentAttempts;
    saveAttempts(attempts);
    
    return true; // Allow attempt
  };
})();
