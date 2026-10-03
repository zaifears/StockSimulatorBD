import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { OpenRemark } from '@/components/OpenRemark';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import {
  BLOCKS,
  INLINES,
  type Node,
} from '@contentful/rich-text-types';
import { documentToPlainTextString } from '@contentful/rich-text-plain-text-renderer';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import Footer from '@/components/shared/Footer';
import {
  getBlogPostBySlug,
  getBlogPosts,
  getBlogSlugs,
  type BlogPost,
} from '@/lib/contentful-blog';
import { SITE_URL } from '@/lib/siteUrl';
import { resolvePageMetadata } from '@/lib/seo/metadataResolver';

const baseUrl = SITE_URL;

export const revalidate = 3600;

interface FaqItem {
  question: string;
  answer: string;
}

interface SearchIntentOptimization {
  title: string;
  description: string;
  faqs: FaqItem[];
}

const SEARCH_INTENT_OPTIMIZATIONS: Record<string, SearchIntentOptimization> = {
  'dse-trading-hours-bangladesh': {
    title: 'Is DSE Open Today? Trading Hours & Schedule (2026)',
    description:
      'Is the Dhaka Stock Exchange open today? Official DSE trading hours are Sunday to Thursday, 10:00 AM – 2:15 PM BST. Closed on Fridays, Saturdays & holidays.',
    faqs: [
      {
        question: 'Is DSE open today?',
        answer:
          'The Dhaka Stock Exchange (DSE) is open for trading Sunday through Thursday from 10:00 AM to 2:15 PM Bangladesh Standard Time (BST). DSE is closed on Fridays, Saturdays, and officially gazetted Bangladesh public holidays.',
      },
      {
        question: 'Is DSE open tomorrow?',
        answer:
          'DSE is open tomorrow if tomorrow is Sunday, Monday, Tuesday, Wednesday, or Thursday and does not coincide with a declared public, national, or religious holiday in Bangladesh. Trading hours run from 10:00 AM to 2:15 PM BST.',
      },
      {
        question: 'Has DSE market time changed?',
        answer:
          'Standard continuous trading hours on the DSE are 10:00 AM to 2:15 PM BST, followed by a post-closing session from 2:15 PM to 2:30 PM. Any temporary modifications during holy Ramadan or emergency directives are published on dsebd.org and reflected here.',
      },
      {
        question: 'Is DSE closed today on Friday or Saturday?',
        answer:
          'Yes. The Dhaka Stock Exchange observes a standard two-day weekend on Friday and Saturday. No share trading or transaction matching takes place on weekends.',
      },
      {
        question: 'What time does the DSE market close?',
        answer:
          'Continuous trading on the DSE closes promptly at 2:15 PM BST. The post-closing session runs until 2:30 PM BST, allowing order execution at the day’s closing price only.',
      },
    ],
  },
  'how-to-open-bo-account-bangladesh': {
    title: 'How to Open a BO Account in Bangladesh (2026 Online Guide)',
    description:
      'Step-by-step guide to opening a BO account in Bangladesh online or via DSE brokers. Required NID documents, CDBL fees (৳450), account limits & rules.',
    faqs: [
      {
        question: 'What is a BO account in Bangladesh?',
        answer:
          'A BO (Beneficiary Owner) account is an electronic dematerialized account maintained with CDBL (Central Depository Bangladesh Limited) through a registered DSE stock broker, required to buy, hold, and sell shares in Bangladesh.',
      },
      {
        question: 'How many BO accounts can I open in Bangladesh?',
        answer:
          'Under BSEC regulations, an individual investor in Bangladesh can open a maximum of two BO accounts under their own name: one single account and one joint account. You can also open accounts across different brokerage houses as long as they link to your unique NID in CDBL.',
      },
      {
        question: 'Can I open a BO account online from home in Bangladesh?',
        answer:
          'Yes. Most top DSE brokerage houses (such as LankaBangla, BRAC EPL, IDLC, and City Brokerage) offer 100% paperless online BO account opening. You only need your NID, photo, bank cheque leaf, and nominee information.',
      },
      {
        question: 'How much does it cost to open a BO account?',
        answer:
          'The CDBL annual maintenance fee for a BO account is ৳450. Broker opening charges vary from ৳0 to ৳500 depending on ongoing promotional campaigns.',
      },
      {
        question: 'How to buy stocks in Bangladesh after opening a BO account?',
        answer:
          'Once your BO account is active, transfer funds to your broker account via BEFTN, NPSB, or bKash/Nagad. Then use your broker mobile app or DSE-Mobile to place buy orders during market hours (10:00 AM – 2:15 PM BST).',
      },
    ],
  },
  'top-dse-stock-brokers-2026': {
    title: 'Best Brokerage Houses in Bangladesh: Top DSE Brokers (2026)',
    description:
      'Compare the best brokerage houses and DSE stock brokers in Bangladesh for 2026. Review trading commissions (0.3%–0.5%), BO account charges & online apps.',
    faqs: [
      {
        question: 'What are the best brokerage houses in Bangladesh?',
        answer:
          'The top DSE brokerage houses include LankaBangla Securities, BRAC EPL Stock Brokerage, IDLC Securities, City Brokerage, and EBL Securities. The best broker depends on trading commissions (0.30%–0.50%), mobile app stability, online funding ease, and research support.',
      },
      {
        question: 'What are the top 5 best brokerage houses in Bangladesh?',
        answer:
          'The 5 most reputable and widely used brokerage houses in Bangladesh are: 1) LankaBangla Securities, 2) BRAC EPL Stock Brokerage, 3) IDLC Securities, 4) City Brokerage Limited, and 5) Shanta Securities.',
      },
      {
        question: 'What is a normal brokerage commission in Bangladesh?',
        answer:
          'DSE brokers typically charge between 0.30% and 0.50% commission per trade. StockSimulatorBD simulates the standard exchange average of 0.40% commission on every transaction.',
      },
      {
        question: 'Can I trade DSE stocks online using a mobile app?',
        answer:
          'Yes. Most top brokerage houses provide online trading via their proprietary mobile apps or the DSE-Mobile trading platform, allowing order placement, portfolio tracking, and price monitoring from anywhere.',
      },
    ],
  },
  'dse-circuit-breaker': {
    title: 'What Is Circuit Breaker in Stock Market? DSE Price Limits',
    description:
      'Learn what circuit breakers, upper circuits, and lower circuits mean on the Dhaka Stock Exchange (DSE). Understand daily price limit tiers and market rules.',
    faqs: [
      {
        question: 'What is a circuit breaker in the stock market?',
        answer:
          'A circuit breaker is a regulatory price control mechanism set by the exchange (DSE) and BSEC that caps the maximum percentage a stock price can rise or drop within a single trading day to curb excessive panic and speculation.',
      },
      {
        question: 'What is lower circuit in share market?',
        answer:
          'A lower circuit is the minimum allowable price for a security during a trading day. When a stock hits its lower circuit limit, no transactions can take place below that price. Sellers must wait for buyers willing to purchase at or above the lower circuit threshold.',
      },
      {
        question: 'What is upper circuit in share market?',
        answer:
          'An upper circuit is the maximum allowable price a security can reach during a trading session. If a stock hits its upper circuit, orders cannot execute at any higher price for the remainder of that day.',
      },
      {
        question: 'What are the circuit breaker percentages on the DSE?',
        answer:
          'DSE enforces daily price change limits based on stock price tiers (typically ranging from 10% for lower-priced shares to 3%–5% for high-priced securities, subject to BSEC circulars and category rules).',
      },
    ],
  },
  'candlestick-chart-ki-ebong-kivabe-porben': {
    title: 'How to Read Candlestick Charts: ক্যান্ডেলস্টিক চার্ট গাইড',
    description:
      'Learn how to read candlestick charts for stock market trading & technical analysis. ক্যান্ডেলস্টিক চার্ট পড়ার নিয়ম, OHLC, body, wick এবং প্রাইস অ্যাকশন গাইড।',
    faqs: [
      {
        question: 'How to read candlestick chart for day trading?',
        answer:
          'To read candlestick charts for day trading, analyze the four key price points: Open, High, Low, and Close (OHLC). A green/white candle indicates price closed higher than open (bullish), while a red/black candle indicates price closed lower (bearish). The real body shows the buying/selling consensus, and long wicks signal price rejections and key support/resistance levels.',
      },
      {
        question: 'How to read charts in stock market for beginners?',
        answer:
          'Beginners should start with candlestick charts: identify the overall market trend (uptrend, downtrend, or sideways), observe volume during price movements, and watch for key reversal patterns like Hammers, Dojis, and Bullish/Bearish Engulfing candles.',
      },
    ],
  },
};

