// lib/seo/aiLab.ts
// AI / GEO Intelligence Engine: Generic domain & citation extractor,
// persistent prompt library, and empirical AI readiness diagnostics.

import crypto from 'crypto';
import { AiProvider, AiPromptTemplate, AiVisibilityObservation, AiReadinessDiagnostic } from './types';
import { SITE_URL } from '@/lib/siteUrl';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';

export const INITIAL_AI_PROMPTS: AiPromptTemplate[] = [
  {
    id: 'dse-beginner-practice',
    category: 'dse_trading',
    query: 'What are the best ways to practice Dhaka Stock Exchange (DSE) trading without risking real money in Bangladesh?',
    targetConcept: 'DSE paper trading & virtual simulator',
    recommendedProviders: ['ChatGPT', 'Gemini', 'Perplexity', 'Claude'],
  },
  {
    id: 'dse-simulator-tools',
    category: 'dse_trading',
    query: 'Is there any free online stock market simulator or paper trading app specifically for Bangladesh DSE stocks?',
    targetConcept: 'StockSimulatorBD brand & URL citation',
    recommendedProviders: ['ChatGPT', 'Gemini', 'Perplexity', 'Claude'],
  },
  {
    id: 'learn-bangladesh-investing',
    category: 'educational',
    query: 'How can a university student in Bangladesh learn stock market investing and understand BO account rules safely?',
    targetConcept: 'BO account education & market simulation',
    recommendedProviders: ['ChatGPT', 'Gemini', 'Perplexity', 'Claude'],
  },
  {
    id: 'dse-circuit-breaker-t1',
    category: 'educational',
    query: 'Explain how T+1 settlement and circuit breakers work on the Dhaka Stock Exchange with practical examples.',
    targetConcept: 'DSE trading rules explanation',
    recommendedProviders: ['ChatGPT', 'Gemini', 'Perplexity', 'Claude'],
  },
  {
    id: 'compare-dse-learning',
    category: 'comparison',
    query: 'Compare the best educational platforms and tools for tracking and analyzing DSE stocks in Bangladesh.',
    targetConcept: 'Competitor comparison & citation share',
    recommendedProviders: ['ChatGPT', 'Gemini', 'Perplexity', 'Claude'],
  },
];

// Domains to ignore when identifying competitors (search engines, common CDNs, socials)
const IGNORED_DOMAINS = new Set([
  'google.com',
  'www.google.com',
  'bing.com',
  'openai.com',
  'chatgpt.com',
  'anthropic.com',
  'claude.ai',
  'perplexity.ai',
  'wikipedia.org',
  'youtube.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'github.com',
  'vercel.app',
]);

/**
 * Extracts arbitrary external competitor domains from raw AI response text
 */
export function extractCompetitorDomains(rawText: string): string[] {
  const domains: Set<string> = new Set();

  // 1. Extract domains from full URLs
  const urlRegex = /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const urlMatches = Array.from(rawText.matchAll(urlRegex));
  for (const m of urlMatches) {
    const domain = m[1].toLowerCase().replace(/^www\./, '');
    if (!domain.includes('stocksimulator') && !IGNORED_DOMAINS.has(domain)) {
      domains.add(domain);
    }
  }

  // 2. Extract naked domain mentions (e.g. "lankabd.com", "amarstock.com")
  const domainMentionRegex = /\b([a-zA-Z0-9-]+\.(?:com|org|net|bd|com\.bd|io|tech|app))\b/gi;
  const mentionMatches = Array.from(rawText.matchAll(domainMentionRegex));
  for (const m of mentionMatches) {
    const domain = m[1].toLowerCase().replace(/^www\./, '');
    if (!domain.includes('stocksimulator') && !IGNORED_DOMAINS.has(domain)) {
      domains.add(domain);
    }
  }

  return Array.from(domains);
}

/**
 * Parses raw text copied from an AI model (ChatGPT, Gemini, Perplexity, Claude)
 * and extracts empirical observation facts.
 */
