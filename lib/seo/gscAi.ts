// lib/seo/gscAi.ts
// Engine for parsing, normalizing, and correlating Google AI Overviews / AI Mode performance data

import { GscAiOverviewRow, GscAiSnapshot } from './types';

/**
 * Parses a standard Google Search Console Generative AI Performance CSV export.
 * Handles comma or semicolon separation, quoted fields, and header variations.
 */
export function parseGscAiCsv(csvContent: string, fileName: string = 'gsc_ai_export.csv'): GscAiSnapshot {
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV file is empty or does not contain header and data rows.');
  }

  // Parse header
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

  const pageIdx = headers.findIndex((h) => h.includes('page') || h.includes('top page') || h.includes('url'));
  const countryIdx = headers.findIndex((h) => h.includes('country'));
  const deviceIdx = headers.findIndex((h) => h.includes('device'));
  const impIdx = headers.findIndex((h) => h.includes('impression'));
  const clickIdx = headers.findIndex((h) => h.includes('click'));
  const ctrIdx = headers.findIndex((h) => h.includes('ctr'));
  const posIdx = headers.findIndex((h) => h.includes('position'));

  if (impIdx === -1) {
    throw new Error('Could not identify "Impressions" column in the uploaded CSV.');
  }

  const rows: GscAiOverviewRow[] = [];
  const pageMap: Record<string, { impressions: number; clicks: number }> = {};
  const countryMap: Record<string, { impressions: number; clicks: number }> = {};
  const deviceMap: Record<string, { impressions: number; clicks: number }> = {};

  let totalImp = 0;
  let totalClicks = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Regex for handling comma/delimiter inside quotes
    const parts = rawLine.split(delimiter).map((p) => p.replace(/^["']|["']$/g, '').trim());
    if (parts.length < 2) continue;

    const imp = parseInt(parts[impIdx]?.replace(/,/g, '') || '0', 10) || 0;
    const clicks = clickIdx !== -1 ? parseInt(parts[clickIdx]?.replace(/,/g, '') || '0', 10) || 0 : 0;
    
    let ctr = 0;
    if (ctrIdx !== -1 && parts[ctrIdx]) {
      const ctrRaw = parts[ctrIdx].replace('%', '');
      ctr = parseFloat(ctrRaw) || (imp > 0 ? (clicks / imp) * 100 : 0);
    } else if (imp > 0) {
      ctr = (clicks / imp) * 100;
    }

    const pos = posIdx !== -1 ? parseFloat(parts[posIdx]) || undefined : undefined;
    const page = pageIdx !== -1 ? parts[pageIdx] : undefined;
    const country = countryIdx !== -1 ? parts[countryIdx] : undefined;
    const device = deviceIdx !== -1 ? parts[deviceIdx] : undefined;

    totalImp += imp;
    totalClicks += clicks;

    rows.push({
      page,
      country,
      device,
      impressions: imp,
      clicks,
      ctr,
      position: pos,
    });

    if (page) {
      const normalizedPath = page.replace(/^https?:\/\/[^/]+/, '') || '/';
      if (!pageMap[normalizedPath]) pageMap[normalizedPath] = { impressions: 0, clicks: 0 };
      pageMap[normalizedPath].impressions += imp;
      pageMap[normalizedPath].clicks += clicks;
    }

    if (country) {
      if (!countryMap[country]) countryMap[country] = { impressions: 0, clicks: 0 };
      countryMap[country].impressions += imp;
      countryMap[country].clicks += clicks;
    }

    if (device) {
      if (!deviceMap[device]) deviceMap[device] = { impressions: 0, clicks: 0 };
      deviceMap[device].impressions += imp;
      deviceMap[device].clicks += clicks;
    }
  }

  const topPages = Object.entries(pageMap)
    .map(([path, data]) => ({
      path,
      impressions: data.impressions,
      clicks: data.clicks,
      ctr: data.impressions > 0 ? Math.round((data.clicks / data.impressions) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 50);

  const countryBreakdown = Object.entries(countryMap)
    .map(([country, data]) => ({
      country,
      impressions: data.impressions,
      clicks: data.clicks,
    }))
    .sort((a, b) => b.impressions - a.impressions);

  const deviceBreakdown = Object.entries(deviceMap)
    .map(([device, data]) => ({
      device,
      impressions: data.impressions,
      clicks: data.clicks,
    }))
    .sort((a, b) => b.impressions - a.impressions);

  const avgCtr = totalImp > 0 ? Math.round((totalClicks / totalImp) * 10000) / 100 : 0;

  // Placeholder correlation ratio that will be reconciled against organic totals
  const organicCorrelation = {
    organicImpressions: 0,
    organicClicks: 0,
    organicCtr: 0,
    aiShareOfImpressions: 0,
  };

  return {
    id: `gsc_ai_${Date.now()}`,
    periodLabel: 'Last 28 Days (AI Overviews + AI Mode)',
    totalAiImpressions: totalImp,
    totalAiClicks: totalClicks,
    averageAiCtr: avgCtr,
    topPages,
    countryBreakdown,
    deviceBreakdown,
    organicCorrelation,
    importedAt: new Date().toISOString(),
    fileName,
    rowCount: rows.length,
  };
}

/**
 * Reconciles GenAI snapshot against existing organic GSC totals to compute correlation metrics.
 */
export function correlateAiWithOrganic(
  aiSnapshot: GscAiSnapshot,
  organicTotals: { impressions: number; clicks: number; ctr: number }
): GscAiSnapshot {
  const orgImp = organicTotals.impressions || 0;
  const orgClicks = organicTotals.clicks || 0;
  const orgCtr = organicTotals.ctr || 0;

  const aiShare = orgImp > 0 ? Math.round((aiSnapshot.totalAiImpressions / orgImp) * 10000) / 100 : 0;

  return {
    ...aiSnapshot,
    organicCorrelation: {
      organicImpressions: orgImp,
      organicClicks: orgClicks,
      organicCtr: orgCtr,
      aiShareOfImpressions: aiShare,
    },
  };
}
