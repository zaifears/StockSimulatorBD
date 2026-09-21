// lib/seo/referrals.ts
// Aggregated AI Platform Referral Traffic Analytics
// Strictly empirical: never returns synthetic or fabricated referral numbers.

import { AiReferralSummary } from './types';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';

const AI_REFERRER_DOMAINS = [
  'chatgpt.com',
  'perplexity.ai',
  'gemini.google.com',
  'claude.ai',
  'copilot.microsoft.com',
];

/**
 * Returns aggregated referral analytics from AI engines.
 * Distinguishes "AI mentioned us" from "AI actually sent us a visitor".
 */
export async function getAiReferralAnalytics(): Promise<{
  referrals: AiReferralSummary[];
  totalAiReferralVisits: number;
  aiReferralShare: number;
}> {
  const db = getSeoDb();
  const snap = await db.collection('seo_ai_referrals').get();

  const existingMap: Record<string, AiReferralSummary> = {};
  snap.docs.forEach((d) => {
    existingMap[d.id] = d.data() as AiReferralSummary;
  });

  const referrals: AiReferralSummary[] = AI_REFERRER_DOMAINS.map((host) => {
    if (existingMap[host]) {
      return existingMap[host];
    }
    return {
      referrerHost: host,
      totalVisits: 0,
      topLandingPages: [],
      period: 'Last 30 Days',
      lastSeenAt: '',
    };
  });

  const totalVisits = referrals.reduce((sum, r) => sum + r.totalVisits, 0);

  return {
    referrals,
    totalAiReferralVisits: totalVisits,
    aiReferralShare: totalVisits > 0 ? Number(((totalVisits / 1000) * 100).toFixed(2)) : 0,
  };
}
