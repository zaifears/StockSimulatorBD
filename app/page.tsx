import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/shared/Footer';
import { OpenRemark } from '@/components/OpenRemark';
import { SITE_URL } from '@/lib/siteUrl';
import { resolvePageMetadata } from '@/lib/seo/metadataResolver';
import { ArrowRight } from 'lucide-react';
import './home.css';

const SITE = SITE_URL;

export async function generateMetadata(): Promise<Metadata> {
  const defaultTitle = 'StockSimulatorBD: DSE Trading Simulator & Market Practice';
  const defaultDescription =
    'Free paper trading simulator for the Dhaka Stock Exchange. Practice DSE share trading with live prices, real market hours (Sun–Thu 10:00–14:15), T+2/T+3 settlement and virtual money.';

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
  { label: 'Trading hours', value: '10:00 to 14:15', note: 'Dhaka time. Orders outside this window are blocked.' },
  { label: 'Trading days', value: 'Sun to Thu', plain: true, note: 'Closed on Friday, Saturday and public holidays.' },
  { label: 'Settlement', value: 'T+2 or T+3', note: 'Categories A, B, G and N can be sold two trading days after purchase. Category Z takes three.' },
  { label: 'Commission', value: '0.40%', note: 'Taken on every order, the way a broker would take it.' },
  { label: 'Starting balance', value: '৳10,000', note: 'Virtual, credited when you verify your email.' },
  { label: 'Listed symbols', value: '300+', note: 'Companies listed on the Dhaka Stock Exchange.' },
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
    title: 'Wait out settlement, then sell',
    body: 'Shares unlock for selling two trading days after you buy them, or three for category Z stocks. That wait is not a limitation of the simulator. It is the lesson.',
  },
];

const faqs = [
  {
    q: 'Is DSE open today? What are the trading hours and schedule?',
    a: 'The Dhaka Stock Exchange (DSE) is open for trading Sunday through Thursday from 10:00 AM to 2:15 PM Bangladesh Standard Time (BST). The market is closed on Fridays, Saturdays, and official Bangladesh public holidays. StockSimulatorBD enforces these exact market hours in real time.',
  },
  {
    q: 'What are the official DSE trading sessions and market schedule?',
    a: 'The DSE trading schedule consists of: 1) Continuous Trading Session from 10:00 AM to 2:15 PM BST, and 2) Post-Closing Session from 2:15 PM to 2:30 PM BST (orders match at the day’s closing price only). Trading takes place Sunday through Thursday. DSE is closed on Fridays, Saturdays, and gazetted national holidays.',
  },
  {
    q: 'Is DSE open tomorrow?',
    a: 'The Dhaka Stock Exchange is open tomorrow if tomorrow falls on a regular trading day (Sunday through Thursday) and is not a gazetted national or religious holiday in Bangladesh. Trading hours run from 10:00 AM to 2:15 PM BST.',
  },
  {
    q: 'What is a BO account and how to open one in Bangladesh?',
    a: 'A BO (Beneficiary Owner) account is an electronic share depository account maintained with CDBL (Central Depository Bangladesh Limited) through a registered DSE broker. You can open a BO account online from home using your NID, photo, bank cheque leaf, and nominee details. A BO account is required to trade real shares on the DSE, but not to practice on StockSimulatorBD.',
  },
  {
    q: 'What documents are required to open a BO account online in Bangladesh? (বিও একাউন্ট খুলতে কি কি লাগে)',
    a: 'To open a BO account online in Bangladesh, you need: 1) Your National ID (NID) card, 2) Passport-size digital photo, 3) Bank account cheque leaf or bank statement displaying the routing number, 4) Nominee NID and passport-size photo, and 5) Payment for the CDBL annual maintenance fee (৳450). Most top DSE brokers offer paperless submission.',
  },
  {
    q: 'How many BO accounts can I open in Bangladesh?',
    a: 'Under BSEC regulations, an individual investor in Bangladesh can open a maximum of two BO accounts under their own name: one single account and one joint account. You can also open accounts across different brokerage houses, provided they link to your unique NID in CDBL.',
  },
  {
    q: 'What are the best brokerage houses and DSE brokers in Bangladesh?',
    a: 'The top DSE brokerage houses in Bangladesh include LankaBangla Securities, BRAC EPL Stock Brokerage, IDLC Securities, City Brokerage, and EBL Securities. Broker commissions typically range between 0.30% and 0.50% per trade. StockSimulatorBD simulates the standard exchange average of 0.40% commission on every order.',
  },
  {
    q: 'Is there a stock market game or demo trading app for Bangladesh?',
    a: 'Yes. StockSimulatorBD is the dedicated stock market game and paper trading simulator built specifically for the Dhaka Stock Exchange. Registered users receive ৳10,000 in virtual trading currency to practice live DSE equity trades risk-free under authentic market hours, T+2/T+3 settlement, and 0.40% commission.',
  },
  {
    q: 'What is a circuit breaker and lower circuit in the share market?',
    a: 'A circuit breaker is a regulatory price control mechanism set by BSEC that caps the maximum percentage a share price can rise or fall in a single day. A lower circuit is the minimum price a share can drop to, and an upper circuit is the maximum it can rise. Orders outside these circuit breaker limits cannot execute.',
  },
  {
    q: 'Is StockSimulatorBD a trading simulator / fake trading simulator?',
    a: 'Yes. It is a trading simulator / fake trading simulator in the sense that every balance and trade is virtual, so you can practise without risking real money. It uses published DSE prices and realistic market hours, commission and T+2/T+3 settlement rules to make the practice useful.',
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
    a: 'Many people search for it that way, and the practice loop does feel like a game. The difference is that the rules are not softened to make it fun. Trades are blocked outside market hours, commission is deducted, and settlement takes two or three trading days, because the point is to rehearse the real thing.',
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
    q: 'What is T+2 settlement?',
    a: 'Settlement is the wait between buying shares and being able to sell them. Shares in categories A, B, G and N settle T+2, so they can be sold two trading days after purchase. Category Z shares settle T+3. The simulator enforces this per purchase and per category, counting only trading days, so shares bought on a Thursday stay locked until Monday (Tuesday for category Z).',
  },
  {
    q: 'Can I withdraw the money I make?',
    a: 'No. The balance is virtual trading credit with no real world value. It cannot be withdrawn, redeemed for cash, transferred to another account or exchanged for anything outside the simulator.',
  },
];

