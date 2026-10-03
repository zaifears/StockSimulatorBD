import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL, absoluteUrl } from '@/lib/siteUrl';

export const metadata: Metadata = {
  title: 'About Us | StockSimulatorBD - Bangladesh Paper Trading Platform',
  description:
    'Learn about StockSimulatorBD: Bangladesh’s free DSE paper trading simulator built for students learning the market and new investors moving from Sanchayapatra into stocks.',
  alternates: {
    canonical: absoluteUrl('/about-us'),
  },
  openGraph: {
    title: 'About StockSimulatorBD | Bangladesh Stock Market Simulator',
    description:
      'Empowering the next generation of Bangladeshi investors with risk-free DSE trading education, real market hours, and authentic settlement rules.',
    url: absoluteUrl('/about-us'),
    siteName: 'StockSimulatorBD',
    type: 'website',
    images: [
      {
        url: absoluteUrl('/og/og-image.png'),
        width: 1200,
        height: 630,
        alt: 'About StockSimulatorBD - DSE Trading Simulator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About StockSimulatorBD | Bangladesh Stock Market Simulator',
    description:
      'Empowering Bangladeshi students and new investors with risk-free DSE paper trading.',
    images: [absoluteUrl('/og/og-image.png')],
  },
};

export default function AboutUsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
