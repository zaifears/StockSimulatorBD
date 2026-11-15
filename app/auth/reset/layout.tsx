import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Carries a one-time code in its URL: never index it, and never send the URL
// to another site as a referrer.
export const metadata: Metadata = {
  title: 'Reset your password | StockSimulatorBD',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
