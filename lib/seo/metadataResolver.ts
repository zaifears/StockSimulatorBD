// lib/seo/metadataResolver.ts
// Metadata Resolver for Safe Level 1 Metadata Overrides
// Bridges the Change Management System to public Next.js page metadata with in-memory caching.

import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { SeoOverride } from './types';

// In-memory cache for fast metadata resolution (TTL: 60s)
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;
let cachedOverrides: Record<string, SeoOverride> = {};

/**
 * Normalizes any route path to a canonical form:
 * - Trims whitespace
 * - Converts to lowercase
 * - Strips query parameters (?foo=bar) and hash fragments (#section)
 * - Standardizes slashes (/stocks/GP/ -> /stocks/gp)
 * - Returns canonical path and safe Firestore docId
 */
export function normalizeSeoPath(rawPath: string): { path: string; docId: string } {
  if (!rawPath || typeof rawPath !== 'string') {
    return { path: '/', docId: 'root' };
  }
  const trimmed = rawPath.trim().toLowerCase();
  const clean = trimmed.split('?')[0].split('#')[0];
  const withoutSlashes = clean.replace(/^\/+|\/+$/g, '');
  if (!withoutSlashes) {
    return { path: '/', docId: 'root' };
  }
  return {
    path: `/${withoutSlashes}`,
    docId: withoutSlashes.replace(/\//g, '_'),
  };
}

/**
 * Purges the in-memory metadata cache.
 * Call this when an override is applied or rolled back.
 */
export function invalidateMetadataCache(targetPath?: string): void {
  if (targetPath) {
    const { path } = normalizeSeoPath(targetPath);
    delete cachedOverrides[path];
  } else {
    cachedOverrides = {};
    cacheTimestamp = 0;
  }
}

/**
 * Resolves safe metadata overrides for a given path.
 * Returns overridden title and description if present, otherwise returns defaults.
 * Guaranteed never to throw or block page rendering.
 */
export async function resolvePageMetadata(
  rawPath: string,
  defaultTitle: string,
  defaultDescription: string
): Promise<{ title: string; description: string; isOverridden: boolean }> {
  try {
    const { path, docId } = normalizeSeoPath(rawPath);
    const now = Date.now();

    // Refresh cache if expired or empty
    if (now - cacheTimestamp > CACHE_TTL_MS) {
      const db = getSeoDb();
      const snap = await db.collection('seo_overrides').get();
      const newCache: Record<string, SeoOverride> = {};
      snap.docs.forEach((doc) => {
        const data = doc.data() as SeoOverride;
        if (data.path) {
          const norm = normalizeSeoPath(data.path);
          newCache[norm.path] = { ...data, path: norm.path };
        }
      });
      cachedOverrides = newCache;
      cacheTimestamp = now;
    }

    const override = cachedOverrides[path];
    if (override && (override.title || override.description)) {
      return {
        title: override.title || defaultTitle,
        description: override.description || defaultDescription,
        isOverridden: true,
      };
    }
  } catch (err: any) {
    console.warn(`[SEO MetadataResolver] Fallback to default for "${rawPath}":`, err?.message);
  }

  return {
    title: defaultTitle,
    description: defaultDescription,
    isOverridden: false,
  };
}
