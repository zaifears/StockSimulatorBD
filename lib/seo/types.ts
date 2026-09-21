// lib/seo/types.ts
// Comprehensive TypeScript definitions for Search & GEO/LLM Intelligence

export type SeoSystemMode = 'free' | 'hybrid';

export interface SeoConfig {
  id: string;
  mode: SeoSystemMode;
  estimatedMonthlyCost: number;
  mainDomain: string;
  targetMigrationDomain: string;
  crawlerBatchSize: number;
  freeTierActive: boolean;
  lastUpdated: string;
}

export type PageType = 'home' | 'stock' | 'blog' | 'guide' | 'policy' | 'boss' | 'other';

export interface SeoPageProfile {
  id: string; // URL path or normalized key
  url: string;
  path: string;
  pageType: PageType;
  title: string;
  titleLength: number;
  description: string;
  descriptionLength: number;
  canonical: string;
  robots: string;
  h1: string;
  h2s: string[];
  wordCount: number;
  schemaTypes: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  hasImages: boolean;
  imagesCount: number;
  imagesMissingAltCount: number;
  internalLinksOut: string[];
  externalLinksOut: string[];
  inboundLinksCount: number;
  referringPagesCount: number;
  depth: number;
  inSitemap: boolean;
  isOrphan: boolean;
  internalAuthorityScore: number; // 0-100
  authorityTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW' | 'ORPHAN';
  contentHash: string;
  status: number;
  issues: SeoIssue[];
  lastCrawledAt: string;
}

