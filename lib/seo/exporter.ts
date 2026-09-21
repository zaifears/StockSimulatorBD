// lib/seo/exporter.ts
// Generates LLM-friendly Search Intelligence Reports in Markdown and JSON.
// Distinguishes OBSERVED FACT vs LIKELY CAUSE vs HYPOTHESIS vs RECOMMENDATION.

import { SITE_URL } from '@/lib/siteUrl';
import { SeoPageProfile, GscQueryData, SeoOpportunity, AiVisibilityObservation, MigrationCheckSummary } from './types';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';

export interface SeoIntelligenceReport {
  metadata: {
    report_type: string;
    generated_at: string;
    site: string;
    market: string;
    language: string;
    data_sources: string[];
    confidence: {
      gsc: string;
      crawler: string;
      ai_visibility: string;
    };
  };
  executiveSummary: {
    totalCrawledPages: number;
    totalSearchClicks28d: number;
    totalSearchImpressions28d: number;
    averagePosition: number;
    orphanPagesCount: number;
    aiQueriesTested: number;
    aiCitationsCount: number;
    criticalIssuesCount: number;
  };
  topQueryOpportunities: any[];
  topPageOpportunities: any[];
  internalAuthorityHighlights: any[];
  aiCitationsAndGaps: any[];
  migrationStatus: any;
  prioritizedActions: any[];
}

/**
 * Builds the structured data report
 */
export async function buildSeoIntelligenceData(): Promise<SeoIntelligenceReport> {
  const db = getSeoDb();

  const [pagesSnap, queriesSnap, oppsSnap, aiSnap, migSnap] = await Promise.all([
    db.collection('seo_pages').get(),
    db.collection('gsc_query_snapshots').get(),
    db.collection('seo_recommendations').where('status', '==', 'detected').get(),
    db.collection('ai_visibility_results').get(),
    db.collection('migration_checks').doc('latest').get(),
  ]);

  const pages: SeoPageProfile[] = pagesSnap.docs.map((d) => d.data() as SeoPageProfile);
  const queries: GscQueryData[] = queriesSnap.docs.map((d) => d.data() as GscQueryData);
  const opps: SeoOpportunity[] = oppsSnap.docs.map((d) => d.data() as SeoOpportunity);
  const aiObs: AiVisibilityObservation[] = aiSnap.docs.map((d) => d.data() as AiVisibilityObservation);
  const migData = (migSnap.data() as MigrationCheckSummary) || null;

  // Aggregate stats
  const totalClicks = queries.reduce((sum, q) => sum + (q.clicks || 0), 0);
  const totalImpressions = queries.reduce((sum, q) => sum + (q.impressions || 0), 0);
  const avgPos = queries.length > 0 ? queries.reduce((sum, q) => sum + (q.position || 0), 0) / queries.length : 0;
  const orphanCount = pages.filter((p) => p.isOrphan).length;
  const criticalCount = pages.reduce((sum, p) => sum + (p.issues?.filter((i) => i.type === 'critical').length || 0), 0);
  const citedAiCount = aiObs.filter((o) => o.cited).length;

  return {
    metadata: {
      report_type: 'stocksimulatorbd_search_intelligence',
      generated_at: new Date().toISOString(),
      site: SITE_URL,
      market: 'Bangladesh (Dhaka Stock Exchange - DSE)',
      language: 'en-BD',
      data_sources: [
        'Google Search Console API (sampled)',
        'Internal Batch HTML Crawler',
        'Manual AI Query Lab Observations (ChatGPT, Gemini, Perplexity, Claude)',
        'Internal Link Authority Engine',
        'W3C & PageSpeed diagnostics',
      ],
      confidence: {
        gsc: 'high',
        crawler: 'high',
        ai_visibility: 'observational',
      },
    },
    executiveSummary: {
      totalCrawledPages: pages.length,
      totalSearchClicks28d: totalClicks,
      totalSearchImpressions28d: totalImpressions,
      averagePosition: Math.round(avgPos * 10) / 10,
      orphanPagesCount: orphanCount,
      aiQueriesTested: aiObs.length,
      aiCitationsCount: citedAiCount,
      criticalIssuesCount: criticalCount,
    },
    topQueryOpportunities: opps.filter((o) => o.type === 'high_impression_low_ctr' || o.type === 'striking_distance').slice(0, 10),
    topPageOpportunities: pages.filter((p) => p.issues?.length > 0).slice(0, 10),
    internalAuthorityHighlights: pages.sort((a, b) => b.internalAuthorityScore - a.internalAuthorityScore).slice(0, 8),
    aiCitationsAndGaps: aiObs.slice(0, 10),
    migrationStatus: migData,
    prioritizedActions: opps.sort((a, b) => (a.priority === 'high' ? -1 : 1)).slice(0, 10),
  };
}

/**
 * Formats the intelligence data into clean, LLM-optimized Markdown
 */
