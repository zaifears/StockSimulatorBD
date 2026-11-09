import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Login/sign-up is not search content. Keep it out of the index with noindex
// (not robots.txt): Google must be allowed to fetch the page to see this tag.
export const metadata: Metadata = {
  title: 'Log in or Sign up | StockSimulatorBD',
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