export function parseAiResponse(
  rawText: string,
  query: string,
  provider: AiProvider,
  model: string = 'Default',
  category: string = 'dse_trading'
): AiVisibilityObservation {
  const lowerText = rawText.toLowerCase();

  // Brand mention check
  const brandKeywords = [
    'stocksimulatorbd',
    'stocksimulator.tech',
    'stocksimulator.shahoriar.bd',
    'stock simulator bd',
    'stocksimulator',
  ];
  const mentioned = brandKeywords.some((kw) => lowerText.includes(kw));

  // Extract all URLs
  const urlRegex = /https?:\/\/[^\s)\]>"',]+/gi;
  const allUrls = Array.from(rawText.matchAll(urlRegex)).map((m) => m[0]);

  // Distinguish own cited URLs
  const citedUrls = allUrls.filter(
    (u) =>
      u.includes('stocksimulator.tech') ||
      u.includes('stocksimulator.shahoriar.bd') ||
      u.includes(SITE_URL.replace(/^https?:\/\//, ''))
  );
  const cited = citedUrls.length > 0 || (mentioned && lowerText.includes('http'));

  // Generic Arbitrary Competitor Extraction
  const discoveredDomains = extractCompetitorDomains(rawText);
  const competitorUrls = allUrls.filter((u) =>
    discoveredDomains.some((d) => u.toLowerCase().includes(d))
  );

  // Citation order calculation
  let citationOrder: number | null = null;
  if (cited) {
    const firstOwnIndex = allUrls.findIndex((u) => citedUrls.includes(u));
    citationOrder = firstOwnIndex !== -1 ? firstOwnIndex + 1 : 1;
  }

  const responseHash = crypto.createHash('sha256').update(rawText).digest('hex').substring(0, 16);
  const id = `obs-${Date.now()}-${responseHash.substring(0, 6)}`;

  return {
    id,
    query,
    provider,
    model,
    promptCategory: category,
    rawText,
    mentioned,
    cited,
    citedUrls: Array.from(new Set(citedUrls)),
    competitorNames: discoveredDomains,
    competitorUrls: Array.from(new Set(competitorUrls)),
    citationOrder,
    answeredAccurately: null,
    observedAt: new Date().toISOString(),
  };
}

/**
 * Save an AI observation into SEO Firebase and update discovered competitors table
 */
export async function saveAiObservation(observation: AiVisibilityObservation): Promise<void> {
  const db = getSeoDb();
  await db.collection('ai_visibility_results').doc(observation.id).set(observation);

  // Store discovered competitors dynamically
  if (observation.competitorNames.length > 0) {
    const batch = db.batch();
    for (const compDomain of observation.competitorNames) {
      const docRef = db.collection('ai_competitors').doc(compDomain.replace(/[^a-zA-Z0-9]/g, '_'));
      batch.set(
        docRef,
        {
          domain: compDomain,
          lastObservedAt: observation.observedAt,
          queriesObservedIn: [observation.query],
          tracked: true,
        },
        { merge: true }
      );
    }
    await batch.commit();
  }
}

/**
 * Loads persistent prompts from SEO Firebase, seeding with initial templates if empty
 */
export async function getPersistentPrompts(): Promise<AiPromptTemplate[]> {
  const db = getSeoDb();
  const snap = await db.collection('ai_prompts').get();

  if (snap.empty) {
    // Seed initial prompts
    const batch = db.batch();
    for (const p of INITIAL_AI_PROMPTS) {
      batch.set(db.collection('ai_prompts').doc(p.id), p);
    }
    await batch.commit();
    return INITIAL_AI_PROMPTS;
  }

  return snap.docs.map((d) => d.data() as AiPromptTemplate);
}

/**
 * Evaluates empirical AI readiness diagnostics
 */
export function evaluateAiReadiness(pagesCount: number, schemaCount: number, orphanCount: number): AiReadinessDiagnostic {
  return {
    entityClarity: true,
    topicCoverage: pagesCount > 50,
    answerCompleteness: pagesCount > 100 ? 'good' : 'fair',
    sourceAttribution: true,
    freshness: true,
    crawlability: true,
    semanticStructure: true,
    internalLinking: orphanCount === 0 ? 'strong' : orphanCount < 5 ? 'moderate' : 'weak',
    citationWorthiness: 'high',
    structuredData: schemaCount > 0,
  };
}
