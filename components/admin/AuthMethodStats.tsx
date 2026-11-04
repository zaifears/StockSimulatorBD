'use client';

// /admin card: which sign-in button people actually use. Rendered only after
// "Turn on Analytics" (one API call, ~30 Firestore reads). Data is kept for
// 30 days. Source: app/api/admin/auth-methods ← app/api/auth/method-event.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LogIn, RefreshCw } from 'lucide-react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import { AUTH_METHODS, AUTH_METHOD_LABELS, type AuthMethod, type AuthMethodCounts } from '@/lib/authMethods';

type Totals = Record<AuthMethod, AuthMethodCounts>;
type Range = 'today' | 'last7' | 'last30';

interface StatsResponse {
  success: boolean;
  today?: Totals;
  last7?: Totals;
  last30?: Totals;
  error?: string;
}

export default function AuthMethodStats({ enabled }: { enabled: boolean }) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<Range>('last7');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithToken('/api/admin/auth-methods');
      setData(await res.json());
    } catch (err: any) {
      setData({ success: false, error: err?.message || 'Failed to load' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const rows = useMemo(() => {
    const totals = data?.[range];
    if (!totals) return [];
    const totalSignIns = AUTH_METHODS.reduce((sum, m) => sum + (totals[m]?.signIns || 0), 0);
    return AUTH_METHODS.map((m) => {
      const c = totals[m] || { clicks: 0, signIns: 0, signUps: 0 };
      return {
        method: m,
        ...c,
        share: totalSignIns ? c.signIns / totalSignIns : 0,
        successRate: c.clicks ? Math.min(1, c.signIns / c.clicks) : null,
      };
    }).sort((a, b) => b.signIns - a.signIns || b.clicks - a.clicks);
  }, [data, range]);

  const totalSignIns = rows.reduce((s, r) => s + r.signIns, 0);
  const totalSignUps = rows.reduce((s, r) => s + r.signUps, 0);
  const top = rows[0] && rows[0].signIns > 0 ? rows[0] : null;

  return (
    <section
      aria-labelledby="auth-method-stats-title"
      className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <LogIn className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="auth-method-stats-title" className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Sign-in buttons
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {top
                ? <>Most used: <strong className="text-gray-700 dark:text-gray-200">{AUTH_METHOD_LABELS[top.method]}</strong> · {totalSignIns.toLocaleString()} sign-ins, {totalSignUps.toLocaleString()} new accounts</>
                : 'Which button people use to sign in and sign up.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Time range" className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-semibold">
            {([['today', 'Today'], ['last7', 'Last 7 days'], ['last30', 'Last 30 days']] as [Range, string][]).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={range === key}
                onClick={() => setRange(key)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  range === key
                    ? 'bg-white dark:bg-[#1A1F26] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Refresh sign-in stats"
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {data && !data.success ? (
        <p className="text-sm text-red-600 dark:text-red-400">Couldn&apos;t load sign-in stats: {data.error}</p>
      ) : !data ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{loading ? 'Loading…' : ' '}</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th scope="col" className="font-semibold px-1 py-2">Button</th>
                <th scope="col" className="font-semibold px-1 py-2 w-[34%]">Sign-ins</th>
                <th scope="col" className="font-semibold px-1 py-2 text-right">New accounts</th>
                <th scope="col" className="font-semibold px-1 py-2 text-right">Clicks</th>
                <th scope="col" className="font-semibold px-1 py-2 text-right" title="Sign-ins ÷ clicks">Success</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((r) => (
                <tr key={r.method}>
                  <th scope="row" className="px-1 py-2.5 font-medium text-gray-900 dark:text-white text-left whitespace-nowrap">
                    {AUTH_METHOD_LABELS[r.method]}
                  </th>
                  <td className="px-1 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden" aria-hidden="true">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round(r.share * 100)}%` }} />
                      </div>
                      <span className="tabular-nums text-gray-900 dark:text-white font-semibold w-10 text-right">{r.signIns.toLocaleString()}</span>
                      <span className="tabular-nums text-gray-500 dark:text-gray-400 text-xs w-9 text-right">{Math.round(r.share * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-1 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{r.signUps.toLocaleString()}</td>
                  <td className="px-1 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{r.clicks.toLocaleString()}</td>
                  <td className="px-1 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                    {r.successRate === null ? '—' : `${Math.round(r.successRate * 100)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
            Sign-ins are verified against the real Firebase sign-in, counted once each. Clicks count attempts (rate-limited per IP), so a low success rate means people try a button and give up — e.g. Facebook while Meta&apos;s review is pending. Days use Dhaka time; data older than 30 days is deleted automatically.
          </p>
        </div>
      )}
    </section>
  );
}
