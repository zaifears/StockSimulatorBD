import { Metadata } from 'next';
import { ReactNode } from 'react';
import { absoluteUrl } from '@/lib/siteUrl';

export const metadata: Metadata = {
  title: 'Boss Pro Access - Level Up Your Trading | Stock Simulator BD',
  description: 'Upgrade from Bro to Boss on StockSimulatorBD. Get official PDF statements, deep portfolio insights, unlimited trade audits, and +10% coin bonuses starting at just ৳20.',
  keywords: ['Boss plan', 'DSE simulator pro', 'StockSimulatorBD Boss', 'Bangladesh stock market', 'portfolio PDF', 'trading analytics'],
  openGraph: {
    title: 'Boss Pro Access | Stock Simulator BD',
    description: 'Upgrade from Bro to Boss. Unlock deep DSE portfolio analytics, official PDF statements, and coin bonuses starting at ৳20.',
    url: absoluteUrl('/boss'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boss Pro Access | Stock Simulator BD',
    description: 'Level up your DSE trading edge with StockSimulatorBD Boss.',
  },
};

export default function BossLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