export async function generateSeoMarkdownReport(): Promise<string> {
  const data = await buildSeoIntelligenceData();

  return `---
report_type: ${data.metadata.report_type}
generated_at: ${data.metadata.generated_at}
site: ${data.metadata.site}
market: ${data.metadata.market}
language: ${data.metadata.language}
data_sources:
${data.metadata.data_sources.map((s) => `  - ${s}`).join('\n')}
confidence:
  gsc: ${data.metadata.confidence.gsc}
  crawler: ${data.metadata.confidence.crawler}
  ai_visibility: ${data.metadata.confidence.ai_visibility}
---

# StockSimulatorBD Search & AI Intelligence Report

> **Instruction for Downstream LLMs**:
> When reasoning over this report, strictly maintain analytical discipline:
> - **[OBSERVED FACT]**: Empirical data recorded by Google Search Console, internal crawler, or manual query labs.
> - **[LIKELY CAUSE]**: Diagnosed structural or technical pattern explaining the observed fact.
> - **[HYPOTHESIS]**: Testable assumption about ranking or visibility behavior.
> - **[RECOMMENDATION]**: Concrete, actionable modification with verifiable before-and-after criteria.

---

## 1. Executive Summary
- **[OBSERVED FACT]** Site Canonical: \`${data.metadata.site}\`
- **[OBSERVED FACT]** Total Indexed & Crawled Pages: ${data.executiveSummary.totalCrawledPages}
- **[OBSERVED FACT]** 28-Day Google Search Impressions: ${data.executiveSummary.totalSearchImpressions28d.toLocaleString()}
- **[OBSERVED FACT]** 28-Day Google Search Clicks: ${data.executiveSummary.totalSearchClicks28d.toLocaleString()}
- **[OBSERVED FACT]** Average Search Position: ${data.executiveSummary.averagePosition}
- **[OBSERVED FACT]** Orphan Pages Detected: ${data.executiveSummary.orphanPagesCount}
- **[OBSERVED FACT]** AI Visibility Queries Tested: ${data.executiveSummary.aiQueriesTested} (Cited: ${data.executiveSummary.aiCitationsCount})
- **[OBSERVED FACT]** Critical Technical SEO Defects: ${data.executiveSummary.criticalIssuesCount}

---

## 2. High-Impact Search Opportunities
${data.topQueryOpportunities.length > 0 ? data.topQueryOpportunities.map((o, idx) => `
### ${idx + 1}. ${o.title}
- **Type**: \`${o.type}\` (Priority: **${o.priority.toUpperCase()}**)
- **Target URL**: \`${o.targetUrl}\`
- **[OBSERVED FACT]**: Impressions: ${o.evidence?.impressions || 'N/A'}, Clicks: ${o.evidence?.clicks || 'N/A'}, Avg Position: ${o.evidence?.position || 'N/A'}, CTR: ${o.evidence?.ctr ? o.evidence.ctr + '%' : 'N/A'}
- **[RECOMMENDATION]**: ${o.suggestedAction}
- **Expected Benefit**: ${o.expectedBenefit}
`).join('\n') : '*No critical query opportunities detected. Sync Search Console to populate.*'}

---

## 3. Internal Link Authority & Orphan Analysis
- **Top Authority Pages**:
${data.internalAuthorityHighlights.map((p) => `  - \`${p.path}\`: Score ${p.internalAuthorityScore}/100 (${p.authorityTier}), Inbound links: ${p.inboundLinksCount}`).join('\n')}

---

## 4. AI & Generative Engine Optimization (GEO) Observations
${data.aiCitationsAndGaps.length > 0 ? data.aiCitationsAndGaps.map((obs) => `
- **Query**: "${obs.query}"
  - **Provider / Model**: ${obs.provider} (${obs.model})
  - **[OBSERVED FACT]**: Mentioned: ${obs.mentioned ? 'YES' : 'NO'} | Cited URL: ${obs.cited ? 'YES' : 'NO'}
  - **Competitors Observed**: ${obs.competitorNames?.join(', ') || 'None'}
`).join('\n') : '*No AI observations logged yet. Use the Query Lab at /admin/seo/ai-geo to record baseline.*'}

---

## 5. Domain Migration Readiness
- **Old Origin**: \`https://www.stocksimulator.tech\` (Expires June 2027)
- **Target Origin**: \`https://stocksimulator.shahoriar.bd\`
- **[OBSERVED FACT]**: Preflight Audit Status: \`${data.migrationStatus?.status || 'Planning Phase'}\`
- **Requirement**: Enforce path-preserving 301 redirects (e.g. \`/stocks/gp\` -> \`https://stocksimulator.shahoriar.bd/stocks/gp\`). Never redirect deep pages to homepage.

---

## 6. Prioritized Action Checklist
${data.prioritizedActions.map((action, idx) => `
${idx + 1}. **[${action.priority.toUpperCase()}]** ${action.title}
   - Target: \`${action.targetUrl || 'Site-wide'}\`
   - Suggested Action: ${action.suggestedAction}
   - Risk: \`${action.riskLevel}\`
`).join('\n')}
`;
}
