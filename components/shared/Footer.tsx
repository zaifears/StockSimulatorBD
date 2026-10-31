'use client';

// components/shared/Footer.tsx
// The site footer, shared by the homepage, /blog, blog articles, /about-us and
// /boss. Styles: components/shared/footer.css, which carries its own copy of the
// DESIGN.md tokens so it renders the same on pages that do not load app/home.css.
import { memo, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Facebook } from 'lucide-react';
import './footer.css';

interface InternalFooterLink {
  label: string;
  href: string;
}

interface SocialFooterLink {
  label: string;
  href: string;
  icon: ReactNode;
  ariaLabel: string;
}

const PLATFORM_LINKS: InternalFooterLink[] = [
  { label: 'Trade Simulator', href: '/trade' },
  { label: 'Stock Directory', href: '/stocks' },
  { label: 'DSE Learning Blog', href: '/blog' },
  { label: 'About Us', href: '/about-us' },
  { label: 'Privacy Policy', href: '/policy' },
];

const SOCIAL_LINKS: SocialFooterLink[] = [
  {
    label: 'Facebook',
    href: 'https://facebook.com/stocksimulatorbd/',
    icon: <Facebook size={16} />,
    ariaLabel: 'Follow StockSimulatorBD on Facebook',
  },
];

const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="sf">
      <div className="sf-wrap">
        <div className="sf-top">
          <div className="sf-brand">
            <Link href="/" aria-label="Go to StockSimulatorBD homepage" className="sf-mark">
              <Image src="/favicon.svg" alt="StockSimulatorBD logo" width={40} height={40} />
              <span className="sf-mark__word">
                StockSimulator<span>BD</span>
              </span>
            </Link>

            <p className="sf-blurb">
              Helping students and new investors, including those moving from Sanchayapatra and
              fixed deposits into the stock market, learn DSE-style trading through virtual trading,
              market education, and portfolio practice.
            </p>
          </div>

          <div className="sf-cols">
            <nav aria-label="Platform links">
              <h2 className="sf-head">Platform</h2>
              <ul className="sf-list" role="list">
                {PLATFORM_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="sf-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Social links">
              <h2 className="sf-head">Connect</h2>
              <ul className="sf-list" role="list">
                {SOCIAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.ariaLabel}
                      className="sf-link"
                    >
                      <span aria-hidden="true" className="sf-link__icon">
                        {link.icon}
                      </span>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="sf-base">
          <span>&copy; {currentYear} StockSimulatorBD. All rights reserved.</span>
          <p>
            Created by{' '}
            <a href="https://shahoriar.bd" target="_blank" rel="noopener noreferrer" className="sf-byline">
              Md Al Shahoriar Hossain
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
