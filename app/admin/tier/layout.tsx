import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Admin - Boss Tier Management | Stock Simulator BD',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminTierLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
