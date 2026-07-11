import { getAllDseStocks } from '@/lib/dseStocks';
import StockGrid from '@/components/stocks/StockGrid';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DSE Stock Directory | Dhaka Stock Exchange Ticker List',
  description: 'Explore the full list of Dhaka Stock Exchange (DSE) stocks. Research tickers, view market data, and practice trading risk-free on Stock Simulator BD.',
  openGraph: {
    title: 'DSE Stock Directory | Dhaka Stock Exchange Ticker List',
    description: 'Explore the full list of Dhaka Stock Exchange (DSE) stocks. Research tickers, view market data, and practice trading risk-free on Stock Simulator BD.',
    url: 'https://www.stocksimulator.tech/stocks',
    siteName: 'Stock Simulator BD',
  },
  alternates: {
    canonical: 'https://www.stocksimulator.tech/stocks',
  },
};

export default async function StocksDirectoryPage() {
  const stocks = await getAllDseStocks();
  return (
    <main className="min-h-screen flex flex-col w-full bg-white dark:bg-[#090E17] transition-colors duration-300">
      <section className="relative w-full pt-24 pb-16 md:pt-32 md:pb-20 overflow-hidden border-b border-gray-100 dark:border-gray-800/60">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#3b82f615_1px,transparent_1px),linear-gradient(to_bottom,#3b82f615_1px,transparent_1px)]" />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[300px] bg-blue-500/10 dark:bg-blue-600/15 blur-[100px] rounded-full" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center animate-fade-in-up">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
            DSE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Stock Directory</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Browse all listed companies on the Dhaka Stock Exchange. Use the directory to research tickers or jump to a stock&apos;s detail page.
          </p>
        </div>
      </section>
      <StockGrid initialStocks={stocks} />
    </main>
  );
}