// lib/welcomeBonusEligibility.ts
// Who may receive the 10,000-coin welcome bonus. Shared by the client
// (contexts/AuthContext.tsx, decides when to ask) and the server
// (app/api/auth/grant-social-bonus, decides whether to pay) so the two can
// never disagree.
//
// Rule: a verified email, OR an account signed in through a provider that
// already vouches for a real person. Firebase marks GitHub and Facebook
// accounts emailVerified=false even though the provider checked the address,
// so a plain emailVerified check would starve those users of the bonus
// forever (and the verify-email banner is hidden for them).

export const TRUSTED_SOCIAL_PROVIDERS = ['google.com', 'github.com', 'facebook.com'] as const;

export function isWelcomeBonusEligible(user: {
  emailVerified?: boolean;
  providerData?: ReadonlyArray<{ providerId?: string } | null | undefined>;
}): boolean {
  if (user.emailVerified) return true;
  return (user.providerData || []).some(
    (p) => !!p?.providerId && (TRUSTED_SOCIAL_PROVIDERS as readonly string[]).includes(p.providerId)
  );
}

/** Social provider sign-ins never need the "verify your email" banner. */
export function usesTrustedSocialProvider(user: {
  providerData?: ReadonlyArray<{ providerId?: string } | null | undefined>;
}): boolean {
  return isWelcomeBonusEligible({ emailVerified: false, providerData: user.providerData });
}