interface SourceItem {
  name: string;
  url: string;
  description: string | null;
  verifiedAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function getFaqItems(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const question = getStringValue(item.question);
    const answer = getStringValue(item.answer);

    return question && answer ? [{ question, answer }] : [];
  });
}

function getSourceItems(value: unknown): SourceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const name = getStringValue(item.name);
    const url = getStringValue(item.url);

    if (!name || !url || !isSafeUrl(url)) {
      return [];
    }

    return [
      {
        name,
        url,
        description: getStringValue(item.description),
        verifiedAt: getStringValue(item.verifiedAt),
      },
    ];
  });
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getReadingTime(post: BlogPost): number {
  const plainText = documentToPlainTextString(post.content);
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.ceil(wordCount / 200));
}

function getRelatedPosts(
  currentPost: BlogPost,
  allPosts: BlogPost[]
): BlogPost[] {
  const currentTags = new Set(
    currentPost.tags.map((tag) => tag.toLocaleLowerCase())
  );

  return allPosts
    .filter((post) => post.slug !== currentPost.slug)
    .map((post) => {
      const sharedTags = post.tags.filter((tag) =>
        currentTags.has(tag.toLocaleLowerCase())
      ).length;
      const categoryMatch = post.category === currentPost.category ? 1 : 0;

      return {
        post,
        relevance: sharedTags + categoryMatch,
      };
    })
    .filter((item) => item.relevance > 0)
    .sort((first, second) => second.relevance - first.relevance)
    .slice(0, 3)
    .map((item) => item.post);
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getBlogSlugs();

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: 'Article Not Found',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const intentOpt = SEARCH_INTENT_OPTIMIZATIONS[post.slug.toLowerCase()];
  const defaultTitle = intentOpt?.title || post.seoTitle || post.title;
  const defaultDescription = intentOpt?.description || post.seoDescription || post.excerpt;
  const articleUrl = `${baseUrl}/blog/${post.slug}`;

  // Check for safe Level 1 metadata override from the Change Management System
  const resolved = await resolvePageMetadata(
    `/blog/${post.slug.toLowerCase()}`,
    defaultTitle,
    defaultDescription
  );
  const title = resolved.title;
  const description = resolved.description;

  return {
    title,
    description,
    alternates: {
      canonical: articleUrl,
    },
    authors: post.author
      ? [
          {
            name: post.author.name,
          },
        ]
      : undefined,
    openGraph: {
      type: 'article',
      url: articleUrl,
      title,
      description,
      siteName: 'StockSimulatorBD',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: post.author ? [post.author.name] : undefined,
      ...(post.coverImage
        ? {
            images: [
              {
                url: post.coverImage.url,
                width: post.coverImage.width,
                height: post.coverImage.height,
                alt: post.coverImageAlt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(post.coverImage
        ? {
            images: [post.coverImage.url],
          }
        : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [post, allPosts] = await Promise.all([
    getBlogPostBySlug(slug),
    getBlogPosts(),
  ]);

  if (!post) {
    notFound();
  }

  const articleUrl = `${baseUrl}/blog/${post.slug}`;
  const readingTime = getReadingTime(post);
  const intentOpt = SEARCH_INTENT_OPTIMIZATIONS[post.slug.toLowerCase()];
  const rawFaqItems = getFaqItems(post.faq);
  const existingQuestions = new Set(rawFaqItems.map((f) => f.question.toLowerCase().trim()));
  const extraFaqs = (intentOpt?.faqs || []).filter(
    (f) => !existingQuestions.has(f.question.toLowerCase().trim())
  );
  const faqItems = [...extraFaqs, ...rawFaqItems];
  const sourceItems = getSourceItems(post.sources);
  const relatedPosts = getRelatedPosts(post, allPosts);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': post.articleType === 'NewsArticle' ? 'NewsArticle' : 'BlogPosting',
    '@id': `${articleUrl}#article`,
    headline: intentOpt?.title || post.title,
    description: intentOpt?.description || post.seoDescription || post.excerpt,
    url: articleUrl,
    inLanguage: 'en',
    isAccessibleForFree: true,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    keywords: post.tags.join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    author: post.author
      ? {
          '@type': 'Person',
          name: post.author.name,
          description: post.author.role,
          ...(post.author.linkedinUrl
            ? {
                sameAs: [post.author.linkedinUrl],
              }
            : {}),
        }
      : {
          '@type': 'Organization',
          name: 'StockSimulatorBD',
          url: baseUrl,
        },
    publisher: {
      '@type': 'Organization',
      name: 'StockSimulatorBD',
      url: baseUrl,
    },
    ...(post.coverImage
      ? {
          image: {
            '@type': 'ImageObject',
            url: post.coverImage.url,
            width: post.coverImage.width,
            height: post.coverImage.height,
          },
        }
      : {}),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${baseUrl}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: articleUrl,
      },
    ],
  };

  const faqSchema =
    faqItems.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        }
      : null;

  const richTextOptions = {
    renderNode: {
      [INLINES.HYPERLINK]: (node: Node, children: ReactNode) => {
        const uri = typeof node.data?.uri === 'string' ? node.data.uri : null;

        if (!uri) {
          return <>{children}</>;
        }

        const isInternalLink =
          uri.startsWith('/') ||
          uri.startsWith(baseUrl) ||
          uri.startsWith('#');

        return (
          <a
            href={uri}
            {...(!isInternalLink
              ? {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                }
              : {})}
          >
            {children}
          </a>
        );
      },
      [BLOCKS.QUOTE]: (_node: Node, children: ReactNode) => (
        <blockquote>{children}</blockquote>
      ),
      [BLOCKS.EMBEDDED_ASSET]: (node: Node) => {
        const target = node.data?.target;
        if (!target) return null;

        const fields = (target.fields ?? target) as Record<string, any>;
        const file = fields?.file;
        const rawUrl = typeof file?.url === 'string' ? file.url : null;

        if (!rawUrl) return null;

        const url = rawUrl.startsWith('http') ? rawUrl : `https:${rawUrl}`;
        const title = typeof fields.title === 'string' ? fields.title : '';
        const description = typeof fields.description === 'string' ? fields.description : title;
        const width = file?.details?.image?.width ?? 1200;
        const height = file?.details?.image?.height ?? 675;

        return (
          <figure className="my-8">
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <Image
                src={url}
                alt={description || 'Blog article image'}
                width={width}
                height={height}
                sizes="(max-width: 768px) 100vw, 896px"
                loading="lazy"
                className="h-auto w-full object-cover"
              />
            </div>
            {description && (
              <figcaption className="mt-2.5 text-center text-xs text-slate-500 dark:text-slate-400">
                {description}
              </figcaption>
            )}
          </figure>
        );
      },
    },
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c'),
        }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c'),
          }}
        />
      )}

      <article>
        <header className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto max-w-4xl px-4 pb-10 pt-36 sm:px-6 sm:pt-40 lg:px-8 lg:pb-12 lg:pt-40">
            <nav
              aria-label="Breadcrumb"
              className="mb-8 text-sm text-slate-500 dark:text-slate-400"
            >
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link
                    href="/"
                    className="hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    href="/blog"
                    className="hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    Blog
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li
                  aria-current="page"
                  className="max-w-[14rem] truncate text-slate-700 dark:text-slate-200"
                >
                  {post.title}
                </li>
              </ol>
            </nav>

            <Link
              href="/blog"
              className="group inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              All articles
            </Link>

            <div className="mt-8">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {post.category}
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                {post.title}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                {post.excerpt}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  Published {formatDate(post.publishedAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {readingTime} min read
                </span>
                {post.lastVerifiedAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Last verified {formatDate(post.lastVerifiedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 pb-10 pt-36 sm:px-6 sm:pt-40 lg:px-8 lg:pb-12 lg:pt-40">
          {post.coverImage && (
            <figure className="mb-12">
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <Image
                  src={post.coverImage.url}
                  alt={post.coverImageAlt}
                  width={post.coverImage.width}
                  height={post.coverImage.height}
                  sizes="(max-width: 768px) 100vw, 896px"
                  priority
                  className="h-auto w-full object-cover"
                />
              </div>
            </figure>
          )}

          <aside className="mb-10 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                <strong>Educational information only.</strong> This article is
                not investment, trading, legal, or financial advice. DSE rules,
                fees, broker services, and market schedules can change. Verify
                current information with official sources before acting.
              </p>
            </div>
          </aside>

          <div
            className="prose prose-lg max-w-none prose-slate dark:prose-invert
              prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:tracking-tight
              prose-h2:mt-12 prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-3 dark:prose-h2:border-slate-800
              prose-h3:mt-8
              prose-a:text-emerald-700 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-emerald-400
              prose-blockquote:border-emerald-500 prose-blockquote:bg-emerald-50/70 prose-blockquote:py-1 dark:prose-blockquote:bg-emerald-950/30
              prose-img:rounded-xl"
          >
            {documentToReactComponents(post.content, richTextOptions)}
          </div>

          {faqItems.length > 0 && (
            <section
              aria-labelledby="faq-heading"
              className="mt-16 border-t border-slate-200 pt-10 dark:border-slate-800"
            >
              <h2 id="faq-heading" className="text-2xl font-bold tracking-tight">
                Frequently asked questions
              </h2>
              <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {faqItems.map((item) => (
                  <details key={item.question} className="group p-5">
                    <summary className="cursor-pointer list-none pr-8 font-semibold marker:hidden">
                      {item.question}
                    </summary>
                    <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

          <section
            aria-labelledby="comments-heading"
            className="mt-16 border-t border-slate-200 pt-10 dark:border-slate-800"
          >
            <h2 id="comments-heading" className="text-2xl font-bold tracking-tight">
              Comments
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Questions about this guide are welcome. Please do not share your BO account
              number, broker credentials or any personal financial details here.
            </p>
            <div className="mt-6">
              <OpenRemark />
            </div>
          </section>

          {sourceItems.length > 0 && (
            <section
              aria-labelledby="sources-heading"
              className="mt-16 border-t border-slate-200 pt-10 dark:border-slate-800"
            >
              <h2 id="sources-heading" className="text-2xl font-bold tracking-tight">
                Sources and verification
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Consult these primary sources for the latest official
                information. Market rules and services may change after this
                article was published.
              </p>

              <ul className="mt-6 space-y-4">
                {sourceItems.map((source) => (
                  <li
                    key={source.url}
                    className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"
                  >
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      {source.name}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {source.description && (
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {source.description}
                      </p>
                    )}
                    {source.verifiedAt && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Source checked: {formatDate(source.verifiedAt)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {post.author && (
            <aside
              aria-label="About the author"
              className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {post.author.avatar ? (
                  <Image
                    src={post.author.avatar.url}
                    alt={post.author.name}
                    width={post.author.avatar.width}
                    height={post.author.avatar.height}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <UserRound className="h-8 w-8" />
                  </div>
                )}

                <div className="flex-1">
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    About the author
                  </p>
                  <h2 className="mt-1 text-xl font-bold">{post.author.name}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {post.author.role}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {post.author.bio}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
                    {post.author.linkedinUrl && (
                      <a
                        href={post.author.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        LinkedIn
                      </a>
                    )}
                    {post.author.githubUrl && (
                      <a
                        href={post.author.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        GitHub
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          )}

          {relatedPosts.length > 0 && (
            <section
              aria-labelledby="related-heading"
              className="mt-16 border-t border-slate-200 pt-10 dark:border-slate-800"
            >
              <h2 id="related-heading" className="text-2xl font-bold tracking-tight">
                Continue learning
              </h2>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    href={`/blog/${relatedPost.slug}`}
                    className="group rounded-xl border border-slate-200 p-5 transition hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
                  >
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {relatedPost.category}
                    </p>
                    <h3 className="mt-2 font-bold group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                      {relatedPost.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {relatedPost.excerpt}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-16 rounded-2xl bg-slate-900 p-8 text-white dark:bg-emerald-950 sm:p-10">
            <h2 className="text-2xl font-bold">
              Practise before risking real money.
            </h2>
            <p className="mt-3 max-w-2xl text-slate-300 dark:text-emerald-100/85">
              Use StockSimulatorBD to practise DSE-style trading concepts with
              virtual money, track a portfolio, and learn through simulation.
            </p>
            <Link
              href="/trade"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Open StockSimulatorBD
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </article>

      <Footer />
    </main>
  );
}
