// lib/seo/changeImpact.ts
// True SEO Change-Impact Engine (Before 28d vs After 7d/14d/28d Correlation)
// Strictly follows observational empirical standards: "Observed after change", not "Caused by".

import { SeoChangeImpact, MetricComparisonWindow } from './types';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { normalizeSeoPath } from './metadataResolver';

/**
 * Creates or updates an impact evaluation for a deployed change with real baseline data.
 * Does NOT generate synthetic/fake future metrics — evaluation windows populate
 * only as real Search Console data is observed after 7/14/28 days.
 */
export async function recordChangeImpact(
  changeId: string,
  rawPath: string,
  changeDescription: string,
  beforeMetrics?: Partial<MetricComparisonWindow>
): Promise<SeoChangeImpact> {
  const db = getSeoDb();
  const { path } = normalizeSeoPath(rawPath);

  const baselineBefore: MetricComparisonWindow = {
    impressions: beforeMetrics?.impressions ?? 0,
    clicks: beforeMetrics?.clicks ?? 0,
    ctr: beforeMetrics?.ctr ?? 0,
    position: beforeMetrics?.position ?? 0,
    queryCount: beforeMetrics?.queryCount ?? 0,
    indexed: beforeMetrics?.indexed ?? true,
    aiCited: beforeMetrics?.aiCited ?? false,
  };

  const impactRecord: SeoChangeImpact = {
    id: changeId,
    path,
    changeDate: new Date().toISOString().split('T')[0],
    changeDescription,
    before28d: baselineBefore,
    observationalSummary: `Safe override applied on ${new Date().toISOString().split('T')[0]}. Status: Monitoring Search Console for empirical observations over 7d/14d/28d windows.`,
    status: 'monitoring',
    lastEvaluatedAt: new Date().toISOString(),
  };

  await db.collection('seo_change_impacts').doc(changeId).set(impactRecord);
  return impactRecord;
}

/**
 * Retrieves all real change impact records from Firestore.
 */
export async function getChangeImpacts(): Promise<SeoChangeImpact[]> {
  try {
    const db = getSeoDb();
    const snap = await db.collection('seo_change_impacts').orderBy('lastEvaluatedAt', 'desc').limit(50).get();

    if (snap.empty) {
      return [];
    }

    return snap.docs.map((d) => d.data() as SeoChangeImpact);
  } catch (err) {
    console.warn('[ChangeImpact] Error loading impacts:', err);
    return [];
  }
}
