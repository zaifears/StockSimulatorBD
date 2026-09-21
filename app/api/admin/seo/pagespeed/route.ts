// app/api/admin/seo/pagespeed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { SITE_URL } from '@/lib/siteUrl';
import crypto from 'crypto';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours throttling cache

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url') || SITE_URL;
  let targetUrl = SITE_URL;
  try {
    const parsed = new URL(rawUrl);
    const mainHost = new URL(SITE_URL).hostname;
    if (parsed.hostname === mainHost || parsed.hostname === `www.${mainHost}` || parsed.hostname.endsWith(mainHost)) {
      targetUrl = parsed.toString();
    }
  } catch {
    targetUrl = SITE_URL;
  }
  const forceFresh = searchParams.get('fresh') === 'true';

  const urlHash = crypto.createHash('sha256').update(targetUrl).digest('hex').substring(0, 16);
  const db = getSeoDb();
  const cacheRef = db.collection('seo_pagespeed').doc(urlHash);

  // 1. Throttling & Caching Guard
  if (!forceFresh) {
    try {
      const cachedSnap = await cacheRef.get();
      if (cachedSnap.exists) {
        const cached = cachedSnap.data();
        if (cached && Date.now() - new Date(cached.auditedAt).getTime() < CACHE_TTL_MS) {
          return NextResponse.json({
            success: true,
            url: targetUrl,
            fromCache: true,
            auditedAt: cached.auditedAt,
            scores: cached.scores,
            metrics: cached.metrics,
          });
        }
      }
    } catch (e) {
      console.warn('PageSpeed cache read warning:', e);
    }
  }

  // 2. Call Google PageSpeed Insights API
  try {
    const apiKey = process.env.PAGESPEED_API_KEY ? `&key=${process.env.PAGESPEED_API_KEY}` : '';
    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      targetUrl
    )}&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo${apiKey}`;

    const res = await fetch(psiUrl, {
      headers: { 'User-Agent': 'StockSimulatorBD-Auditor/1.0' },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = `Google PageSpeed API returned HTTP ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        msg = errJson.error?.message || msg;
      } catch {}
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    const json = await res.json();
    const categories = json.lighthouseResult?.categories || {};
    const audits = json.lighthouseResult?.audits || {};

    const scores = {
      performance: categories.performance?.score != null ? Math.round(categories.performance.score * 100) : null,
      accessibility: categories.accessibility?.score != null ? Math.round(categories.accessibility.score * 100) : null,
      bestPractices: categories['best-practices']?.score != null ? Math.round(categories['best-practices'].score * 100) : null,
      seo: categories.seo?.score != null ? Math.round(categories.seo.score * 100) : null,
    };

    const metrics = {
      fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
      lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
      cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
      fid: audits['max-potential-fid']?.displayValue || 'N/A',
    };

    const auditedAt = new Date().toISOString();

    // 3. Save snapshot to isolated SEO Firestore
    await cacheRef.set(
      {
        url: targetUrl,
        urlHash,
        scores,
        metrics,
        auditedAt,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      url: targetUrl,
      fromCache: false,
      auditedAt,
      scores,
      metrics,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