export interface SeoIssue {
  code: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface SeoInternalLinkEdge {
  id: string;
  sourceUrl: string;
  targetUrl: string;
  anchorText?: string;
  discoveredAt: string;
}

export interface GscDailyMetric {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueryData {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  targetPages: string[];
  trend?: 'rising' | 'stable' | 'declining';
  previousPeriodImpressions?: number;
}

export interface GscPageData {
  path: string;
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topQueries: string[];
}

export interface GscDimensionData {
  dimension: 'country' | 'device' | 'searchAppearance';
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export type OpportunityType =
  | 'high_impression_low_ctr'
  | 'striking_distance'
  | 'rising_query'
  | 'query_page_mismatch'
  | 'content_gap'
  | 'orphan_page'
  | 'ai_citation_gap'
  | 'technical_issue';

export interface SeoOpportunity {
  id: string;
  type: OpportunityType;
  title: string;
  targetUrl?: string;
  query?: string;
  priority: 'high' | 'medium' | 'low';
  evidence: {
    impressions?: number;
    clicks?: number;
    ctr?: number;
    position?: number;
    siteMedianCtr?: number;
    competitorCitations?: string[];
    technicalIssue?: string;
    internalInboundLinks?: number;
  };
  suggestedAction: string;
  expectedBenefit: string;
  riskLevel: 'safe' | 'review' | 'code_pr';
  status: 'active' | 'applied' | 'dismissed';
  detectedAt: string;
}

export type AiProvider = 'ChatGPT' | 'Gemini' | 'Perplexity' | 'Claude' | 'Custom';

export interface AiPromptTemplate {
  id: string;
  category: 'educational' | 'dse_trading' | 'stock_research' | 'comparison' | 'tax_investing';
  query: string;
  targetConcept: string;
  recommendedProviders: AiProvider[];
}

export interface AiVisibilityObservation {
  id: string;
  query: string;
  provider: AiProvider;
  model: string;
  promptCategory: string;
  rawText: string;
  mentioned: boolean;
  cited: boolean;
  citedUrls: string[];
  competitorNames: string[];
  competitorUrls: string[];
  citationOrder: number | null; // 1-indexed, or null if not cited
  answeredAccurately: boolean | null;
  observedAt: string;
  notes?: string;
}

export interface AiReadinessDiagnostic {
  entityClarity: boolean;
  topicCoverage: boolean;
  answerCompleteness: 'good' | 'fair' | 'poor';
  sourceAttribution: boolean;
  freshness: boolean;
  crawlability: boolean;
  semanticStructure: boolean;
  internalLinking: 'strong' | 'moderate' | 'weak';
  citationWorthiness: 'high' | 'medium' | 'low';
  structuredData: boolean;
}

export interface SeoRecommendation {
  id: string;
  title: string;
  targetUrl: string;
  type: 'metadata' | 'content' | 'internal_links' | 'technical' | 'ai_geo' | 'migration';
  reason: string;
  evidence: Record<string, any>;
  before: Record<string, any>;
  proposed: Record<string, any>;
  risk: 'safe' | 'review' | 'code_pr';
  status: 'detected' | 'review' | 'approved' | 'applied' | 'validated' | 'dismissed';
  createdAt: string;
  approvedAt?: string;
  appliedAt?: string;
  validatedAt?: string;
  rollbackData?: Record<string, any>;
}

export interface SeoOverride {
  id: string; // path or URL hash
  path: string;
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  appliedAt: string;
  appliedBy: string;
  previousValues: Record<string, any>;
}

export interface MigrationUrlMapping {
  id: string;
  path: string;
  oldUrl: string;
  newUrl: string;
  targetStatus: number | null;
  redirectWorking: boolean | null;
  redirectType: number | null; // e.g. 301
  canonicalMatchesTarget: boolean | null;
  contentHashMatches: boolean | null;
  lastCheckedAt?: string;
  error?: string;
}

export interface MigrationCheckSummary {
  oldDomain: string;
  newDomain: string;
  totalUrls: number;
  redirectsWorkingCount: number;
  canonicalPassCount: number;
  schemaPassCount: number;
  httpsPassCount: number;
  status: 'planning' | 'shadow_mode' | 'cutover_ready' | 'cutover_live' | 'hold_active';
  lastRunAt: string;
}

export interface CrawlJobState {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  totalUrls: number;
  processedCount: number;
  cursorIndex: number;
  batchSize: number;
  startedAt: string;
  finishedAt?: string;
  lastBatchAt?: string;
  error?: string;
}

// ==========================================
// 1. Google AI Overviews / AI Mode Analytics
// ==========================================
export interface GscAiOverviewRow {
  date?: string;
  page?: string;
  country?: string;
  device?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position?: number;
}

export interface GscAiSnapshot {
  id: string; // snapshot timestamp or date
  periodLabel: string;
  totalAiImpressions: number;
  totalAiClicks: number;
  averageAiCtr: number;
  topPages: { path: string; impressions: number; clicks: number; ctr: number }[];
  countryBreakdown: { country: string; impressions: number; clicks: number }[];
  deviceBreakdown: { device: string; impressions: number; clicks: number }[];
  organicCorrelation: {
    organicImpressions: number;
    organicClicks: number;
    organicCtr: number;
    aiShareOfImpressions: number; // percentage
  };
  importedAt: string;
  importedBy?: string;
  fileName: string;
  rowCount: number;
}

// ==========================================
// 2. Bing Webmaster Tools
// ==========================================
export interface BingTrafficStats {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  vertical: 'web' | 'chat' | 'news' | 'images' | 'video';
}

export interface BingQueryItem {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface BingCrawlStat {
  crawlDate: string;
  pagesCrawled: number;
  crawlErrors: number;
  dnsFailures: number;
  blockedByRobots: number;
}

export interface BingLinkItem {
  url: string;
  targetPage: string;
  anchorText?: string;
  discoveredDate: string;
}

export interface BingAccountConfig {
  apiKey?: string;
  siteUrl?: string;
  connected: boolean;
  lastSyncAt?: string;
  error?: string;
}

// ==========================================
// 3. Dedicated URL Indexation Monitor
// ==========================================
export type IndexPriorityTier = 1 | 2 | 3;

export interface UrlInspectionItem {
  id: string; // normalized path
  url: string;
  path: string;
  priority: IndexPriorityTier; // 1 = High (home, guides, top stocks), 2 = Evergreen, 3 = Rest
  googleIndexed: boolean | null;
  verdict: 'PASS' | 'FAIL' | 'NEUTRAL' | 'UNKNOWN';
  indexingState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
  mobileUsable?: boolean;
  richResultsStatus?: string;
  lastInspectedAt?: string;
  queuedAt?: string;
}

// ==========================================
// 4. Sitemap Intelligence & Discrepancies
// ==========================================
export interface SitemapIntelligence {
  sitemapUrl: string;
  submittedAt: string;
  lastDownloadedAt: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  totalUrlsInSitemap: number;
  totalUrlsCrawled: number;
  errorsCount: number;
  warningsCount: number;
  discrepancies: SitemapDiscrepancy[];
}

export interface SitemapDiscrepancy {
  id: string;
  url: string;
  type: 'orphan_in_sitemap' | 'returns_404' | 'canonical_mismatch' | 'noindex_in_sitemap' | 'redirect_in_sitemap';
  message: string;
  detectedAt: string;
}

// ==========================================
// 5. Multi-Vertical Search Types
// ==========================================
export type SearchVertical = 'web' | 'image' | 'video' | 'news' | 'discover' | 'googleNews';

export interface SearchVerticalMetric {
  vertical: SearchVertical;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// ==========================================
// 6. Chrome UX Report (CrUX) Field Data
// ==========================================
export interface CruxMetricScore {
  p75: number;
  rating: 'good' | 'needs_improvement' | 'poor';
}

export interface CruxFieldData {
  urlOrOrigin: string;
  collectionPeriod: string; // e.g. "28 days rolling"
  lcp: CruxMetricScore; // Largest Contentful Paint (ms)
  inp: CruxMetricScore; // Interaction to Next Paint (ms)
  cls: CruxMetricScore; // Cumulative Layout Shift
  fcp: CruxMetricScore; // First Contentful Paint (ms)
  ttfb: CruxMetricScore; // Time to First Byte (ms)
  overallStatus: 'healthy' | 'needs_improvement' | 'poor';
  lastCheckedAt: string;
}

// ==========================================
// 7. AI Crawler Access Monitor & Robots Audit
// ==========================================
export type BotCrawlerName =
  | 'Googlebot'
  | 'OAI-SearchBot'
  | 'Bingbot'
  | 'PerplexityBot'
  | 'ClaudeBot'
  | 'Bytespider'
  | 'Other';

export interface AiCrawlerLog {
  id: string;
  botName: BotCrawlerName;
  userAgent: string;
  ipMasked?: string;
  path: string;
  statusCode: number;
  robotsAllowed: boolean;
  observationalNote: string; // e.g. "Identified by user-agent string"
  timestamp: string;
}

export interface CrawlerSummary {
  botName: BotCrawlerName;
  lastSeen: string;
  totalRequests: number;
  successfulCount: number; // 200
  forbiddenCount: number; // 403
  notFoundCount: number; // 404
  robotsBlockedCount: number;
  robotsTxtStatus: 'allowed' | 'disallowed' | 'not_specified';
}

// ==========================================
// 8. Deterministic Prompt Discovery ($0 Spend)
// ==========================================
export interface DeterministicPrompt {
  id: string;
  seedQuery: string;
  generatedPrompt: string;
  intent: 'how_to' | 'beginner' | 'tools' | 'best_practice' | 'analysis';
  category: 'dse_trading' | 'stock_research' | 'education' | 'market_rules';
  suggestedProvider: AiProvider;
  createdAt: string;
}

// ==========================================
// 9. AI Citation History, Events & Referrals
// ==========================================
export interface AiCitationTimelinePoint {
  dateMonth: string; // YYYY-MM
  query: string;
  chatGptCited: boolean;
  geminiCited: boolean;
  perplexityCited: boolean;
  claudeCited: boolean;
}

export type AiCitationEventType =
  | 'NEW_CITATION'
  | 'CITATION_LOST'
  | 'MENTION_GAINED'
  | 'MENTION_LOST'
  | 'URL_CHANGED'
  | 'COMPETITOR_ADDED'
  | 'COMPETITOR_REMOVED';

export interface AiCitationEvent {
  id: string;
  eventType: AiCitationEventType;
  provider: AiProvider;
  query: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  detectedAt: string;
}

export interface AiReferralSummary {
  referrerHost: 'chatgpt.com' | 'perplexity.ai' | 'gemini.google.com' | 'claude.ai' | 'copilot.microsoft.com' | string;
  totalVisits: number;
  topLandingPages: { path: string; visits: number }[];
  period: string;
  lastSeenAt: string;
}

// ==========================================
// 10. True SEO Change-Impact Engine
// ==========================================
export interface MetricComparisonWindow {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  queryCount: number;
  indexed: boolean;
  aiCited: boolean;
}

export interface SeoChangeImpact {
  id: string; // changeId
  path: string;
  changeDate: string;
  changeDescription: string;
  before28d: MetricComparisonWindow;
  after7d?: MetricComparisonWindow;
  after14d?: MetricComparisonWindow;
  after28d?: MetricComparisonWindow;
  observationalSummary: string; // Strictly "observed after change", never "caused by"
  status: 'monitoring' | 'concluded';
  lastEvaluatedAt: string;
}

// ==========================================
// 11. Entity Consistency & Source/Evidence Graph
// ==========================================
export interface EntityConsistencyCheck {
  path: string;
  brandConsistency: boolean;
  organizationConsistency: boolean;
  domainConsistency: boolean;
  sameAsValid: boolean;
  jsonLdValid: boolean;
  stockAttributes?: {
    ticker: string;
    companyName: string;
    exchange: string; // DSE
    sector: string;
    dataSource: string;
    lastUpdated: string;
  };
  issues: string[];
  lastCheckedAt: string;
}

export interface FinancialSourceEvidence {
  id: string;
  path: string;
  primarySource: 'Dhaka Stock Exchange (DSE)' | 'Company Annual Report' | 'Company Official Website' | 'CDBL' | 'BSEC' | 'Other';
  claimsCovered: string[];
  lastVerifiedDate: string;
  stalenessAlert: boolean;
  freshnessDays: number;
  sourceUrl?: string;
}

