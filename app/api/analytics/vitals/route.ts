// app/api/analytics/vitals/route.ts
// Receives sampled real-user Core Web Vitals from components/WebVitalsReporter.tsx.
// Deliberately cheap: no Firestore, no auth. It only validates, clamps and writes ONE
// log line per beacon ("[web-vitals] {...}"). Read them with e.g.
//   journalctl -u stocksimulator-web | grep web-vitals

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 4096
const ALLOWED_METRICS = new Set(['TTFB', 'FCP', 'LCP', 'INP', 'CLS'])

// Per-IP cap so a script cannot flood the logs. In-memory is enough: the client sends one
// beacon per sampled session.
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 30
const hits = new Map<string, { count: number; resetAt: number }>()

function allowed(ip: string): boolean {
  const now = Date.now()
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
  }
  const entry = hits.get(ip)
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  entry.count += 1
  return entry.count <= MAX_PER_WINDOW
}

function str(v: unknown, max: number): string | undefined {
  return typeof v === 'string' && v ? v.slice(0, max) : undefined
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!allowed(ip)) return new NextResponse(null, { status: 204 })

  let data: any
  try {
    const raw = await req.text()
    if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 })
    data = JSON.parse(raw)
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }

  const metrics = Array.isArray(data?.metrics) ? data.metrics.slice(0, 5) : []
  const clean = metrics
    .filter((m: any) => ALLOWED_METRICS.has(m?.name))
    .map((m: any) => {
      const out: Record<string, unknown> = { name: m.name, value: num(m.value), rating: str(m.rating, 20) }
      for (const key of ['target', 'url', 'longestScript', 'type', 'loadState']) {
        const s = str(m[key], 200)
        if (s) out[key] = s
      }
      for (const key of ['ttfb', 'loadDelay', 'loadDuration', 'renderDelay', 'inputDelay', 'processing', 'presentation', 'scriptMs', 'styleLayoutMs', 'shift']) {
        const n = num(m[key])
        if (n !== undefined) out[key] = n
      }
      return out
    })

  if (clean.length > 0) {
    console.log(
      '[web-vitals]',
      JSON.stringify({
        path: str(data?.path, 200),
        device: data?.device === 'mobile' ? 'mobile' : 'desktop',
        conn: str(data?.conn, 10),
        metrics: clean,
      })
    )
  }
  return new NextResponse(null, { status: 204 })
}
