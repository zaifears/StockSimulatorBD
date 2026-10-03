import { Metadata } from 'next';
import { ReactNode } from 'react';
import { absoluteUrl } from '@/lib/siteUrl';

export const metadata: Metadata = {
  title: 'Coins - Your Trading Balance | Stock Simulator BD',
  description: 'View your Coin balance, recharge via bKash, and start trading on the DSE simulator. 20 BDT = 10,000 Coins.',
  keywords: ['Coins', 'trading balance', 'DSE simulator', 'virtual trading', 'Bangladesh stock exchange', 'bKash recharge'],
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: 'Coins - Your Trading Balance | Stock Simulator BD',
    description: 'View your Coin balance, recharge via bKash, and trade DSE stocks. 20 BDT = 10,000 Coins.',
    url: absoluteUrl('/coins'),
    type: 'website',
    images: [
      {
        url: absoluteUrl('/og/og-image-coins.png'),
        width: 1200,
        height: 630,
        alt: 'Stock Simulator BD Coins - Your Trading Balance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coins - Your Trading Balance | Stock Simulator BD',
    description: 'View your Coin balance and trade DSE stocks in the simulator',
    images: [absoluteUrl('/og/og-image-coins.png')],
  },
};

export default function CoinsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}