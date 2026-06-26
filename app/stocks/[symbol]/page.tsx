import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getAllDseStocks as fetchAllStocks } from '@/lib/dseStocks';
import StockChart from '@/components/StockChart';
import StockTradingSection from '@/components/StockTradingSection';

const getAllDseStocks = cache(fetchAllStocks);

export const revalidate = 3600;

type RouteParams = {
  symbol: string;
};

type StockPageProps = {
  params: Promise<RouteParams>;
};

function formatSymbol(rawSymbol: string): string {
  return decodeURIComponent(rawSymbol).trim().toUpperCase();
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
      title: 'Stock Not Found | StockSimulatorBD DSE Simulator',
      description: 'This DSE stock page is not available right now.',
    };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'https://www.stocksimulator.tech').replace(/\/$/, '');
  const pageUrl = `${baseUrl}/stocks/${encodeURIComponent(stock.symbol.toLowerCase())}`;
  const title = `${stock.symbol} Stock Price, Share History & Analysis | StockSimulatorBD`;
  const description = `Track ${stock.name} (${stock.symbol}) with historical context and market insights. Practice trading ${stock.symbol} risk-free on the StockSimulatorBD DSE Simulator.`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'StockSimulatorBD',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
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

  // Fallback to 0 if ltp is missing from the stock data definition
  const basePrice = (stock as any).ltp || 0;

  return (
    <main className="bg-slate-50 dark:bg-slate-950 min-h-screen py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FinancialProduct",
              "name": stock.name,
              "alternateName": stock.symbol,
              "exchange": "Dhaka Stock Exchange",
              "provider": {
                "@type": "Organization",
                "name": "StockSimulatorBD",
                "url": process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://www.stocksimulator.tech"
              }
            })
          }}
        />

        {/* ── Page Header ── */}
        <header className="mb-6 sm:mb-8">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1 sm:mb-2">
            Dhaka Stock Exchange Profile
          </p>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
            {stock.name} <span className="text-slate-400 dark:text-slate-500 font-medium">({stock.symbol})</span>
          </h1>
        </header>

        {/* ── Responsive Dashboard Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Charts and Content */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
                Historical Price Chart
              </h2>
              <StockChart symbol={stock.symbol} />
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
                About {stock.name}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base mb-6">
                {stock.name} ({stock.symbol}) is one of the listed companies on the Dhaka Stock Exchange (DSE). This page is designed to help learners and aspiring investors understand the stock at a high level by combining price context, company background, and trading practice guidance. 
              </p>
              
              {/* ── External Link Section with Legal Disclaimers ── */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700/50">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                  Need in-depth financial data?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  For official fundamental analysis, P/E ratios, and detailed financials for {stock.symbol}, we recommend checking external market data providers.
                </p>
                
                {/* Explicit Non-Sponsorship Disclaimer */}
                <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-4 border-l-2 border-slate-300 dark:border-slate-600 pl-2">
                  * Please note: We do not use the data of StockNow, nor is this link sponsored or affiliated.
                </p>

                <a 
                  href={`https://stocknow.com.bd/stocks/${stock.symbol.toUpperCase()}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center justify-center sm:justify-start w-full sm:w-auto gap-2 px-5 py-3 sm:py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-bold rounded-lg transition-all shadow-sm group"
                >
                  View {stock.symbol} on StockNow
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                
                {/* Liability Disclaimer */}
                <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-2.5 text-center sm:text-left">
                  We are not responsible for the content or any actions taken on StockNow.
                </p>
              </div>
            </section>
          </div>

          {/* Right Column: Interaction Panel (Sticky on Desktop) */}
          <div className="lg:sticky lg:top-6 space-y-6">
            <StockTradingSection symbol={stock.symbol} fallbackPrice={basePrice} />

            <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-md">
              <h2 className="text-xl sm:text-2xl font-bold mb-2 tracking-tight">
                Risk-Free Sandbox
              </h2>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed mb-5 opacity-90">
                Want to test your trade strategy on {stock.symbol} without risking real capital? Explore your current dashboard inside the main workspace terminal.
              </p>
              <Link
                href="/simulator"
                className="flex w-full items-center justify-center rounded-xl bg-white text-blue-700 font-bold px-6 py-3.5 hover:bg-blue-50 transition-colors shadow-sm active:scale-95"
              >
                Go To Main Simulator
              </Link>
            </section>
          </div>

        </div>
      </div>
    </main>
  );
}