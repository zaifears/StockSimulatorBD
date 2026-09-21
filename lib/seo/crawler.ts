// lib/seo/crawler.ts
// Fast, lightweight, zero-dependency streaming HTML extractor and batch crawler for StockSimulatorBD.
// Extracts complete page metadata, OpenGraph, JSON-LD, headings, images, word count, and link graph.

import crypto from 'crypto';
import { SITE_URL, absoluteUrl } from '@/lib/siteUrl';
import { SeoPageProfile, SeoIssue, PageType } from './types';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';

export interface PageCrawlResult {
  url: string;
  status: number;
  profile: SeoPageProfile | null;
  error?: string;
}

/**
 * Extracts comprehensive metadata, headings, JSON-LD, images and links from raw HTML
 */
export function parseHtmlContent(html: string, pageUrl: string): Omit<SeoPageProfile, 'id' | 'status' | 'inSitemap' | 'isOrphan' | 'inboundLinksCount' | 'referringPagesCount' | 'depth' | 'internalAuthorityScore' | 'authorityTier' | 'lastCrawledAt'> {
  const issues: SeoIssue[] = [];

  // 1. Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  const titleLength = title.length;
  if (!title) {
    issues.push({ code: 'MISSING_TITLE', type: 'critical', message: 'Page is missing a <title> tag', field: 'title' });
  } else if (titleLength < 25) {
    issues.push({ code: 'SHORT_TITLE', type: 'warning', message: `Title is very short (${titleLength} chars). Target 35-60.`, field: 'title' });
  } else if (titleLength > 65) {
    issues.push({ code: 'LONG_TITLE', type: 'warning', message: `Title may be truncated in search results (${titleLength} chars). Target 35-60.`, field: 'title' });
  }

  // 2. Meta Description
  const descMatch = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
                    html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const description = descMatch ? descMatch[1].trim() : '';
  const descriptionLength = description.length;
  if (!description) {
    issues.push({ code: 'MISSING_DESCRIPTION', type: 'critical', message: 'Page is missing meta description', field: 'description' });
  } else if (descriptionLength < 50) {
    issues.push({ code: 'SHORT_DESCRIPTION', type: 'warning', message: `Description is short (${descriptionLength} chars). Target 120-160.`, field: 'description' });
  } else if (descriptionLength > 165) {
    issues.push({ code: 'LONG_DESCRIPTION', type: 'warning', message: `Description is too long (${descriptionLength} chars) and may be truncated.`, field: 'description' });
  }

  // 3. Robots
  const robotsMatch = html.match(/<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const robots = robotsMatch ? robotsMatch[1].trim().toLowerCase() : 'index, follow';
  if (robots.includes('noindex')) {
    issues.push({ code: 'NOINDEX_PAGE', type: 'warning', message: 'Page has noindex directive', field: 'robots' });
  }

  // 4. Canonical
  const canonicalMatch = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i) ||
                         html.match(/<link\s+[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*>/i);
  const canonical = canonicalMatch ? canonicalMatch[1].trim() : '';
  if (!canonical) {
    issues.push({ code: 'MISSING_CANONICAL', type: 'warning', message: 'Missing canonical URL link tag', field: 'canonical' });
  } else if (canonical !== pageUrl && !canonical.endsWith(pageUrl.replace(/^https?:\/\/[^/]+/, ''))) {
    issues.push({ code: 'CANONICAL_MISMATCH', type: 'warning', message: `Canonical points to ${canonical} instead of ${pageUrl}`, field: 'canonical' });
  }

  // 5. Headings: H1 and H2
  const h1Matches = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi));
  const h1 = h1Matches.length > 0 ? h1Matches[0][1].replace(/<[^>]+>/g, '').trim() : '';
  if (h1Matches.length === 0) {
    issues.push({ code: 'MISSING_H1', type: 'warning', message: 'Page has no <h1> heading tag', field: 'h1' });
  } else if (h1Matches.length > 1) {
    issues.push({ code: 'MULTIPLE_H1', type: 'info', message: `Found ${h1Matches.length} <h1> tags. A single clear H1 is recommended.`, field: 'h1' });
  }

  const h2Matches = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi));
  const h2s = h2Matches.map((m) => m[1].replace(/<[^>]+>/g, '').trim()).slice(0, 15);

  // 6. OpenGraph
  const ogTitleMatch = html.match(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogDescMatch = html.match(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogImgMatch = html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : '';
  const ogDescription = ogDescMatch ? ogDescMatch[1].trim() : '';
  const ogImage = ogImgMatch ? ogImgMatch[1].trim() : '';

  // 7. JSON-LD Structured Data
  const jsonLdScripts = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  const schemaTypes: string[] = [];
  for (const script of jsonLdScripts) {
    try {
      const parsed = JSON.parse(script[1]);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => item['@type'] && schemaTypes.push(item['@type']));
      } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        parsed['@graph'].forEach((item: any) => item['@type'] && schemaTypes.push(item['@type']));
      } else if (parsed['@type']) {
        schemaTypes.push(parsed['@type']);
      }
    } catch {
      issues.push({ code: 'INVALID_JSON_LD', type: 'critical', message: 'Invalid JSON-LD syntax detected in script block', field: 'schemaTypes' });
    }
  }

  if (schemaTypes.length === 0) {
    issues.push({ code: 'MISSING_SCHEMA', type: 'info', message: 'No structured data (JSON-LD) detected', field: 'schemaTypes' });
  }

  // 8. Word Count (Strip scripts, styles, HTML)
  const cleanText = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = cleanText ? cleanText.split(/\s+/).length : 0;
  if (wordCount < 200) {
    issues.push({ code: 'THIN_CONTENT', type: 'warning', message: `Low word count (${wordCount} words). Thin content may underperform.`, field: 'wordCount' });
  }

  // 9. Images & Alt attributes
  const imgTags = Array.from(html.matchAll(/<img\s+([^>]*?)>/gi));
  const imagesCount = imgTags.length;
  let imagesMissingAltCount = 0;
  for (const img of imgTags) {
    const attr = img[1];
    if (!/alt=["'][^"']+["']/i.test(attr)) {
      imagesMissingAltCount++;
    }
  }
  if (imagesMissingAltCount > 0) {
    issues.push({ code: 'IMAGES_MISSING_ALT', type: 'warning', message: `${imagesMissingAltCount} image(s) missing alt text`, field: 'images' });
  }

  // 10. Links Extraction
  const anchorTags = Array.from(html.matchAll(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>/gi));
  const internalLinksOut: Set<string> = new Set();
  const externalLinksOut: Set<string> = new Set();

  for (const anchor of anchorTags) {
    const href = anchor[1].trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }

    if (href.startsWith('/') || href.startsWith(SITE_URL)) {
      // Internal link
      const normalizedPath = href.replace(SITE_URL, '').split('?')[0].split('#')[0] || '/';
      internalLinksOut.add(normalizedPath);
    } else if (href.startsWith('http://') || href.startsWith('https://')) {
      externalLinksOut.add(href);
    }
  }

  // Determine Page Type
  const path = pageUrl.replace(SITE_URL, '') || '/';
  let pageType: PageType = 'other';
  if (path === '/' || path === '') pageType = 'home';
  else if (path.startsWith('/stocks/')) pageType = 'stock';
  else if (path.startsWith('/blog/')) pageType = 'blog';
  else if (path === '/stocks' || path === '/blog' || path === '/about-us') pageType = 'guide';
  else if (path === '/boss') pageType = 'boss';
  else if (path === '/policy') pageType = 'policy';

  // Content hash for change detection
  const contentHash = crypto.createHash('sha256').update(cleanText).digest('hex').substring(0, 16);

  return {
    url: pageUrl,
    path,
    pageType,
    title,
    titleLength,
    description,
    descriptionLength,
    canonical: canonical || pageUrl,
    robots,
    h1,
    h2s,
    wordCount,
    schemaTypes: Array.from(new Set(schemaTypes)),
    ogTitle,
    ogDescription,
    ogImage,
    hasImages: imagesCount > 0,
    imagesCount,
    imagesMissingAltCount,
    internalLinksOut: Array.from(internalLinksOut),
    externalLinksOut: Array.from(externalLinksOut).slice(0, 50),
    contentHash,
    issues,
  };
}