const articles = [
  {
    href: '/blog/dse-trading-hours-bangladesh',
    tag: 'Market schedule',
    title: 'Is DSE open today? Trading hours, schedule & holidays (2026)',
    description: 'Current DSE trading sessions, opening and closing times, Friday–Saturday weekends, and Bangladesh public holidays.',
  },
  {
    href: '/blog/how-to-open-bo-account-bangladesh',
    tag: 'Beginner guide',
    title: 'How to open a BO account in Bangladesh (2026 online guide)',
    description: 'The exact steps, required NID documents, CDBL fees, single vs joint account limits, and how to start trading.',
  },
  {
    href: '/blog/top-dse-stock-brokers-2026',
    tag: 'Broker comparison',
    title: 'Compare the best brokerage houses and DSE brokers in Bangladesh',
    description: 'BO account opening fees, commission rates (0.30%–0.50%), mobile trading apps, and customer service compared.',
  },
  {
    href: '/blog/dse-circuit-breaker',
    tag: 'Trading rules',
    title: 'What is a circuit breaker? DSE upper & lower price limits explained',
    description: 'How upper and lower circuit breakers protect investors from extreme volatility and how daily price bands work on the DSE.',
  },
  {
    href: '/blog/candlestick-chart-ki-ebong-kivabe-porben',
    tag: 'Technical analysis',
    title: 'How to read candlestick charts for stock market trading',
    description: 'Learn to read candlestick charts: OHLC prices, real body, wick rejection, and understanding buyer-seller psychology.',
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
    'Free paper trading simulator for the Dhaka Stock Exchange. Practice DSE share trading with live prices, real market hours, T+2/T+3 settlement and 0.4% commission, all settled in virtual money.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BDT',
    availability: 'https://schema.org/InStock',
  },
  featureList: [
    'Live Dhaka Stock Exchange price data',
    'T+2/T+3 settlement by market category, enforced per purchase lot',
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
    '@id': `${SITE}/#organization`,
    name: 'StockSimulatorBD',
    url: SITE,
  },
  author: {
    '@type': 'Person',
    '@id': 'https://shahoriar.bd/#person',
    name: 'Md Al Shahoriar Hossain',
    url: 'https://shahoriar.bd',
  },
  creator: {
    '@type': 'Person',
    '@id': 'https://shahoriar.bd/#person',
    name: 'Md Al Shahoriar Hossain',
    url: 'https://shahoriar.bd',
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />


      {/* HERO */}
      <section className="hm hm-hero" aria-labelledby="hero-title">
        <div className="hm-wrap hm-hero__grid">
          <div>
            <h1 id="hero-title">
              Paper trade the Dhaka Stock Exchange
            </h1>
            <p className="hm-lead">
              Free practice with live DSE prices, real rules and virtual money.
            </p>

            <div className="hm-actions">
              <Link href="/trade" prefetch className="hm-btn">
                Start trading now
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
              <Link href="/blog" className="hm-btn hm-btn--outline">
                Read the guides first
              </Link>
            </div>

            <p className="hm-fine">
              Free to use. The balance is virtual and has no real world value.
            </p>
          </div>

          <figure
            className="hm-shot"
            data-slot="hero"
            data-kind="product"
            data-alt="The Grameenphone (GP) candlestick chart on its StockSimulatorBD stock page"
          >
            <picture>
              <source
                media="(prefers-color-scheme: dark) and (max-width: 40rem)"
                srcSet="/home/gp-chart-dark-phone.webp"
                width={716}
                height={792}
              />
              <source
                media="(prefers-color-scheme: dark)"
                srcSet="/home/gp-chart-dark-wide.webp"
                width={1600}
                height={1494}
              />
              <source
                media="(max-width: 40rem)"
                srcSet="/home/gp-chart-light-phone.webp"
                width={716}
                height={792}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/home/gp-chart-light-wide.webp"
                width={1600}
                height={1494}
                alt="Candlestick chart with volume for Grameenphone (GP), built from the Dhaka Stock Exchange day-end archive, on its StockSimulatorBD stock page"
                fetchPriority="high"
                decoding="async"
              />
            </picture>
            <figcaption>
              Grameenphone (GP) on its stock page.{' '}
              <Link href="/stocks/GP" className="hm-link">
                Open the live chart
              </Link>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* THE RULES OF THE FLOOR */}
      <section className="hm hm-sec" aria-labelledby="rules-title">
        <div className="hm-wrap">
          <div className="hm-head">
            <h2 id="rules-title">The floor runs on the exchange’s own rules</h2>
            <p className="hm-lead">
              Nothing has been loosened to make practice comfortable. When the DSE is closed,
              so is this. When settlement takes two days, you wait the two days. Regular continuous trading
              runs Sunday to Thursday from 10:00 to 14:15 BST. Practice only counts if the constraints
              are the real ones.
            </p>
          </div>

          <table className="hm-rules">
            <caption className="visually-hidden">The rules the simulator enforces</caption>
            <thead>
              <tr>
                <th scope="col">Rule</th>
                <th scope="col">Setting</th>
                <th scope="col">What it means</th>
              </tr>
            </thead>
            <tbody>
              {floorRules.map((rule) => (
                <tr key={rule.label}>
                  <th scope="row">{rule.label}</th>
                  <td className={'plain' in rule ? 'plain' : 'num'}>{rule.value}</td>
                  <td>{rule.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="hm hm-sec hm-sec--band" aria-labelledby="steps-title">
        <div className="hm-wrap">
          <div className="hm-head">
            <h2 id="steps-title">Three steps, in this order</h2>
            <p className="hm-lead">
              The sequence matters, because the waiting is part of what you are here to learn.
            </p>
          </div>

          <ol className="hm-steps" role="list">
            <li className="hm-step">
              <div className="hm-step__text">
                <h3>{steps[0].title}</h3>
                <p>
                  {steps[0].body.split('৳10,000').flatMap((part, i, all) =>
                    i < all.length - 1 ? [part, <span key={i} className="num">৳10,000</span>] : [part],
                  )}
                </p>
              </div>
              <figure className="hm-balance">
                <span className="num">৳10,000</span>
                <figcaption>Virtual balance. It has no real world value.</figcaption>
              </figure>
            </li>

            <li className="hm-step">
              <div className="hm-step__text">
                <h3>{steps[1].title}</h3>
                <p>{steps[1].body}</p>
              </div>
              <figure className="hm-shot hm-shot--dir">
                <picture>
                  <source
                    media="(prefers-color-scheme: dark)"
                    srcSet="/home/directory-dark.webp"
                    width={1240}
                    height={968}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/home/directory-light.webp"
                    width={1240}
                    height={968}
                    alt="The StockSimulatorBD stock directory searched for “bank”, listing DSE banks such as BRAC Bank, City Bank and AB Bank"
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
                <figcaption>
                  The stock directory, searched for “bank”.{' '}
                  <Link href="/stocks" className="hm-link">
                    Browse every listed symbol
                  </Link>
                </figcaption>
              </figure>
            </li>

            <li className="hm-step">
              <div className="hm-step__text">
                <h3>{steps[2].title}</h3>
                <p>{steps[2].body}</p>
              </div>
              <figure className="hm-t1" role="group" aria-label="How T+2 settlement works across a weekend">
                <ul className="hm-t1__rail" role="list">
                  <li className="hm-t1__day hm-t1__day--buy">
                    <b>Thursday</b>
                    You buy
                  </li>
                  <li className="hm-t1__day hm-t1__day--shut">
                    <b>Friday</b>
                    Closed
                  </li>
                  <li className="hm-t1__day hm-t1__day--shut">
                    <b>Saturday</b>
                    Closed
                  </li>
                  <li className="hm-t1__day">
                    <b>Sunday</b>
                    Still locked
                  </li>
                  <li className="hm-t1__day hm-t1__day--sell">
                    <b>Monday</b>
                    You can sell
                  </li>
                </ul>
                <figcaption>
                  T+2 counts trading days, so shares bought on a Thursday can be sold from Monday.
                  Category Z needs one more trading day, until Tuesday. Public holidays are skipped too.
                </figcaption>
              </figure>
            </li>
          </ol>
        </div>
      </section>

      {/* WHO IT IS FOR */}
      <section className="hm hm-sec" aria-labelledby="who-title">
        <div className="hm-wrap">
          <h2 id="who-title" className="hm-statement">
            Built for the first trade you have not made yet
          </h2>

          <div className="hm-readers">
            <div>
              <h3>Students and first time learners</h3>
              <p>
                Curious about the share market but with no capital to put at risk, and probably
                no BO account yet. Here you can watch prices move, place orders, hold a position
                overnight and see what a portfolio does over a month, at no cost and with
                nothing riding on being wrong.
              </p>
            </div>

            <div>
              <h3>Savers moving beyond Sanchayapatra and FDR</h3>
              <p>
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
      <section className="hm hm-sec hm-sec--rule" aria-labelledby="paper-title">
        <div className="hm-wrap">
          <div className="hm-split">
            <div className="hm-prose">
              <h2 id="paper-title">What is paper trading?</h2>
              <p>
                StockSimulatorBD is a free paper trading simulator for the Dhaka Stock Exchange.
                Practice buying and selling DSE shares at live market prices, using virtual
                money instead of your own.
              </p>
              <p>
                Paper trading, also called simulator trading or virtual trading, means placing
                trades with fake money in an environment that mirrors real market conditions.
                The name comes from the days when traders wrote hypothetical positions down on
                paper. Platforms like this one just do the arithmetic for you, against live data.
              </p>
              <p>
                Plenty of people search for it as a stock market game or a stocks sim instead.
                Same idea, different words. StockSimulatorBD is that game for Bangladesh
                specifically, tied to the Dhaka Stock Exchange rather than to a generic global market.
              </p>

              <p className="hm-note">
                Finding a paper trading platform built for the Bangladesh stock market is
                genuinely hard. Almost every simulator targets US markets, which leaves
                Bangladeshi investors practicing on tickers and rules they will never actually trade.
              </p>
            </div>

            <div className="hm-why">
              <h3>Why practice first</h3>
              <ul role="list">
                {practiceReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* LEARN BEFORE YOU TRADE */}
      <section className="hm hm-sec hm-sec--band" aria-labelledby="learn-title">
        <div className="hm-wrap">
          <div className="hm-head hm-head--stack">
            <h2 id="learn-title">Learn before you trade</h2>
            <p className="hm-lead">
              Practical guides for Bangladeshi investors, from opening a BO account to choosing
              a broker.
            </p>
          </div>

          <ul className="hm-index" role="list">
            {articles.map((article) => (
              <li key={article.href}>
                <Link href={article.href} className="hm-row">
                  <span>
                    <span className="hm-row__title">{article.title}</span>
                    <span className="hm-row__desc">{article.description}</span>
                  </span>
                  <span className="hm-row__tag">{article.tag}</span>
                  <ArrowRight size={20} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>

          <Link href="/blog" className="hm-btn hm-btn--outline hm-more">
            Browse every guide
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* FAQ AND QUESTIONS */}
      <section className="hm hm-sec hm-sec--rule" aria-labelledby="faq-title">
        <div className="hm-wrap">
          <div className="hm-faq">
            <div className="hm-faq__head">
              <h2 id="faq-title">Questions people ask before they start</h2>
            </div>

            <div>
              {faqs.map((faq, index) => (
                <details key={faq.q} className="hm-qa" open={index < 2}>
                  <summary>
                    <h3>{faq.q}</h3>
                  </summary>
                  <p>{faq.a}</p>
                </details>
              ))}

              <div className="hm-bn" lang="bn">
                <h3>বাংলায় সংক্ষেপে: সাধারণ জিজ্ঞাসা ও উত্তর</h3>
                <p>
                  <strong>স্টকসিমুলেটরবিডি কী?</strong> এটি ঢাকা স্টক এক্সচেঞ্জের (DSE) একমাত্র ফ্রি পেপার ট্রেডিং প্ল্যাটফর্ম। এখানে আসল বাজারের লাইভ ডেটা, বাস্তব মার্কেট আওয়ার এবং T+2/T+3 সেটেলমেন্ট নিয়মে সম্পূর্ণ ঝুঁকিমুক্তভাবে শেয়ার ট্রেডিং শেখা যায়। নতুন একাউন্ট খুললেই পাচ্ছেন ৳১০,০০০ ভার্চুয়াল ব্যালেন্স।
                </p>
                <p>
                  <strong>ডিএসই মার্কেট টাইম / শেয়ার বাজার ট্রেডিং সময়সূচী:</strong> রবিবার থেকে বৃহস্পতিবার সকাল ১০:০০ টা থেকে দুপুর ২:১৫ পর্যন্ত সরাসরি লেনদেন চলে। এরপর দুপুর ২:১৫ থেকে ২:৩০ পর্যন্ত পোস্ট-ক্লোজিং সেশন। শুক্রবার ও শনিবার সাপ্তাহিক বন্ধ।
                </p>
                <p>
                  <strong>অনলাইনে বিও একাউন্ট খোলার নিয়ম:</strong> ঘরে বসে লংকাবাংলা, ব্র্যাক ইপিএল বা আইডিএলসির মতো শীর্ষ ব্রোকারেজ হাউসের অ্যাপে আপনার জাতীয় পরিচয়পত্র (NID), ছবি, ব্যাংক চেকের ছবি ও নমিনির তথ্য জমা দিয়ে অনলাইনে বিও (BO) একাউন্ট খুলতে পারবেন। সিডিবিএল বাৎসরিক ফি ৪৫০ টাকা। তবে স্টকসিমুলেটরবিডিতে প্র্যাকটিস করার জন্য কোনো বিও একাউন্ট বা টাকার প্রয়োজন নেই।
                </p>
              </div>
            </div>
          </div>

          <div className="hm-ask">
            <div>
              <h3>Still have a question?</h3>
              <p className="hm-lead">
                Ask below and it gets answered here, where the next person with the same question
                can find it. Please do not post your BO account number, broker login or any personal
                financial details.
              </p>
            </div>
            <div>
              <OpenRemark />
            </div>
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className="hm hm-sec hm-sec--band hm-close" aria-labelledby="close-title">
        <div className="hm-wrap">
          <h2 id="close-title">Nobody’s first real trade should be their first trade</h2>
          <p className="hm-lead">
            Open the floor, place a few orders and get some of them wrong while it costs
            nothing. Then do it with your own money, already knowing what to expect.
          </p>
          <div className="hm-actions">
            <Link href="/trade" className="hm-btn">
              Start trading now
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
            <p className="hm-small">Works in any browser, and installs as an app on Android and desktop.</p>
          </div>
        </div>
      </section>

      <div className="hm-foot">
        <Footer />
      </div>
    </>
  );
}
