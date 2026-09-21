import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getAllDseStocks as fetchAllStocks, type DseStock } from '@/lib/dseStocks';
import { classifyInstrument, getInstrumentProfile, pickFitting } from '@/lib/dseInstrumentTypes';
import StockChart from '@/components/StockChart';
import StockTradingSection from '@/components/StockTradingSection';
import StockBackButton from '@/components/stocks/StockBackButton';
import { SITE_URL } from '@/lib/siteUrl';
import { resolvePageMetadata } from '@/lib/seo/metadataResolver';

const getAllDseStocks = cache(fetchAllStocks);

export const dynamic = 'force-static';

// SEO remains unchanged: the public HTML stays statically served and crawlable.
// This only changes how often Vercel rebuilds its cached copy.
export const revalidate = 86400; // 24 hours

// A company that lists after the last build is not in generateStaticParams yet.
// Leaving this on lets its page render on first request and then be cached, so a
// new DSE listing gets a page without a deploy. Unknown symbols still 404 via
// notFound() because the roster itself is the gate.
export const dynamicParams = true;

const BASE_URL = SITE_URL;

type RouteParams = {
  symbol: string;
};

type StockPageProps = {
  params: Promise<RouteParams>;
};

function formatSymbol(rawSymbol: string): string {
  return decodeURIComponent(rawSymbol).trim().toUpperCase();
}

function stockHref(symbol: string): string {
  return `/stocks/${encodeURIComponent(symbol.toLowerCase())}`;
}

/**
 * Symbols of the same instrument type sitting closest alphabetically. Gives every
 * page a handful of crawlable internal links instead of leaving 400+ leaf pages
 * reachable only from the directory index.
 */
function getRelatedStocks(current: DseStock, all: DseStock[], limit = 6): DseStock[] {
  const type = classifyInstrument(current.symbol, current.name);
  const sameType = all.filter(
    (item) => item.symbol !== current.symbol && classifyInstrument(item.symbol, item.name) === type
  );

  if (sameType.length <= limit) return sameType;

  const index = sameType.findIndex((item) => item.symbol.localeCompare(current.symbol) >= 0);
  const anchor = index === -1 ? sameType.length - 1 : index;
  const start = Math.max(0, Math.min(anchor - Math.floor(limit / 2), sameType.length - limit));

  return sameType.slice(start, start + limit);
}

export async function generateStaticParams(): Promise<RouteParams[]> {
  const stocks = await getAllDseStocks();
  return stocks.map((stock) => ({
    symbol: encodeURIComponent(stock.symbol.toLowerCase()),
  }));
}

export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const { symbol } = await params;
  const formattedSymbol = formatSymbol(symbol);
  const stocks = await getAllDseStocks();
  const stock = stocks.find((item) => item.symbol.toUpperCase() === formattedSymbol);

  if (!stock) {
    return {
      title: 'Stock not found | StockSimulatorBD',
      description: 'This DSE stock page is not available right now.',
      robots: { index: false, follow: true },
    };
  }

  const pageUrl = `${BASE_URL}${stockHref(stock.symbol)}`;

  // Audit flagged 37 titles over 60 chars and 21 descriptions over 160.
  // Company names run from 10 to 63 characters, so both are built by picking
  // the richest variant that still fits the window. A symbol pulled from the live
  // roster with no name entry yet skips the name-bearing variants entirely, so it
  // never renders as "GPX (GPX) Share Price".
  const named = stock.nameKnown;

  const title = pickFitting(
    [
      ...(named
        ? [
            `${stock.name} (${stock.symbol}) Share Price | StockSimulatorBD`,
            `${stock.name} (${stock.symbol}) DSE Share Price`,
          ]
        : []),
      `${stock.symbol} Share Price & Chart | StockSimulatorBD`,
      `${stock.symbol} DSE Share Price`,
    ],
    60
  );

  const description = pickFitting(
    [
      ...(named
        ? [
            `${stock.name} (${stock.symbol}) on the Dhaka Stock Exchange. View the price chart and practice trading ${stock.symbol} with virtual money, free.`,
            `${stock.name} (${stock.symbol}) on the DSE. View the chart and practice trading ${stock.symbol} with virtual money, free.`,
          ]
        : []),
      `${stock.symbol} on the Dhaka Stock Exchange. View the price chart and practice trading it risk-free with virtual money.`,
      `${stock.symbol} DSE share price chart and risk-free practice trading with virtual money.`,
    ],
    158
  );

  // Check for safe Level 1 metadata override from the Change Management System
  const resolved = await resolvePageMetadata(
    `/stocks/${formattedSymbol.toLowerCase()}`,
    title,
    description
  );
  const finalTitle = resolved.title;
  const finalDescription = resolved.description;

  return {
    title: finalTitle,
    description: finalDescription,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: finalTitle,
      description: finalDescription,
      url: pageUrl,
      siteName: 'StockSimulatorBD',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: finalTitle,
      description: finalDescription,
    },
  };
}

