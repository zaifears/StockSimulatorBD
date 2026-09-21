// app/api/admin/seo/crawl/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { crawlBatchUrls } from '@/lib/seo/crawler';
import { recalculateInternalAuthority } from '@/lib/seo/authority';
import { generateSeoOpportunities } from '@/lib/seo/opportunities';
import { getAllDseStocks } from '@/lib/dseStocks';
import { getBlogPosts } from '@/lib/contentful-blog';
import { absoluteUrl } from '@/lib/siteUrl';
import { SeoPageProfile, CrawlJobState } from '@/lib/seo/types';

const ACTIVE_JOB_ID = 'active_crawl_job';
const DEFAULT_BATCH_SIZE = 20;

async function getAllSiteUrls(): Promise<string[]> {
  const [stocks, blogPosts] = await Promise.all([
    getAllDseStocks().catch(() => []),
    getBlogPosts().catch(() => []),
  ]);

  const staticRoutes = ['/', '/stocks', '/blog', '/about-us', '/boss', '/policy'].map((p) => absoluteUrl(p));
  const blogRoutes = blogPosts.map((b) => absoluteUrl(`/blog/${b.slug}`));
  const stockRoutes = stocks.map((s) => absoluteUrl(`/stocks/${encodeURIComponent(s.symbol.toLowerCase())}`));

  return Array.from(new Set([...staticRoutes, ...blogRoutes, ...stockRoutes]));
}

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const db = getSeoDb();
    const [pagesSnap, jobSnap] = await Promise.all([
      db.collection('seo_pages').get(),
      db.collection('seo_jobs').doc(ACTIVE_JOB_ID).get(),
    ]);

    const pages = pagesSnap.docs.map((d) => d.data() as SeoPageProfile);
    const activeJob = (jobSnap.data() as CrawlJobState) || null;

    return NextResponse.json({
      success: true,
      count: pages.length,
      pages,
      activeJob,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'next_batch'; // 'next_batch' | 'start_fresh' | 'cancel'
    const batchSize = Math.min(Math.max(body.batchSize || DEFAULT_BATCH_SIZE, 5), 30);
    const db = getSeoDb();
    const jobRef = db.collection('seo_jobs').doc(ACTIVE_JOB_ID);

    if (action === 'cancel') {
      await jobRef.update({ status: 'failed', error: 'Cancelled by admin' });
      return NextResponse.json({ success: true, message: 'Job cancelled' });
    }

    const allUrls = await getAllSiteUrls();
    const totalUrls = allUrls.length;

    let jobSnap = await jobRef.get();
    let jobData: CrawlJobState;

    if (!jobSnap.exists || action === 'start_fresh' || jobSnap.data()?.status === 'completed') {
      // Start a brand-new persistent crawl job
      jobData = {
        id: ACTIVE_JOB_ID,
        status: 'running',
        totalUrls,
        processedCount: 0,
        cursorIndex: 0,
        batchSize,
        startedAt: new Date().toISOString(),
        lastBatchAt: new Date().toISOString(),
      };
      await jobRef.set(jobData);
    } else {
      jobData = jobSnap.data() as CrawlJobState;
    }

    // Determine current slice from cursor
    const cursor = jobData.cursorIndex || 0;
    const batchUrls = allUrls.slice(cursor, cursor + batchSize);

    if (batchUrls.length === 0 || cursor >= totalUrls) {
      // Crawl job is finished
      await jobRef.update({
        status: 'completed',
        finishedAt: new Date().toISOString(),
        lastBatchAt: new Date().toISOString(),
      });

      // Recalculate authority and generate opportunities once complete
      const authoritySummary = await recalculateInternalAuthority();
      await generateSeoOpportunities();

      return NextResponse.json({
        success: true,
        completed: true,
        totalUrls,
        processedCount: jobData.processedCount,
        authoritySummary,
        message: 'All pages crawled and internal authority recalculated!',
      });
    }

    // Execute single batch crawl
    const crawlResult = await crawlBatchUrls(batchUrls);

    const nextCursor = cursor + batchUrls.length;
    const isNowCompleted = nextCursor >= totalUrls;
    const updatedProcessed = (jobData.processedCount || 0) + crawlResult.crawled;

    await jobRef.update({
      status: isNowCompleted ? 'completed' : 'running',
      cursorIndex: nextCursor,
      processedCount: updatedProcessed,
      lastBatchAt: new Date().toISOString(),
      ...(isNowCompleted ? { finishedAt: new Date().toISOString() } : {}),
    });

    if (isNowCompleted) {
      await recalculateInternalAuthority();
      await generateSeoOpportunities();
    }

    return NextResponse.json({
      success: true,
      completed: isNowCompleted,
      cursor: nextCursor,
      totalUrls,
      batchCrawled: crawlResult.crawled,
      batchFailed: crawlResult.failed,
      processedCount: updatedProcessed,
      percent: Math.min(100, Math.round((nextCursor / totalUrls) * 100)),
      sample: crawlResult.profiles.slice(0, 3).map((p) => p.path),
    });
  } catch (error: any) {
    console.error('Crawl Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
