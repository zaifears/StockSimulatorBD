'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { postVpsAnalyticsWithFallback } from '@/lib/vpsClient'

const TRACK_URL = '/api/analytics/track'
const SESSION_KEY = 'sb_analytics_sid' // sessionStorage — resets per tab/browser-restart
const GUEST_KEY = 'sb_analytics_gid'   // localStorage — persists across sessions on this browser
const HEARTBEAT_INTERVAL_MS = 60000

function readGeoCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(/(?:^|;\s*)sb_geo=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

function getOrCreateSessionId(): { id: string; isNew: boolean } {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return { id: existing, isNew: false }
    const id = generateId()
    sessionStorage.setItem(SESSION_KEY, id)
    return { id, isNew: true }
  } catch {
    // sessionStorage unavailable (rare privacy-mode edge case) — track in-memory only for this page.
    return { id: generateId(), isNew: true }
  }
}

function getOrCreateGuestId(): string {
  try {
    const existing = localStorage.getItem(GUEST_KEY)
    if (existing) return existing
    const id = generateId()
    localStorage.setItem(GUEST_KEY, id)
    return id
  } catch {
    return generateId()
  }
}

function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent.toLowerCase()
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android/i.test(ua)) return 'mobile'
  return 'desktop'
}

function postAnalytics(payload: Record<string, any>, useBeacon = false) {
  postVpsAnalyticsWithFallback(TRACK_URL, TRACK_URL, payload, { useBeacon })
}

/**
 * Site-wide visit/engagement tracker. Mounted once near the root layout.
 * Renders nothing. See app/api/analytics/track/route.ts for the server side.
 *
 * Tracks, per browser session: entry page, page-navigation count, device
 * type, and "active seconds" (time the tab was actually visible/foregrounded
 * — not just open in a background tab), plus links the session to a
 * registered account when the visitor is logged in.
 */
export default function VisitTracker() {
  const { user, loading: authLoading } = useAuth()
  const pathname = usePathname()

  const sessionIdRef = useRef<string | null>(null)
  const startedRef = useRef(false)
  const pageCountRef = useRef(1)
  const lastPathRef = useRef<string>('/')
  const idTokenRef = useRef<string | undefined>(undefined)
  const activeAccumulatorRef = useRef(0)
  const visibleSinceRef = useRef<number | null>(null)
  const userRef = useRef(user)

  // Keep both a live ref (for the beacon effect's closures, which only set up once)
  // and a best-effort, synchronously-readable ID token (for the pagehide beacon,
  // which can't safely await async work) in sync with the current auth state.
  useEffect(() => {
    userRef.current = user
    let cancelled = false
    if (user) {
      user.getIdToken().then((t) => {
        if (!cancelled) idTokenRef.current = t
      }).catch(() => {})
    } else {
      idTokenRef.current = undefined
    }
    return () => {
      cancelled = true
    }
  }, [user])

  // Track page navigations (App Router doesn't unmount this component on route change).
  useEffect(() => {
    if (!pathname) return
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname
      if (startedRef.current) pageCountRef.current += 1
    } else if (!startedRef.current) {
      lastPathRef.current = pathname
    }
  }, [pathname])

  useEffect(() => {
    // Wait for auth state to resolve so the very first beacon can correctly
    // attribute the session to a logged-in user instead of starting anonymous.
    if (authLoading || startedRef.current) return
    if (typeof window === 'undefined') return

    startedRef.current = true

    const { id: sessionId, isNew } = getOrCreateSessionId()
    const guestId = getOrCreateGuestId()
    sessionIdRef.current = sessionId
    const deviceType = detectDeviceType()
    const entryPath = lastPathRef.current || window.location.pathname

    visibleSinceRef.current = document.visibilityState === 'visible' ? Date.now() : null

    const sendStart = async () => {
      let idToken: string | undefined
      const currentUser = userRef.current
      if (currentUser) {
        idToken = await currentUser.getIdToken().catch(() => undefined)
        idTokenRef.current = idToken
      }
      postAnalytics({
        action: 'start',
        sessionId,
        guestId,
        entryPath,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        deviceType,
        geoBucket: readGeoCookie(),
        idToken,
      })
    }

    if (isNew) {
      sendStart()
    }

    // Roll any time spent visible-but-unflushed into the accumulator and reset the clock.
    const collectDelta = (): number => {
      let delta = activeAccumulatorRef.current
      activeAccumulatorRef.current = 0
      if (visibleSinceRef.current !== null) {
        const now = Date.now()
        delta += (now - visibleSinceRef.current) / 1000
        visibleSinceRef.current = now
      }
      return Math.round(delta)
    }

    const sendHeartbeat = async (action: 'heartbeat' | 'end', useBeacon = false) => {
      const delta = collectDelta()
      if (delta <= 0 && action === 'heartbeat') return // nothing to report, skip the round trip

      const currentUser = userRef.current
      if (currentUser && !useBeacon) {
        idTokenRef.current = await currentUser.getIdToken().catch(() => idTokenRef.current)
      }

      postAnalytics(
        {
          action,
          sessionId,
          path: lastPathRef.current,
          pageCount: pageCountRef.current,
          deltaActiveSeconds: delta,
          idToken: idTokenRef.current,
        },
        useBeacon
      )
    }

    const heartbeatTimer = setInterval(() => {
      sendHeartbeat('heartbeat', false)
    }, HEARTBEAT_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Flush + pause the active-time clock immediately; resume on return.
        sendHeartbeat('heartbeat', true)
        visibleSinceRef.current = null
      } else {
        visibleSinceRef.current = Date.now()
      }
    }

    const handlePageHide = () => {
      sendHeartbeat('end', true)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      clearInterval(heartbeatTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
    }
    // Intentionally run once auth resolves — `user` is read fresh via refs/closures where it matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  return null
}
