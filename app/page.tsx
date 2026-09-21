import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/shared/Footer';
import { OpenRemark } from '@/components/OpenRemark';
import { SITE_URL } from '@/lib/siteUrl';
import { resolvePageMetadata } from '@/lib/seo/metadataResolver';
import { ArrowRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

const SITE = SITE_URL;

export async function generateMetadata(): Promise<Metadata> {
  const defaultTitle = 'StockSimulatorBD: DSE Trading Simulator';
  const defaultDescription =
    'Free paper trading simulator for the Dhaka Stock Exchange. Practice DSE share trading with live prices, real market hours, T+1 rules and virtual money.';

  const resolved = await resolvePageMetadata('/', defaultTitle, defaultDescription);

  return {
    title: resolved.title,
    description: resolved.description,
    alternates: {
      canonical: SITE_URL,
    },
    openGraph: {
      title: resolved.title,
      description: resolved.description,
      url: SITE_URL,
      siteName: 'StockSimulatorBD',
      type: 'website',
    },
  };
}

const floorRules = [
  { label: 'Trading hours', value: '10:00 to 14:15' },
  { label: 'Trading days', value: 'Sun to Thu' },
  { label: 'Settlement', value: 'T+1' },
  { label: 'Commission', value: '0.40%' },
  { label: 'Starting balance', value: '৳10,000' },
  { label: 'Listed symbols', value: '300+' },
];

const practiceReasons = [
  'See how share prices actually move before your own money is riding on them',
  'Learn to read a ticker, a candlestick chart and a portfolio position',
  'Test a strategy across weeks without paying for the lesson',
  'Find out how you personally react to a red number',
  'Arrive at your first real trade already knowing the mechanics',
];

const steps = [
  {
    title: 'Open a free account',
    body: 'Verify your email and ৳10,000 in virtual balance lands in your account. No card, no deposit, nothing to lose.',
  },
  {
    title: 'Buy while the market is open',
    body: 'Choose from the companies currently listed on the Dhaka Stock Exchange at the price the exchange is quoting. The 0.40% commission comes off exactly the way a broker would take it.',
  },
  {
    title: 'Wait out T+1, then sell',
    body: 'Shares bought today unlock for selling on the next trading day. That wait is not a limitation of the simulator. It is the lesson.',
  },
];

const faqs = [
  {
    q: 'Is StockSimulatorBD a trading simulator / fake trading simulator?',
    a: 'Yes. It is a trading simulator / fake trading simulator in the sense that every balance and trade is virtual, so you can practise without risking real money. It uses published DSE prices and realistic market hours, commission and T+1 settlement rules to make the practice useful.',
  },
  {
    q: 'What is StockSimulatorBD?',
    a: 'StockSimulatorBD is a free paper trading simulator for the Dhaka Stock Exchange (DSE). You buy and sell real DSE listed shares using a virtual balance, under the same trading hours, settlement rules and commission the real market applies. It is an educational tool, not a brokerage.',
  },
  {
    q: 'Is it free to use?',
    a: 'Yes. Creating an account is free and every verified account starts with ৳10,000 of virtual balance. There is no subscription and no card required.',
  },
  {
    q: 'Does it use real Dhaka Stock Exchange prices?',
    a: 'Yes. Prices come from published DSE market data and update during trading hours. Because the data is scraped from public sources it can lag or contain gaps, so it should never be treated as an official quote.',
  },
  {
    q: 'Is this a stock market game?',
    a: 'Many people search for it that way, and the practice loop does feel like a game. The difference is that the rules are not softened to make it fun. Trades are blocked outside market hours, commission is deducted, and settlement takes a full day, because the point is to rehearse the real thing.',
  },
  {
    q: 'Do I need a BO account to practise here?',
    a: 'No. A BO account with a broker is required to trade real shares on the DSE, but not to use this simulator. Many people practise here first and open a BO account afterwards.',
  },
  {
    q: 'What are the DSE trading hours?',
    a: 'The Dhaka Stock Exchange trades Sunday to Thursday, from 10:00 to 14:15 Bangladesh time, and is closed on Friday, Saturday and public holidays. The simulator enforces the same schedule, so you cannot buy or sell outside it.',
  },
  {
    q: 'What is T+1 settlement?',
    a: 'T+1 means shares you buy today become available to sell on the next trading day, not the same day. The simulator enforces this per purchase, so a position bought this morning stays locked until tomorrow.',
  },
  {
    q: 'Can I withdraw the money I make?',
    a: 'No. The balance is virtual trading credit with no real world value. It cannot be withdrawn, redeemed for cash, transferred to another account or exchanged for anything outside the simulator.',
  },
];

const articles = [
  {
    href: '/blog/how-to-open-bo-account-bangladesh',
    tag: 'Beginner guide',
    title: 'How to open a BO account in Bangladesh (2026)',
    description: 'The exact steps, documents and fees needed to open a BO account and start trading on the DSE.',
  },
  {
    href: '/blog/top-dse-stock-brokers-2026',
    tag: 'Broker comparison',
    title: 'Compare the top DSE stock brokers in Bangladesh',
    description: 'BO account fees, commission rates and platform quality across leading DSE brokers, side by side.',
  },
];

const webAppSchema = {
  '@context': 'https://schema.org',
  '@type': ['WebApplication', 'SoftwareApplication'],
  name: 'StockSimulatorBD: DSE Trading Simulator',
  alternateName: ['Bangladesh Stock Market Game', 'Stocks Sim BD', 'Stock Market Game BD', 'DSE Paper Trading Simulator'],
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web Browser',
  url: SITE,
  inLanguage: ['en', 'bn'],
  description:
    'Free paper trading simulator for the Dhaka Stock Exchange. Practice DSE share trading with live prices, real market hours, T+1 settlement and 0.4% commission, all settled in virtual money.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BDT',
    availability: 'https://schema.org/InStock',
  },
  featureList: [
    'Live Dhaka Stock Exchange price data',
    'T+1 settlement enforced per purchase lot',
    '0.4% broker commission simulation',
    'Trading restricted to real DSE market hours',
    'Risk-free paper trading with virtual money',
    '300+ DSE listed companies',
  ],
  audience: {
    '@type': 'Audience',
    audienceType: 'Students and first-time investors in Bangladesh',
    geographicArea: { '@type': 'Country', name: 'Bangladesh' },
  },
  publisher: {
    '@type': 'Organization',
    name: 'StockSimulatorBD',
    url: SITE,
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col w-full bg-white dark:bg-[#090E17] transition-colors duration-300 pb-safe overflow-x-hidden text-gray-800 dark:text-gray-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* HERO */}
      <section className="relative w-full pt-36 pb-14 sm:pt-40 sm:pb-20 overflow-hidden border-b border-gray-200 dark:border-gray-800/60">
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(to_right,#3b82f612_1px,transparent_1px),linear-gradient(to_bottom,#3b82f612_1px,transparent_1px)]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[300px] bg-blue-600/10 dark:bg-blue-600/15 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="animate-rise text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight !leading-[1.15] sm:!leading-[1.1]">
            Dhaka Stock Exchange Paper Trading Simulator.{' '}
            <span className="block sm:inline text-blue-600 dark:text-blue-400">All the rules, zero risk.</span>
          </h1>

          <p
            className="animate-rise mt-5 sm:mt-6 text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto"
            style={{ animationDelay: '90ms' }}
          >
            StockSimulatorBD is a free paper trading simulator for the Dhaka Stock Exchange.
            Practice buying and selling DSE shares at live market prices, under real trading
            hours, T+1 settlement and 0.40% commission, using virtual money instead of your own.
          </p>

          <div
            className="animate-rise mt-8 flex flex-col sm:flex-row sm:justify-center items-stretch sm:items-center gap-3 sm:gap-4"
            style={{ animationDelay: '180ms' }}
          >
            <Link
              href="/trade"
              prefetch
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-base sm:text-lg font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-300"
            >
              Start trading now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-blue-600 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 active:scale-95 transition-all duration-200"
            >
              Read the guides first
            </Link>
          </div>

          <p
            className="animate-rise mt-6 text-sm text-gray-500 dark:text-gray-400"
            style={{ animationDelay: '240ms' }}
          >
            Free to use. The balance is virtual and has no real world value.
          </p>
        </div>
      </section>

      {/* THE RULES OF THE FLOOR */}
      <section className="w-full bg-gray-50 dark:bg-[#111418] border-b border-gray-200 dark:border-gray-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              The floor runs on the exchange&apos;s own rules
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              Nothing has been loosened to make practice comfortable. When the DSE is closed,
              so is this. When settlement takes a day, you wait the day. Practice only counts
              if the constraints are the real ones.
            </p>
          </div>

          <dl className="mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            {floorRules.map((rule) => (
              <div key={rule.label} className="bg-gray-50 dark:bg-[#111418] px-4 py-4 sm:py-5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {rule.label}
                </dt>
                <dd className="mt-1.5 font-mono text-base sm:text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
                  {rule.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* WHO IT IS FOR */}
      <section className="w-full bg-white dark:bg-[#090E17] border-b border-gray-200 dark:border-gray-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight max-w-2xl">
            Built for the first trade you have not made yet
          </h2>

          <div className="mt-8 sm:mt-10 grid md:grid-cols-2 gap-8 md:gap-0">
            <div className="md:pr-12">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Students and first time learners
              </h3>
              <p className="mt-3 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Curious about the share market but with no capital to put at risk, and probably
                no BO account yet. Here you can watch prices move, place orders, hold a position
                overnight and see what a portfolio does over a month, at no cost and with
                nothing riding on being wrong.
              </p>
            </div>

            <div className="md:pl-12 md:border-l border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Savers moving beyond Sanchayapatra and FDR
              </h3>
              <p className="mt-3 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                You already know how to save. Shares are the part that feels intimidating,
                because the money at stake took years to put aside. Practice here until the
                mechanics are ordinary, and let your first real order be a decision rather
                than a leap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS PAPER TRADING */}
      <section className="w-full bg-gray-50 dark:bg-[#111418] border-b border-gray-200 dark:border-gray-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                What is <span className="text-blue-600 dark:text-blue-400">paper trading</span>?
              </h2>
              <p className="mt-5 sm:mt-6 text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Paper trading, also called simulator trading or virtual trading, means placing
                trades with fake money in an environment that mirrors real market conditions.
                The name comes from the days when traders wrote hypothetical positions down on
                paper. Platforms like this one just do the arithmetic for you, against live data.
              </p>
              <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Plenty of people search for it as a stock market game or a stocks sim instead.
                Same idea, different words. StockSimulatorBD is that game for Bangladesh
                specifically, tied to the Dhaka Stock Exchange rather than to a generic global market.
              </p>

              <div className="mt-7 flex items-start gap-3 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-amber-900 dark:text-amber-200 text-sm leading-relaxed">
                  Finding a paper trading platform built for the Bangladesh stock market is
                  genuinely hard. Almost every simulator targets US markets, which leaves
                  Bangladeshi investors practicing on tickers and rules they will never actually trade.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1A1F26] rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Why practice first</h3>
              <ul className="mt-6 space-y-4">
                {practiceReasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                      {reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="w-full bg-white dark:bg-[#090E17] border-b border-gray-200 dark:border-gray-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Three steps, in this order
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              The sequence matters, because the waiting is part of what you are here to learn.
            </p>
          </div>

          <ol className="mt-8 sm:mt-10 ml-4 max-w-3xl border-l border-gray-200 dark:border-gray-800">
            {steps.map((step, index) => (
              <li key={step.title} className="relative pl-7 sm:pl-10 pb-9 last:pb-0">
                <span
                  className="absolute -left-[13px] top-0 flex items-center justify-center w-[26px] h-[26px] rounded-full bg-blue-600 text-white font-mono text-xs font-bold tabular-nums"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              The market trades Sunday to Thursday, 10:00 to 14:15. Outside those hours you can
              research, but not buy or sell.
            </span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full bg-gray-50 dark:bg-[#111418] border-b border-gray-200 dark:border-gray-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight max-w-2xl">
            Questions people ask before they start
          </h2>

          <div className="mt-8 sm:mt-10 grid md:grid-cols-2 gap-x-12 gap-y-8">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug">
                  {faq.q}
                </h3>
                <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 max-w-3xl" lang="bn">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">বাংলায় সংক্ষেপে</h3>
            <p className="mt-3 text-base text-gray-600 dark:text-gray-400 leading-loose">
              স্টকসিমুলেটরবিডি হলো ঢাকা স্টক এক্সচেঞ্জের (ডিএসই) জন্য একটি ফ্রি পেপার ট্রেডিং
              সিমুলেটর। এখানে আসল বাজারের দামে, আসল সময়ে এবং আসল নিয়মে শেয়ার কেনাবেচা
              অনুশীলন করা যায়, তবে টাকাটা ভার্চুয়াল। ভুল করলেও আসল কোনো ক্ষতি হয় না।
              বাজার খোলা থাকে রবিবার থেকে বৃহস্পতিবার, সকাল ১০টা থেকে দুপুর ২টা ১৫ পর্যন্ত।
            </p>
          </div>
        </div>
      </section>

      {/* COMMENTS */}
      <section className="w-full bg-white dark:bg-[#090E17] border-b border-gray-200 dark:border-gray-800/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Still have a question?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            Ask below and it gets answered here, where the next person with the same question
            can find it. Please do not post your BO account number, broker login or any personal
            financial details.
          </p>
          <div className="mt-8">
            <OpenRemark />
          </div>
        </div>
      </section>

      {/* LEARN BEFORE YOU TRADE */}
      <section className="w-full bg-white dark:bg-[#090E17] border-b border-gray-200 dark:border-gray-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight max-w-2xl">
            Learn before you trade
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
            Practical guides for Bangladeshi investors, from opening a BO account to choosing
            a broker.
          </p>

          <ul className="mt-8 sm:mt-10 border-t border-gray-200 dark:border-gray-800">
            {articles.map((article) => (
              <li key={article.href}>
                <Link
                  href={article.href}
                  className="group flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-8 py-5 sm:py-6 border-b border-gray-200 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-[#1A1F26] -mx-4 px-4 sm:-mx-6 sm:px-6"
                >
                  <span className="sm:w-44 flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {article.tag}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {article.title}
                    </span>
                    <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {article.description}
                    </span>
                  </span>
                  <ArrowRight className="hidden sm:block w-5 h-5 flex-shrink-0 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/blog"
            className="mt-8 inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white active:scale-95 transition-all duration-200"
          >
            Browse every guide
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CLOSING */}
      <section className="w-full bg-white dark:bg-[#090E17]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
            Nobody&apos;s first real trade should be their first trade
          </h2>
          <p className="mt-5 sm:mt-6 text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            Open the floor, place a few orders and get some of them wrong while it costs
            nothing. Then do it with your own money, already knowing what to expect.
          </p>
          <Link
            href="/trade"
            className="mt-8 sm:mt-10 inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-300"
          >
            Start trading now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <div className="mt-auto z-10 bg-white dark:bg-[#090E17] border-t border-gray-200 dark:border-gray-800/60">
        <Footer />
      </div>
    </main>
  );
}
