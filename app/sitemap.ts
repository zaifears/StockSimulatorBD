import type { MetadataRoute } from 'next';
import { getAllDseStocks } from '@/lib/dseStocks';
import { getBlogPosts } from '@/lib/contentful-blog';
import { SITE_URL } from '@/lib/siteUrl';

const baseUrl = SITE_URL;

export const revalidate = 3600;

/**
 * `lastModified` is a trust signal, not a timestamp of when the sitemap was built.
 *
 * This file previously used `new Date()` for every static and stock route. With
 * hourly revalidation that told Google all 400+ URLs changed every hour, which
 * teaches it that this site's lastmod is noise and to discount the field
 * entirely. These constants change only when the content or the template behind
 * the URLs actually changes, so bump the relevant one when you ship a
 * substantive edit. Blog posts are exempt: they carry a real per-entry date
 * from Contentful.
 */
const MARKETING_UPDATED = new Date('2026-09-05T00:00:00Z'); // /, /about-us
const DIRECTORY_UPDATED = new Date('2026-08-22T00:00:00Z'); // /stocks, /blog index
const STOCK_TEMPLATE_UPDATED = new Date('2026-08-22T00:00:00Z'); // /stocks/[symbol]

function withBaseUrl(path: string): string {
  return `${baseUrl}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stocks, blogPosts] = await Promise.all([
    getAllDseStocks(),
    getBlogPosts(),
  ]);

  // /trade is deliberately absent. It is Disallow'd in app/robots.ts and is
  // login-gated, so listing it here would ask Google to index a URL it is told
  // not to crawl and could not read anyway.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: withBaseUrl('/'),
      lastModified: MARKETING_UPDATED,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: withBaseUrl('/stocks'),
      lastModified: DIRECTORY_UPDATED,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: withBaseUrl('/blog'),
      lastModified: DIRECTORY_UPDATED,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: withBaseUrl('/about-us'),
      lastModified: MARKETING_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: withBaseUrl('/boss'),
      lastModified: MARKETING_UPDATED,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: withBaseUrl('/policy'),
      lastModified: MARKETING_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  const stockRoutes: MetadataRoute.Sitemap = stocks.map((stock) => ({
    url: withBaseUrl(
      `/stocks/${encodeURIComponent(stock.symbol.toLowerCase())}`
    ),
    lastModified: STOCK_TEMPLATE_UPDATED,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: withBaseUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.updatedAt || post.publishedAt),
    changeFrequency: post.lastVerifiedAt ? 'weekly' : 'monthly',
    priority: post.featured ? 0.8 : 0.7,
  }));

  return [...staticRoutes, ...blogRoutes, ...stockRoutes];
}
