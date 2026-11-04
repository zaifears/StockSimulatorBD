import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { timingSafeEqual } from 'crypto';
import { BLOG_CONTENT_TYPE } from '@/lib/contentful-blog';
import { submitUrlToIndexNow } from '@/lib/indexNow';
import { absoluteUrl } from '@/lib/siteUrl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CONTENTFUL_REVALIDATE_SECRET;

  if (!expected) {
    return false;
  }

  const provided = req.headers.get('x-contentful-webhook-secret') ?? '';
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function getContentTypeId(body: Record<string, unknown>): string | null {
  const sys = isRecord(body.sys) ? body.sys : null;
  const contentType = sys && isRecord(sys.contentType) ? sys.contentType : null;
  const contentTypeSys =
    contentType && isRecord(contentType.sys) ? contentType.sys : null;
  const id = contentTypeSys?.id;

  return typeof id === 'string' ? id : null;
}

function extractSlug(body: Record<string, unknown>): string | null {
  const fields = isRecord(body.fields) ? body.fields : null;
  const slugField = fields?.slug;

  if (typeof slugField === 'string') {
    return slugField;
  }

  if (isRecord(slugField)) {
    const localizedValue = Object.values(slugField).find(
      (value) => typeof value === 'string'
    );

    return typeof localizedValue === 'string' ? localizedValue : null;
  }

  return null;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const contentTypeId = getContentTypeId(body);

  if (contentTypeId && contentTypeId !== BLOG_CONTENT_TYPE) {
    return NextResponse.json({ revalidated: false, skipped: 'content-type' });
  }

  const slug = extractSlug(body);

  if (!slug || !SLUG_PATTERN.test(slug)) {
    return NextResponse.json(
      { error: 'Missing or invalid slug' },
      { status: 400 }
    );
  }

  revalidatePath(`/blog/${slug}`);
  revalidatePath('/blog');
  // The sitemap and the LLM site guides list blog posts and only rebuild
  // daily on their own (`revalidate = 86400`), so refresh them here too or a
  // newly published post would be missing from them for up to a day.
  revalidatePath('/sitemap.xml');
  revalidatePath('/llms.txt');
  revalidatePath('/llms-full.txt');

  // Best-effort: tell IndexNow-participating engines (Bing, Yandex, Seznam,
  // Naver) the post changed. Never fails the webhook — Contentful only
  // cares that this route returns 200, and a rejected/unreachable IndexNow
  // call shouldn't make Contentful think the revalidate itself failed.
  let indexNow: { ok: boolean; status: number } | null = null;
  try {
    const result = await submitUrlToIndexNow(absoluteUrl(`/blog/${slug}`));
    indexNow = { ok: result.ok, status: result.status };
  } catch {
    indexNow = { ok: false, status: 0 };
  }

  return NextResponse.json({ revalidated: true, slug, indexNow });
}
