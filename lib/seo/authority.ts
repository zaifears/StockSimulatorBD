// lib/seo/authority.ts
// Internal Link Authority Engine for StockSimulatorBD.
// Calculates real actionable internal authority based on graph inbound links,
// referring page count, click depth, sitemap presence, and orphan page penalties.

import { SeoPageProfile } from './types';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';

export interface AuthoritySummary {
  totalPages: number;
  orphanPagesCount: number;
  highAuthorityCount: number;
  mediumAuthorityCount: number;
  lowAuthorityCount: number;
  topAuthorityPages: { path: string; score: number; inboundLinks: number }[];
  orphanPages: { path: string; depth: number }[];
}

/**
 * Recalculates internal authority scores and link graph for all pages
 */
export async function recalculateInternalAuthority(): Promise<AuthoritySummary> {
  const db = getSeoDb();
  const pagesSnap = await db.collection('seo_pages').get();

  if (pagesSnap.empty) {
    return {
      totalPages: 0,
      orphanPagesCount: 0,
      highAuthorityCount: 0,
      mediumAuthorityCount: 0,
      lowAuthorityCount: 0,
      topAuthorityPages: [],
      orphanPages: [],
    };
  }

  const pages: SeoPageProfile[] = pagesSnap.docs.map((doc) => doc.data() as SeoPageProfile);

  // 1. Build Inbound Links Map
  // Map of targetPath -> Set of referring page paths
  const inboundMap: Map<string, Set<string>> = new Map();

  // Initialize map
  for (const page of pages) {
    inboundMap.set(page.path, new Set());
  }

  // Populate inbound edges
  for (const page of pages) {
    for (const outboundPath of page.internalLinksOut || []) {
      const normalized = outboundPath.startsWith('/') ? outboundPath : `/${outboundPath}`;
      if (inboundMap.has(normalized)) {
        inboundMap.get(normalized)!.add(page.path);
      }
    }
  }

  // 2. Compute Authority Scores
  const updatedPages: SeoPageProfile[] = [];
  const orphanPages: { path: string; depth: number }[] = [];

  for (const page of pages) {
    const referringSet = inboundMap.get(page.path) || new Set();
    const inboundLinksCount = referringSet.size;
    const referringPagesCount = referringSet.size;

    // Is orphan if it's not the homepage and has 0 inbound links
    const isOrphan = page.path !== '/' && inboundLinksCount === 0;
    if (isOrphan) {
      orphanPages.push({ path: page.path, depth: page.depth });
    }

    // Scoring Algorithm:
    // Base: inbound links weighted + depth bonus (shallower is better) + sitemap presence
    let rawScore = 0;

    // Homepage naturally anchors authority
    if (page.path === '/') {
      rawScore = 100;
    } else {
      // Inbound links (capped at 40 points)
      const inboundScore = Math.min(inboundLinksCount * 4, 40);

      // Unique referring pages (capped at 25 points)
      const refScore = Math.min(referringPagesCount * 3, 25);

      // Depth bonus (depth 1 gets 20, depth 2 gets 15, depth 3 gets 10, etc.)
      const depthScore = Math.max(0, 20 - (page.depth || 1) * 4);

      // Sitemap bonus
      const sitemapScore = page.inSitemap ? 10 : 0;

      // Word count / content importance bonus
      const contentScore = page.wordCount > 600 ? 5 : 0;

      // Orphan penalty
      const orphanPenalty = isOrphan ? 35 : 0;

      rawScore = Math.max(5, Math.min(100, inboundScore + refScore + depthScore + sitemapScore + contentScore - orphanPenalty));
    }

    // Determine Tier
    let authorityTier: SeoPageProfile['authorityTier'] = 'MEDIUM';
    if (isOrphan) {
      authorityTier = 'ORPHAN';
    } else if (rawScore >= 75) {
      authorityTier = 'HIGH';
    } else if (rawScore >= 45) {
      authorityTier = 'MEDIUM';
    } else if (rawScore >= 25) {
      authorityTier = 'LOW';
    } else {
      authorityTier = 'VERY_LOW';
    }

    const updatedProfile: SeoPageProfile = {
      ...page,
      inboundLinksCount,
      referringPagesCount,
      isOrphan,
      internalAuthorityScore: rawScore,
      authorityTier,
    };

    updatedPages.push(updatedProfile);
  }

  // 3. Batch commit updates to SEO Firebase
  const batch = db.batch();
  for (const page of updatedPages) {
    const ref = db.collection('seo_pages').doc(page.id);
    batch.update(ref, {
      inboundLinksCount: page.inboundLinksCount,
      referringPagesCount: page.referringPagesCount,
      isOrphan: page.isOrphan,
      internalAuthorityScore: page.internalAuthorityScore,
      authorityTier: page.authorityTier,
    });
  }
  await batch.commit();

  // Summary counts
  const highAuthorityCount = updatedPages.filter((p) => p.authorityTier === 'HIGH').length;
  const mediumAuthorityCount = updatedPages.filter((p) => p.authorityTier === 'MEDIUM').length;
  const lowAuthorityCount = updatedPages.filter((p) => p.authorityTier === 'LOW' || p.authorityTier === 'VERY_LOW').length;

  const topAuthorityPages = updatedPages
    .sort((a, b) => b.internalAuthorityScore - a.internalAuthorityScore)
    .slice(0, 10)
    .map((p) => ({ path: p.path, score: p.internalAuthorityScore, inboundLinks: p.inboundLinksCount }));

  return {
    totalPages: updatedPages.length,
    orphanPagesCount: orphanPages.length,
    highAuthorityCount,
    mediumAuthorityCount,
    lowAuthorityCount,
    topAuthorityPages,
    orphanPages,
  };
}
