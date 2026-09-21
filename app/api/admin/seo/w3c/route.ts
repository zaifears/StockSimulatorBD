// app/api/admin/seo/w3c/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { SITE_URL } from '@/lib/siteUrl';
import crypto from 'crypto';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export interface NormalizedW3cMessage {
  code: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  lastLine?: number;
  lastColumn?: number;
  extract?: string;
}

function normalizeW3cCode(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('element') && lower.includes('not allowed')) return 'ELEMENT_NOT_ALLOWED';
  if (lower.includes('duplicate id')) return 'DUPLICATE_ID';
  if (lower.includes('missing') && lower.includes('title')) return 'MISSING_TITLE';
  if (lower.includes('stray start tag') || lower.includes('stray end tag')) return 'STRAY_TAG';
  if (lower.includes('bad value') || lower.includes('invalid attribute')) return 'INVALID_ATTRIBUTE';
  if (lower.includes('unclosed element')) return 'UNCLOSED_ELEMENT';
  return 'HTML_SYNTAX_ISSUE';
}

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
  const cacheRef = db.collection('seo_w3c').doc(urlHash);

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
            valid: cached.valid,
            errorsCount: cached.errorsCount,
            warningsCount: cached.warningsCount,
            messages: cached.messages,
          });
        }
      }
    } catch (e) {
      console.warn('W3C cache read warning:', e);
    }
  }

  // 2. Fetch from W3C Nu Validator
  try {
    const w3cUrl = `https://validator.w3.org/nu/?doc=${encodeURIComponent(targetUrl)}&out=json`;
    const res = await fetch(w3cUrl, {
      headers: {
        'User-Agent': 'StockSimulatorBD-Validator/1.0 (+https://stocksimulator.tech)',
      },
      next: { revalidate: 3600 },
    });

    let valid = true;
    let normalizedMessages: NormalizedW3cMessage[] = [];

    if (res.ok) {
      const json = await res.json();
      const rawMessages: any[] = Array.isArray(json.messages) ? json.messages : [];

      normalizedMessages = rawMessages.slice(0, 25).map((m) => ({
        code: normalizeW3cCode(m.message || ''),
        type: m.type === 'error' ? 'error' : 'warning',
        message: m.message || '',
        lastLine: m.lastLine,
        lastColumn: m.lastColumn,
        extract: m.extract ? m.extract.slice(0, 100) : undefined,
      }));

      valid = !normalizedMessages.some((m) => m.type === 'error');
    }

    const errorsCount = normalizedMessages.filter((m) => m.type === 'error').length;
    const warningsCount = normalizedMessages.filter((m) => m.type === 'warning').length;
    const auditedAt = new Date().toISOString();

    // 3. Persist normalized audit into SEO Firestore
    await cacheRef.set(
      {
        url: targetUrl,
        urlHash,
        valid,
        errorsCount,
        warningsCount,
        messages: normalizedMessages,
        auditedAt,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      url: targetUrl,
      fromCache: false,
      auditedAt,
      valid,
      errorsCount,
      warningsCount,
      messages: normalizedMessages,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
