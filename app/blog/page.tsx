import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/shared/Footer';
import BlogExplorer, { type ExplorerPost } from '@/components/blog/BlogExplorer';
import { getBlogPosts, type BlogPost } from '@/lib/contentful-blog';
import { SITE_URL, absoluteUrl } from '@/lib/siteUrl';
import '../home.css';
import './blog.css';

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

function BlogIntro() {
  return (
    <div className="bl-intro">
      <h1 id="blog-title">Learn the Bangladesh stock market</h1>
      <p className="hm-lead">
        Practical, educational guides on the Dhaka Stock Exchange, BO accounts, DSE market rules,
        trading concepts, brokers, and paper-trading preparation.
      </p>
      <p className="hm-fine">
        Educational information only. This blog is not investment, trading, legal, or financial
        advice. Verify time-sensitive market information with official sources before acting.
      </p>
    </div>
  );
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

  const intro = <BlogIntro />;

  return (
    <div className="hm bl">
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

      {posts.length === 0 ? (
        <>
          <section className="hm bl-hero" aria-labelledby="blog-title">
            <div className="hm-wrap">{intro}</div>
          </section>
          <section className="hm hm-sec" aria-labelledby="blog-empty">
            <div className="hm-wrap bl-empty">
              <h2 id="blog-empty">Articles are coming soon.</h2>
              <p className="hm-lead">Publish an article in Contentful to display it here.</p>
            </div>
          </section>
        </>
      ) : (
        <BlogExplorer posts={explorerPosts} intro={intro} />
      )}

      <section className="hm hm-sec hm-sec--band bl-close" aria-labelledby="practise-title">
        <div className="hm-wrap bl-close__grid">
          <h2 id="practise-title">Learn by practising, not risking real money.</h2>
          <div className="bl-close__act">
            <p className="hm-lead">
              Explore StockSimulatorBD to practise DSE-style investing concepts with virtual money
              before making real-world financial decisions.
            </p>
            <Link href="/trade" className="hm-btn">
              Open StockSimulatorBD
            </Link>
          </div>
        </div>
      </section>

      <div className="hm-foot">
        <Footer />
      </div>
    </div>
  );
}
