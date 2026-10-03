import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Portfolio Dashboard | StockSimulatorBD',
  description: 'Manage your virtual holdings, order lots, banked profit & loss, and portfolio insights on StockSimulatorBD.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function PortfolioLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
