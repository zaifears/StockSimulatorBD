'use client'

import { useEffect } from 'react'

// Real-user Core Web Vitals, sampled. Each sampled session sends ONE small
// beacon (when the tab is hidden) to /api/analytics/vitals, which only writes a
// log line. Nothing is stored in Firestore. The attribution build says WHICH
// element / interaction was slow, which is what we need to find the INP cause.
const SAMPLE_RATE = 0.1
const SAMPLE_KEY = 'sb_vitals_sample' // sessionStorage: '1' sampled in, '0' out
const VITALS_URL = '/api/analytics/vitals'

function sampledIn(): boolean {
  try {
    const stored = sessionStorage.getItem(SAMPLE_KEY)
    if (stored !== null) return stored === '1'
    const pick = Math.random() < SAMPLE_RATE
    sessionStorage.setItem(SAMPLE_KEY, pick ? '1' : '0')
    return pick
  } catch {
    return false
  }
}

const round = (n: number | undefined, digits = 0) =>
  typeof n === 'number' && Number.isFinite(n) ? Number(n.toFixed(digits)) : undefined

export default function WebVitalsReporter() {
  useEffect(() => {
    if (!sampledIn()) return
    let cancelled = false
    let cleanup: (() => void) | undefined

    import('web-vitals/attribution').then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
      if (cancelled) return
      const pending = new Map<string, Record<string, unknown>>()

      const flush = () => {
        if (pending.size === 0) return
        const body = JSON.stringify({
          path: location.pathname,
          device: matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
          conn: (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType,
          metrics: Array.from(pending.values()),
        })
        pending.clear()
        const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' })
        if (!navigator.sendBeacon?.(VITALS_URL, blob)) {
          fetch(VITALS_URL, { method: 'POST', body, keepalive: true }).catch(() => {})
        }
      }

      const record = (name: string, value: number, rating: string, extra: Record<string, unknown>) => {
        pending.set(name, { name, value: round(value, name === 'CLS' ? 3 : 0), rating, ...extra })
      }

      onTTFB((m) => record('TTFB', m.value, m.rating, {}))
      onFCP((m) => record('FCP', m.value, m.rating, {}))
      onLCP((m) => {
        const a = m.attribution
        record('LCP', m.value, m.rating, {
          target: a.target,
          url: a.url,
          ttfb: round(a.timeToFirstByte),
          loadDelay: round(a.resourceLoadDelay),
          loadDuration: round(a.resourceLoadDuration),
          renderDelay: round(a.elementRenderDelay),
        })
      })
      onINP((m) => {
        const a = m.attribution
        record('INP', m.value, m.rating, {
          target: a.interactionTarget,
          type: a.interactionType,
          inputDelay: round(a.inputDelay),
          processing: round(a.processingDuration),
          presentation: round(a.presentationDelay),
          loadState: a.loadState,
          scriptMs: round(a.totalScriptDuration),
          styleLayoutMs: round(a.totalStyleAndLayoutDuration),
          longestScript: a.longestScript?.entry?.sourceURL,
        })
      })
      onCLS((m) => {
        const a = m.attribution
        record('CLS', m.value, m.rating, {
          target: a.largestShiftTarget,
          shift: round(a.largestShiftValue, 3),
          loadState: a.loadState,
        })
      })

      // Registered after the on* calls, so web-vitals has already recorded its
      // final values for this hide by the time we flush.
      const onHide = () => {
        if (document.visibilityState === 'hidden') flush()
      }
      document.addEventListener('visibilitychange', onHide)
      cleanup = () => document.removeEventListener('visibilitychange', onHide)
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return null
}