/**
 * Crawl an individual URL and extract SEO profile
 */
export async function crawlSingleUrl(targetUrl: string): Promise<PageCrawlResult> {
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'StockSimulatorBD-SEO-Bot/1.0 (+https://stocksimulator.tech/llms.txt)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 0 },
    });

    const status = res.status;
    if (!res.ok) {
      return {
        url: targetUrl,
        status,
        profile: null,
        error: `HTTP ${status}: ${res.statusText}`,
      };
    }

    const html = await res.text();
    const parsed = parseHtmlContent(html, targetUrl);

    const path = targetUrl.replace(SITE_URL, '') || '/';
    const id = path.replace(/^\//, '').replace(/\//g, '_') || 'root';

    const profile: SeoPageProfile = {
      ...parsed,
      id,
      status,
      inSitemap: true,
      isOrphan: false, // Calculated later in authority pass
      inboundLinksCount: 0,
      referringPagesCount: 0,
      depth: path === '/' ? 0 : path.split('/').filter(Boolean).length,
      internalAuthorityScore: 50,
      authorityTier: 'MEDIUM',
      lastCrawledAt: new Date().toISOString(),
    };

    return { url: targetUrl, status, profile };
  } catch (err: any) {
    return {
      url: targetUrl,
      status: 0,
      profile: null,
      error: err?.message || 'Network fetch error',
    };
  }
}

/**
 * Execute batch crawl of URLs and persist profiles into SEO Firebase
 */
export async function crawlBatchUrls(urls: string[]): Promise<{
  success: boolean;
  crawled: number;
  failed: number;
  profiles: SeoPageProfile[];
}> {
  const db = getSeoDb();
  const profiles: SeoPageProfile[] = [];
  let crawled = 0;
  let failed = 0;

  for (const url of urls) {
    const result = await crawlSingleUrl(url);
    if (result.profile) {
      crawled++;
      profiles.push(result.profile);

      // Save page profile to isolated SEO Firestore
      await db.collection('seo_pages').doc(result.profile.id).set(result.profile, { merge: true });
    } else {
      failed++;
    }
  }

  return {
    success: true,
    crawled,
    failed,
    profiles,
  };
}
