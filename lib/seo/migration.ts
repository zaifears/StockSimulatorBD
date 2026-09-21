// lib/seo/migration.ts
// Domain Migration Center & Shadow Mode Auditor for StockSimulatorBD.
// Validates path-preserving redirects, canonical consistency, and migration checklist.
// Reference: REDIRECT.md runbook.

import { MigrationUrlMapping, MigrationCheckSummary } from './types';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';

export const OLD_DOMAIN = 'https://www.stocksimulator.tech';
export const TARGET_DOMAIN = 'https://stocksimulator.shahoriar.bd';

export interface MigrationStep {
  id: string;
  phase: number;
  title: string;
  description: string;
  completed: boolean;
  actionRequired: string;
  docsAnchor?: string;
}

export const MIGRATION_CHECKLIST: MigrationStep[] = [
  {
    id: 'phase1-domain-agnostic',
    phase: 1,
    title: 'Codebase Domain-Agnostic',
    description: 'All URLs, canonicals, sitemaps, OpenGraph tags derive from lib/siteUrl.ts.',
    completed: true,
    actionRequired: 'Completed 2026-08-23.',
  },
  {
    id: 'phase2-vercel-domain',
    phase: 2,
    title: 'Vercel Domain Configured',
    description: 'Add stocksimulator.shahoriar.bd to Vercel Domains in Serve mode and issue SSL cert.',
    completed: false,
    actionRequired: 'Check DNS CNAME record under shahoriar.bd account.',
  },
  {
    id: 'phase2-auth-allowlist',
    phase: 2,
    title: 'Auth & Security Allowlist',
    description: 'Add target domain to Firebase Auth, Google Cloud OAuth Javascript origins, and reCAPTCHA.',
    completed: false,
    actionRequired: 'Update Firebase, Google Cloud, and reCAPTCHA consoles before switch.',
  },
  {
    id: 'phase2-gsc-domain-property',
    phase: 2,
    title: 'Search Console Domain Property',
    description: 'Add shahoriar.bd as a Domain property in Google Search Console.',
    completed: false,
    actionRequired: 'DNS TXT verification for shahoriar.bd.',
  },
  {
    id: 'phase3-switch-env',
    phase: 3,
    title: 'Environment Switch & Redeploy',
    description: 'Set NEXT_PUBLIC_MAIN_DOMAIN to https://stocksimulator.shahoriar.bd in Vercel.',
    completed: false,
    actionRequired: 'Trigger redeployment after updating variable.',
  },
  {
    id: 'phase3-path-redirects',
    phase: 3,
    title: '301 Path-Preserving Redirects',
    description: 'Change stocksimulator.tech to 301 Redirect to target domain preserving URL paths.',
    completed: false,
    actionRequired: 'Ensure /stocks/gp lands on /stocks/gp, NOT the homepage.',
  },
  {
    id: 'phase3-gsc-change-of-address',
    phase: 3,
    title: 'GSC Change of Address Tool',
    description: 'Submit Change of Address in old GSC property pointing to new domain property.',
    completed: false,
    actionRequired: 'Execute in GSC Settings once 301s are verified.',
  },
  {
    id: 'phase3-crons-webhooks',
    phase: 3,
    title: 'Cron Jobs & Webhooks Migration',
    description: 'Update cron-job.org URLs for market sync and Contentful revalidation webhook.',
    completed: false,
    actionRequired: 'Update target endpoint URLs on cron-job.org and Contentful.',
  },
  {
    id: 'phase4-six-month-hold',
    phase: 4,
    title: 'Hold 301 Redirects (6 Months)',
    description: 'Maintain 301 redirects continuously until June 2027 domain expiry.',
    completed: false,
    actionRequired: 'Do not modify redirects during authority transfer period.',
  },
];

/**
 * Checks a single URL across old and new domain to verify HTTP status,
 * path preservation, and canonical tag behavior.
 */
export async function testUrlMigration(path: string): Promise<MigrationUrlMapping> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const oldUrl = `${OLD_DOMAIN}${normalizedPath}`;
  const newUrl = `${TARGET_DOMAIN}${normalizedPath}`;

  let targetStatus: number | null = null;
  let redirectWorking: boolean | null = null;
  let redirectType: number | null = null;
  let canonicalMatchesTarget: boolean | null = null;
  let contentHashMatches: boolean | null = null;
  let errorMsg: string | undefined;

  try {
    // 1. Check Target URL reachability (with 4s timeout)
    const targetRes = await fetch(newUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'StockSimulatorBD-Migration-Checker/1.0' },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 0 },
    }).catch(() => null);

    if (targetRes) {
      targetStatus = targetRes.status;
      const html = await targetRes.text();

      // Check canonical in target page
      const canMatch = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i);
      const canonicalHref = canMatch ? canMatch[1].trim() : '';

      // During shadow mode canonical should point to old domain; after switch to new domain
      canonicalMatchesTarget = Boolean(canonicalHref && (canonicalHref === newUrl || canonicalHref === oldUrl));
    }

    // 2. Check Redirect on Old URL (redirect: 'manual' to inspect 301/302 headers with 4s timeout)
    const oldRes = await fetch(oldUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': 'StockSimulatorBD-Migration-Checker/1.0' },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 0 },
    }).catch(() => null);

    if (oldRes) {
      redirectType = oldRes.status;
      const location = oldRes.headers.get('location') || '';
      redirectWorking = (oldRes.status === 301 || oldRes.status === 308) && location === newUrl;
    }
  } catch (err: any) {
    errorMsg = err?.message || 'Verification check failed';
  }

  return {
    id: normalizedPath.replace(/^\//, '').replace(/\//g, '_') || 'root',
    path: normalizedPath,
    oldUrl,
    newUrl,
    targetStatus,
    redirectWorking,
    redirectType,
    canonicalMatchesTarget,
    contentHashMatches,
    lastCheckedAt: new Date().toISOString(),
    error: errorMsg,
  };
}

/**
 * Execute preflight migration audit on key routes (capped to max 10 paths in parallel)
 */
export async function runMigrationPreflightAudit(paths: string[]): Promise<MigrationCheckSummary> {
  const db = getSeoDb();
  const safePaths = paths.slice(0, 10);
  let redirectsWorkingCount = 0;
  let canonicalPassCount = 0;
  let schemaPassCount = 0;
  let httpsPassCount = 0;

  const results = await Promise.all(safePaths.map((p) => testUrlMigration(p)));

  for (const result of results) {
    if (result.redirectWorking) redirectsWorkingCount++;
    if (result.canonicalMatchesTarget) canonicalPassCount++;
    if (result.targetStatus === 200) httpsPassCount++;

    await db.collection('migration_urls').doc(result.id).set(result, { merge: true });
  }

  const summary: MigrationCheckSummary = {
    oldDomain: OLD_DOMAIN,
    newDomain: TARGET_DOMAIN,
    totalUrls: paths.length,
    redirectsWorkingCount,
    canonicalPassCount,
    schemaPassCount,
    httpsPassCount,
    status: redirectsWorkingCount === paths.length ? 'cutover_live' : 'shadow_mode',
    lastRunAt: new Date().toISOString(),
  };

  await db.collection('migration_checks').doc('latest').set(summary);

  return summary;
}
