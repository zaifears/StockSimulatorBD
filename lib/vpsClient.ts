// lib/vpsClient.ts
// Client-side helper that routes high-frequency public market reads and analytics
// beacons directly to the Oracle Always Free VPS (https://dse.shahoriar.bd),
// with automatic, zero-downtime fallback to Vercel API routes if the VPS is
// unreachable or returns a 5xx error.

export const VPS_BASE_URL = (
  process.env.NEXT_PUBLIC_VPS_API_URL || 'https://dse.shahoriar.bd'
).replace(/\/+$/, '');

export interface VpsFetchOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Fetches from the Oracle VPS first, automatically falling back to the local
 * Next.js API route on network error, timeout, or 5xx status.
 */
export async function fetchVpsWithFallback(
  vpsPath: string,
  vercelFallbackPath: string,
  options: VpsFetchOptions = {}
): Promise<Response> {
  const { timeoutMs = 6000, ...init } = options;
  const vpsUrl = `${VPS_BASE_URL}${vpsPath.startsWith('/') ? vpsPath : `/${vpsPath}`}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(vpsUrl, {
        ...init,
        signal: init.signal || controller.signal,
      });
      if (res.status < 500) {
        return res;
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // VPS unreachable or timed out — fall through to Vercel route
  }

  return fetch(vercelFallbackPath, init);
}

/**
 * Sends a fire-and-forget analytics/telemetry POST to the Oracle VPS first.
 * Uses `text/plain;charset=UTF-8` for cross-origin requests so browsers treat it
 * as a CORS-safelisted simple request (zero OPTIONS preflight overhead and 100%
 * compatibility with `navigator.sendBeacon` during tab close / pagehide).
 * Automatically falls back to the Vercel API route if the VPS request fails.
 */
export function postVpsAnalyticsWithFallback(
  vpsPath: string,
  vercelFallbackPath: string,
  payload: Record<string, any>,
  options: { useBeacon?: boolean; headers?: Record<string, string> } = {}
): void {
  const { useBeacon = false, headers } = options;
  const vpsUrl = `${VPS_BASE_URL}${vpsPath.startsWith('/') ? vpsPath : `/${vpsPath}`}`;

  try {
    const body = JSON.stringify(payload);

    if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      // text/plain is CORS-safelisted: avoids preflight cancellation during pagehide
      const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
      const queued = navigator.sendBeacon(vpsUrl, blob);
      if (queued) return;
    }

    fetch(vpsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
      keepalive: true,
    })
      .then((res) => {
        if (res.status >= 500) {
          throw new Error(`VPS HTTP ${res.status}`);
        }
      })
      .catch(() => {
        // Seamless fallback to Vercel API route
        fetch(vercelFallbackPath, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(headers || {}),
          },
          body,
          keepalive: true,
        }).catch(() => {});
      });
  } catch {
    // Analytics must never surface an error to the user
  }
}
