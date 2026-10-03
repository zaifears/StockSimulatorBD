import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Footer from '@/components/shared/Footer';
import BlogExplorer, { type ExplorerPost } from '@/components/blog/BlogExplorer';
import { getBlogPosts, type BlogPost } from '@/lib/contentful-blog';
import { SITE_URL, absoluteUrl } from '@/lib/siteUrl';

const baseUrl = SITE_URL;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Bangladesh Stock Market Blog | DSE Guides & Investing Education',
  description:
    'Educational guides about the Dhaka Stock Exchange, BO accounts, DSE trading hours, circuit breakers, brokers, and paper trading in Bangladesh.',
  alternates: {
    canonical: `${baseUrl}/blog`,
  },
  openGraph: {
    type: 'website',
    url: `${baseUrl}/blog`,
    title: 'Bangladesh Stock Market Blog | StockSimulatorBD',
    description:
      'Learn about DSE trading, BO accounts, market rules, brokers, and paper trading through practical Bangladesh-focused guides.',
    siteName: 'StockSimulatorBD',
    images: [
      {
        url: absoluteUrl('/og/og-image.png'),
        width: 1200,
        height: 630,
        alt: 'Bangladesh Stock Market Blog | StockSimulatorBD',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bangladesh Stock Market Blog | StockSimulatorBD',
    description:
      'Practical guides on DSE trading, BO accounts, market rules, brokers, and paper trading in Bangladesh.',
    images: [absoluteUrl('/og/og-image.png')],
  },
  robots: {
    index: true,
    follow: true,
  },
};

function estimateReadingTime(post: BlogPost): number {
  const approximateWordCount = post.excerpt.trim().split(/\s+/).length * 8;

  return Math.max(1, Math.ceil(approximateWordCount / 200));
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  // Only what the client explorer needs. Rich text, FAQ and source payloads stay
  // on the server rather than being serialised into the page.
  const explorerPosts: ExplorerPost[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    publishedAt: post.publishedAt,
    featured: post.featured,
    readingTime: estimateReadingTime(post),
    coverImage: post.coverImage
      ? {
          url: post.coverImage.url,
          width: post.coverImage.width,
          height: post.coverImage.height,
        }
      : null,
    coverImageAlt: post.coverImageAlt,
  }));

  const blogListSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${baseUrl}/blog#blog`,
    name: 'StockSimulatorBD Blog',
    description:
      'Educational articles about the Dhaka Stock Exchange, paper trading, BO accounts, market rules, and financial literacy in Bangladesh.',
    url: `${baseUrl}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'StockSimulatorBD',
      url: baseUrl,
    },
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.seoDescription || post.excerpt,
      url: `${baseUrl}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: post.author
        ? {
            '@type': 'Person',
            name: post.author.name,
          }
        : undefined,
    })),
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
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogListSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c'),
        }}
      />

      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-36 sm:px-6 sm:pt-40 lg:px-8 lg:pb-16 lg:pt-40">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:gap-12">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                Bangladesh market education
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Learn the Bangladesh stock market
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Practical, educational guides on the Dhaka Stock Exchange, BO
                accounts, DSE market rules, trading concepts, brokers, and
                paper-trading preparation.
              </p>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Educational information only. This blog is not investment,
                trading, legal, or financial advice. Verify time-sensitive
                market information with official sources before acting.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-[250px] sm:max-w-[310px] lg:max-w-[430px]">
              <div className="absolute inset-x-6 bottom-4 top-10 rounded-full bg-emerald-500/15 blur-3xl dark:bg-emerald-400/10" />
              <Image
                src="/images/blog-hero-mascot.png"
                alt="StockSimulatorBD learner studying a simulated stock market dashboard"
                width={1024}
                height={1024}
                priority
                sizes="(max-width: 640px) 250px, (max-width: 1024px) 310px, 430px"
                className="relative h-auto w-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-semibold">Articles are coming soon.</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              Publish an article in Contentful to display it here.
            </p>
          </div>
        ) : (
          <BlogExplorer posts={explorerPosts} />
        )}
      </section>

      <section className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-slate-900 p-8 text-white dark:bg-emerald-950 sm:p-10">
            <h2 className="text-2xl font-bold">
              Learn by practising, not risking real money.
            </h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              Explore StockSimulatorBD to practise DSE-style investing concepts
              with virtual money before making real-world financial decisions.
            </p>
            <Link
              href="/trade"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Open StockSimulatorBD
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
