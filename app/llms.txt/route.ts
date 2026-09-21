// app/llms.txt/route.ts
import { NextResponse } from 'next/server';
import { generateLlmsTxt } from '@/lib/seo/llms';

export const revalidate = 3600; // 1 hour cache

export async function GET() {
  const content = await generateLlmsTxt();

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
