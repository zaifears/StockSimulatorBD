import type { MetadataRoute } from 'next';
import { readdir } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { getAllDseStocks } from '@/lib/dseStocks';

const BASE_URL = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'https://www.stocksimulator.tech').replace(/\/$/, '');

function withBaseUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

const PAGE_FILE_PATTERN = /^page\.(tsx|ts|jsx|js|mdx)$/i;

async function collectBlogRoutes(dir: string, segments: string[] = []): Promise<string[]> {
  let entries: Dirent<string>[] = [];

  try {
    entries = await readdir(dir, { withFileTypes: true, encoding: 'utf8' });
  } catch {
    return [];
  }

  const routes: string[] = [];

  for (const entry of entries) {
    if (entry.isFile() && PAGE_FILE_PATTERN.test(entry.name)) {
      const suffix = segments.join('/');
      routes.push(suffix ? `/blog/${suffix}` : '/blog');
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    // Skip dynamic and parallel routes because they need explicit params.
    if (entry.name.startsWith('[') || entry.name.startsWith('@')) {
      continue;
    }

    // Route groups are not part of the URL path.
    const isRouteGroup = entry.name.startsWith('(') && entry.name.endsWith(')');
    const nextSegments = isRouteGroup ? segments : [...segments, entry.name];
    const nestedRoutes = await collectBlogRoutes(path.join(dir, entry.name), nextSegments);
    routes.push(...nestedRoutes);
  }

  return routes;
}

async function getAllBlogRoutes(): Promise<string[]> {
  const blogRoot = path.join(process.cwd(), 'app', 'blog');
  const routes = await collectBlogRoutes(blogRoot);
  return [...new Set(routes)].sort((a, b) => a.localeCompare(b));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const blogPaths = await getAllBlogRoutes();
  const stocks = await getAllDseStocks();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: withBaseUrl('/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: withBaseUrl('/simulator'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: withBaseUrl('/go'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: withBaseUrl('/about-us'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  const stockRoutes: MetadataRoute.Sitemap = stocks.map((stock) => ({
    url: withBaseUrl(`/stocks/${encodeURIComponent(stock.symbol.toLowerCase())}`),
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogPaths.map((blogPath) => ({
    url: withBaseUrl(blogPath),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  return [...staticRoutes, ...blogRoutes, ...stockRoutes];
}
