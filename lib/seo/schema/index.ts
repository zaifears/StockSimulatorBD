// lib/seo/schema/index.ts
// Centralized structured data (JSON-LD) generators.
// Strictly uses schema.org definitions that genuinely describe platform capabilities.

import { SITE_URL, absoluteUrl } from '@/lib/siteUrl';

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'StockSimulatorBD',
    url: SITE_URL,
    logo: absoluteUrl('/logo.png'),
    description: 'A Bangladesh-focused Dhaka Stock Exchange (DSE) paper-trading and stock-market education platform.',
    sameAs: [
      'https://github.com/zaifears/StockSimulatorBD',
    ],
  };
}

export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'StockSimulatorBD',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/stocks')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function getSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'StockSimulatorBD Trade Terminal',
    operatingSystem: 'Any (Web Application)',
    applicationCategory: 'FinanceApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BDT',
    },
    description: 'Free risk-free paper trading platform for the Dhaka Stock Exchange (DSE) with virtual portfolios.',
  };
}

export function getBreadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
