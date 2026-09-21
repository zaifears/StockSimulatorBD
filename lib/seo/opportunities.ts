// lib/seo/opportunities.ts
// Opportunity Engine for StockSimulatorBD.
// Identifies high-leverage search & AI opportunities backed by empirical evidence.

import { SeoOpportunity, GscQueryData, SeoPageProfile, AiVisibilityObservation } from './types';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';

/**
 * Derives actionable SEO and AI opportunities from crawled pages, GSC queries, and AI observations
 */
export async function generateSeoOpportunities(): Promise<SeoOpportunity[]> {
  const db = getSeoDb();

  const [pagesSnap, queriesSnap, aiObsSnap] = await Promise.all([
    db.collection('seo_pages').get(),
    db.collection('gsc_query_snapshots').get(),
    db.collection('ai_visibility_results').get(),
  ]);

  const pages: SeoPageProfile[] = pagesSnap.docs.map((d) => d.data() as SeoPageProfile);
  const queries: GscQueryData[] = queriesSnap.docs.map((d) => d.data() as GscQueryData);
  const aiObs: AiVisibilityObservation[] = aiObsSnap.docs.map((d) => d.data() as AiVisibilityObservation);

  const opportunities: SeoOpportunity[] = [];

  // Median CTR estimate for comparison (standard average ~3.5%)
  const siteMedianCtr = 0.035;

  // 1. High Impression / Low CTR detection
  for (const q of queries) {
    if (q.impressions >= 500 && q.ctr < siteMedianCtr && q.position <= 10) {
      opportunities.push({
        id: `opp-ctr-${encodeURIComponent(q.query.slice(0, 30))}`,
        type: 'high_impression_low_ctr',
        title: `Improve CTR for high-impression query "${q.query}"`,
        query: q.query,
        targetUrl: q.targetPages?.[0] || '/trade',
        priority: q.impressions > 2000 ? 'high' : 'medium',
        evidence: {
          impressions: q.impressions,
          clicks: q.clicks,
          ctr: Math.round(q.ctr * 1000) / 10,
          position: Math.round(q.position * 10) / 10,
          siteMedianCtr: Math.round(siteMedianCtr * 1000) / 10,
        },
        suggestedAction: `Rewrite meta title and description for ${q.targetPages?.[0] || 'landing page'} to include primary search intent and clear value proposition.`,
        expectedBenefit: `Potential click lift of +${Math.round(q.impressions * (siteMedianCtr - q.ctr))} visits/month if CTR reaches site median.`,
        riskLevel: 'safe',
        status: 'active',
        detectedAt: new Date().toISOString(),
      });
    }

    // 2. Striking Distance Positions (Position 4.0 - 15.0 with good impressions)
    if (q.position >= 4.0 && q.position <= 15.0 && q.impressions >= 300) {
      opportunities.push({
        id: `opp-strike-${encodeURIComponent(q.query.slice(0, 30))}`,
        type: 'striking_distance',
        title: `Push "${q.query}" into Top 3 Search Positions`,
        query: q.query,
        targetUrl: q.targetPages?.[0] || '/blog',
        priority: q.impressions > 1500 ? 'high' : 'medium',
        evidence: {
          impressions: q.impressions,
          position: Math.round(q.position * 10) / 10,
          clicks: q.clicks,
          ctr: Math.round(q.ctr * 1000) / 10,
        },
        suggestedAction: `Add targeted H2 section explaining "${q.query}" and route 2-3 internal contextual links from relevant stock or guide pages.`,
        expectedBenefit: 'Moving from second-half of page 1 to top 3 historically increases CTR by 3-5x.',
        riskLevel: 'review',
        status: 'active',
        detectedAt: new Date().toISOString(),
      });
    }

    // 3. Rising Query Detection
    if (q.trend === 'rising' && q.previousPeriodImpressions && q.impressions > q.previousPeriodImpressions * 1.5) {
      opportunities.push({
        id: `opp-rising-${encodeURIComponent(q.query.slice(0, 30))}`,
        type: 'rising_query',
        title: `Capitalize on rapidly rising interest in "${q.query}"`,
        query: q.query,
        priority: 'high',
        evidence: {
          impressions: q.impressions,
          position: q.position,
        },
        suggestedAction: `Create evergreen educational guide or feature spotlight addressing "${q.query}" to capture trending DSE audience.`,
        expectedBenefit: 'Establish early organic topical authority before competitors react.',
        riskLevel: 'review',
        status: 'active',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // 4. Orphan Pages & Authority Deficits
  for (const page of pages) {
    if (page.isOrphan && page.path !== '/') {
      opportunities.push({
        id: `opp-orphan-${page.id}`,
        type: 'orphan_page',
        title: `Link to orphan page: ${page.path}`,
        targetUrl: page.path,
        priority: page.pageType === 'guide' || page.pageType === 'blog' ? 'high' : 'medium',
        evidence: {
          internalInboundLinks: page.inboundLinksCount,
          technicalIssue: 'Page has zero inbound links from any other page on the site.',
        },
        suggestedAction: `Add at least 2 contextual links from high-authority pages (such as Home, /stocks, or relevant blog posts) pointing to ${page.path}.`,
        expectedBenefit: 'Allows search crawlers and AI bots to discover and index the page, transferring internal PageRank.',
        riskLevel: 'safe',
        status: 'active',
        detectedAt: new Date().toISOString(),
      });
    }

    // Technical missing metadata
    const criticalIssue = page.issues?.find((i) => i.type === 'critical');
    if (criticalIssue) {
      opportunities.push({
        id: `opp-tech-${page.id}-${criticalIssue.code}`,
        type: 'technical_issue',
        title: `Fix technical issue on ${page.path}: ${criticalIssue.message}`,
        targetUrl: page.path,
        priority: 'high',
        evidence: {
          technicalIssue: criticalIssue.message,
        },
        suggestedAction: `Resolve ${criticalIssue.field || 'technical'} defect directly or apply safe metadata override.`,
        expectedBenefit: 'Prevents crawler drop-off and indexation suppression.',
        riskLevel: 'safe',
        status: 'active',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // 5. AI Citation Gaps
  for (const obs of aiObs) {
    if (obs.competitorNames.length > 0 && !obs.cited) {
      opportunities.push({
        id: `opp-aigap-${encodeURIComponent(obs.query.slice(0, 30))}`,
        type: 'ai_citation_gap',
        title: `AI Citation Gap on ${obs.provider}: "${obs.query}"`,
        query: obs.query,
        priority: 'high',
        evidence: {
          competitorCitations: obs.competitorNames,
        },
        suggestedAction: `Optimize content structure: include clear entity definitions, DSE context, schema markup, and concise answer blocks so ${obs.provider} can ground on StockSimulatorBD.`,
        expectedBenefit: `Close citation gap where competitors (${obs.competitorNames.join(', ')}) are currently cited instead of StockSimulatorBD.`,
        riskLevel: 'review',
        status: 'active',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // Deduplicate and persist in SEO Firebase
  const batch = db.batch();
  for (const opp of opportunities.slice(0, 50)) {
    const ref = db.collection('seo_recommendations').doc(opp.id);
    batch.set(
      ref,
      {
        ...opp,
        status: 'detected',
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
  await batch.commit();

  return opportunities;
}