export default async function StockDetailsPage({ params }: StockPageProps) {
  const { symbol } = await params;
  const formattedSymbol = formatSymbol(symbol);
  const stocks = await getAllDseStocks();
  const stock = stocks.find((item) => item.symbol.toUpperCase() === formattedSymbol);

  if (!stock) {
    notFound();
  }

  const basePrice = (stock as unknown as { ltp?: number }).ltp || 0;
  const profile = getInstrumentProfile(stock.symbol, stock.name);
  const related = getRelatedStocks(stock, stocks);
  const pageUrl = `${BASE_URL}${stockHref(stock.symbol)}`;

  const named = stock.nameKnown;

  const faqs = [
    named
      ? {
          q: `What is the DSE ticker symbol for ${stock.name}?`,
          a: `${stock.name} trades on the Dhaka Stock Exchange under the ticker ${stock.symbol}. You use that symbol to look the ${profile.label} up on the exchange, with a broker, or inside the StockSimulatorBD practice terminal.`,
        }
      : {
          q: `What is ${stock.symbol}?`,
          a: `${stock.symbol} is a security listed on the Dhaka Stock Exchange. You use that ticker to look it up on the exchange, with a broker, or inside the StockSimulatorBD practice terminal.`,
        },
    {
      q: `Can I practice trading ${stock.symbol} without real money?`,
      a: `Yes. StockSimulatorBD lets you buy and sell ${stock.symbol} using a virtual balance. Orders follow the same rules the real market applies, including DSE trading hours, T+1 settlement and a 0.40% commission, but no real money is ever involved and the balance cannot be withdrawn.`,
    },
    {
      q: `Do I need a BO account to buy ${stock.symbol} here?`,
      a: `No. A BO account with a licensed broker is required to buy ${stock.symbol} for real on the Dhaka Stock Exchange, but not to practice on StockSimulatorBD. Many people rehearse here first and open a BO account afterwards.`,
    },
    {
      q: `When can I trade ${stock.symbol}?`,
      a: `The Dhaka Stock Exchange trades Sunday to Thursday from 10:00 to 14:15 Bangladesh time and is closed on Friday, Saturday and public holidays. The simulator enforces the same schedule, so ${stock.symbol} orders are only accepted while the real market is open.`,
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'DSE stocks', item: `${BASE_URL}/stocks` },
          { '@type': 'ListItem', position: 3, name: `${stock.symbol}`, item: pageUrl },
        ],
      },
      {
        '@type': 'FinancialProduct',
        name: stock.name,
        alternateName: stock.symbol,
        url: pageUrl,
        category: profile.badge,
        provider: { '@type': 'Organization', name: 'StockSimulatorBD', url: BASE_URL },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  const tradingRules = [
    { label: 'Exchange', value: 'DSE' },
    { label: 'Ticker', value: stock.symbol },
    { label: 'Trading hours', value: '10:00 to 14:15' },
    { label: 'Settlement', value: 'T+1' },
    { label: 'Commission', value: '0.40%' },
    { label: 'Practice balance', value: '৳10,000' },
  ];

  return (
    <main className="min-h-screen bg-white dark:bg-[#090E17] text-gray-800 dark:text-gray-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-8 sm:pt-40 sm:pb-12">

        {/* Prominent Back Button */}
        <StockBackButton symbol={stock.symbol} />

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-5 text-sm">
          <ol className="flex flex-wrap items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <li><Link href="/" className="inline-block py-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link></li>
            <li aria-hidden="true" className="text-gray-400 dark:text-gray-600">/</li>
            <li><Link href="/stocks" className="inline-block py-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">DSE stocks</Link></li>
            <li aria-hidden="true" className="text-gray-400 dark:text-gray-600">/</li>
            <li className="font-medium text-gray-900 dark:text-gray-200" aria-current="page">{stock.symbol}</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
              {stock.symbol}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {profile.badge}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight !leading-[1.1]">
            {named ? stock.name : stock.symbol} share price and chart
          </h1>
          <p className="mt-4 max-w-3xl text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            {named ? (
              <>
                {stock.name} is listed on the Dhaka Stock Exchange under the ticker{' '}
                <strong className="font-semibold text-gray-900 dark:text-gray-200">{stock.symbol}</strong>.
              </>
            ) : (
              <>
                <strong className="font-semibold text-gray-900 dark:text-gray-200">{stock.symbol}</strong>{' '}
                is a security listed on the Dhaka Stock Exchange.
              </>
            )}{' '}
            This page carries the price history chart for {stock.symbol} and lets you practice
            buying and selling it with virtual money, under the same trading hours, settlement
            delay and commission the real market applies.
          </p>
        </header>

        {/* Two grid rows, not one: the sticky trade sidebar only needs to sit
            beside the chart/rules/description content — pairing it with
            those three sections (not all five) in one grid row is what puts
            Buy/Sell right after "what this stock is" on mobile, while still
            giving the sidebar a tall row to stick within on desktop (the
            same mechanism a single wide row always used, just scoped to
            less content). FAQ and related-listings run full width below,
            with no sidebar of their own — they're supplementary, not part
            of the decision path toward placing an order. */}
        <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            <section
              aria-labelledby="chart-heading"
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] p-4 sm:p-6 shadow-sm"
            >
              <h2 id="chart-heading" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                {stock.symbol} price history
              </h2>
              <StockChart symbol={stock.symbol} />
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Chart data is derived from the published Dhaka Stock Exchange day-end archive.
                It can lag or contain gaps and should never be treated as an official quote.
              </p>
            </section>

            {/* Trading rules for this symbol */}
            <section
              aria-labelledby="rules-heading"
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] p-4 sm:p-6 shadow-sm"
            >
              <h2 id="rules-heading" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                How trading {stock.symbol} works here
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Nothing is loosened to make practice easier. An order for {stock.symbol} is
                accepted only while the Dhaka Stock Exchange is open, commission is deducted the
                way a broker would deduct it, and shares bought today cannot be sold until the
                next trading day.
              </p>

              <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-px bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                {tradingRules.map((rule) => (
                  <div key={rule.label} className="bg-white dark:bg-[#1A1F26] px-3 py-3.5">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {rule.label}
                    </dt>
                    <dd className="mt-1 font-mono text-sm sm:text-base font-semibold text-gray-900 dark:text-white tabular-nums">
                      {rule.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Instrument explainer */}
            <section
              aria-labelledby="about-heading"
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] p-4 sm:p-6 shadow-sm"
            >
              <h2 id="about-heading" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                What kind of listing {stock.symbol} is
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                {profile.explainer}
              </p>
              <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                {profile.practiceNote}
              </p>

              <div className="mt-5 rounded-xl bg-gray-50 dark:bg-[#111418] p-4 sm:p-5 border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-1.5">
                  Looking for {stock.symbol} fundamentals?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  StockSimulatorBD does not publish P/E ratios, EPS, NAV or financial statements.
                  For that level of company data, check a dedicated market data provider.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-4 border-l-2 border-gray-300 dark:border-gray-700 pl-2">
                  We do not use StockNow data, and this link is neither sponsored nor affiliated.
                </p>
                <a
                  href={`https://stocknow.com.bd/stocks/${stock.symbol.toUpperCase()}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center justify-center sm:justify-start w-full sm:w-auto gap-2 px-5 py-3 bg-white dark:bg-[#1A1F26] border border-gray-300 dark:border-gray-700 hover:border-blue-600 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 text-sm font-bold rounded-lg transition-all shadow-sm active:scale-95"
                >
                  View {stock.symbol} on StockNow
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2.5">
                  We are not responsible for the content of that site or for anything you do there.
                </p>
              </div>
            </section>
          </div>

          {/* Right column: the sticky Buy/Sell sidebar. Pairs with the chart
              + rules + description block above (not FAQ/related, which live
              in their own full-width row further down) — on mobile that
              means Buy/Sell lands right after "what this stock is", not
              buried under supplementary content; on desktop it's the sticky
              sidebar beside that same content, same as before. */}
          <div className="lg:sticky lg:top-6 space-y-6">
            <StockTradingSection symbol={stock.symbol} fallbackPrice={basePrice} />

            <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
              <h2 className="text-xl font-bold mb-2 tracking-tight">
                Practice {stock.symbol} risk-free
              </h2>
              <p className="text-blue-100 text-sm leading-relaxed mb-5">
                Test an idea on {stock.symbol} with virtual money in the full trading terminal,
                alongside the rest of your practice portfolio.
              </p>
              <Link
                href="/trade"
                className="flex w-full items-center justify-center rounded-xl bg-white text-blue-700 font-bold px-6 py-3.5 hover:bg-blue-50 transition-colors shadow-sm active:scale-95"
              >
                Open the trading terminal
              </Link>
            </section>
          </div>

        </div>

        {/* Full-width row: FAQ and related listings. Supplementary content,
            not part of the chart-then-description-then-Buy/Sell decision
            path above, so it doesn't need a sidebar of its own. */}
        <div className="space-y-6">
          <section
            aria-labelledby="faq-heading"
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] p-4 sm:p-6 shadow-sm"
          >
            <h2 id="faq-heading" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              {stock.symbol} questions people ask
            </h2>
            <div className="mt-5 space-y-5">
              {faqs.map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-snug">
                    {faq.q}
                  </h3>
                  <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {related.length > 0 && (
            <section
              aria-labelledby="related-heading"
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] p-4 sm:p-6 shadow-sm"
            >
              <h2 id="related-heading" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                Other DSE {profile.label} listings
              </h2>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {related.map((item) => (
                  <li key={item.symbol}>
                    <Link
                      href={stockHref(item.symbol)}
                      className="group flex items-baseline gap-2.5 rounded-lg px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#111418] transition-colors"
                    >
                      <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
                        {item.symbol}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                        {item.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/stocks"
                className="mt-3 inline-flex items-center gap-1.5 py-2.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Browse all DSE listings
              </Link>
            </section>
          )}
        </div>

      </div>
      </div>
    </main>
  );
}
