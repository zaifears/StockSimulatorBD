'use client';

import { useMemo, useState, type ReactNode, type MouseEvent, type TouchEvent } from 'react';
import Link from 'next/link';
import { Users, Clock, UserPlus, Coins, TrendingUp, TrendingDown, Compass, Activity, ArrowRight, MapPin, Radio, ShieldAlert, ShieldCheck, Wallet, Repeat, Newspaper, LineChart, Loader2, RefreshCw, CheckCircle2, Sparkles, FileText, Code2, Download } from 'lucide-react';
import { BD_GEO_BUCKETS, type GeoBucketKey } from '@/lib/utils/geoBucket';
import { fetchWithFreshToken } from '@/lib/utils/fetchWithToken';
import AnalyticsExportModal from './AnalyticsExportModal';
import {
  generateAdminAnalyticsMarkdown,
  generateAdminAnalyticsJson,
  downloadAnalyticsFile,
} from '@/lib/utils/adminAnalyticsExporter';

// ── Types ──────────────────────────────────────────────────────────────

interface DailyTrendPoint {
  dateKey: string;
  sessions: number;
  avgSeconds: number;
}

interface UserRow {
  uid: string;
  name: string;
  email: string | null;
  visitCount: number;
  totalActiveSeconds: number;
  lastVisitAt: string | null;
  createdAt?: string | null;
}

interface CoinRow {
  uid: string;
  name: string;
  email: string | null;
  coins: number;
}

interface StockRow {
  symbol: string;
  count: number;
}

interface PageRow {
  path: string;
  views: number;
}

interface TradingActivity {
  trades: { today: number; last7Days: number; last30Days: number };
  activeTraders: { today: number; last7Days: number; last30Days: number };
  buyVsSell: { buys: number; sells: number };
  mostTradedStocks: StockRow[];
  truncated: boolean;
}

interface RetentionBucket {
  eligible: number;
  retained: number;
  rate: number;
}

interface RevenueData {
  approvedAllTime: { bdt: number; coins: number; count: number };
  approvedLast30Days: { bdt: number; count: number };
  avgApprovedRechargeBdt: number;
  pending: { count: number; bdt: number };
  rejectedLast30Days: number;
  rechargerCount: number;
  conversionRatePercent: number;
  truncated: boolean;
}

interface BalanceIntegrityData {
  threshold: number;
  flaggedCount: number;
  watchlist: CoinRow[];
}

export interface SiteAnalyticsData {
  activeRightNow: number;
  visitors: { today: number; last7Days: number; last30Days: number };
  disclaimerAgreements: { today: number; last7Days: number; last30Days: number };
  avgSessionSeconds: { today: number; last7Days: number };
  registrations: {
    today: number;
    last7Days: number;
    last30Days: number;
    totalAllTime: number;
    totalUserDocs: number;
    source: 'firebase-auth' | 'firestore-user-docs';
    sourceWarning: string | null;
  };
  deviceBreakdown: { mobile: number; tablet: number; desktop: number; unknown: number };
  geoBreakdown: Record<GeoBucketKey, number>;
  dailyTrend: DailyTrendPoint[];
  trafficSources: Record<'direct' | 'internal' | 'search_google' | 'search_other' | 'social' | 'other', number>;
  newVsReturning: { new: number; returning: number };
  bounceRate: number;
  retention: { d1: RetentionBucket; d7: RetentionBucket; d30: RetentionBucket; sampledUsers: number; truncated: boolean };
  peakHours: { hour: number; sessions: number }[];
  topLandingPages: PageRow[];
  topBlogPosts: PageRow[];
  topStockPages: PageRow[];
  topCoinHolders: CoinRow[];
  totalCoinsInCirculation: number | null;
  balanceIntegrity: BalanceIntegrityData;
  accountIntegrity:
    | {
        authAccountCount: number;
        userDocCount: number;
        orphanedDocCount: number;
        orphanedDocUids: string[];
        missingDocCount: number;
        missingDocs: { uid: string; email: string | null; providers: string[]; createdAt: string }[];
        duplicateEmailCount: number;
        duplicateEmails: {
          email: string;
          count: number;
          accounts: { uid: string; providers: string[]; createdAt: string }[];
        }[];
        truncated: boolean;
      }
    | { error: string }
    | null;
  sessionRetention?: {
    totalCount: number;
    anonymousCount: number;
    userCount: number;
    prunableCandidatesCount: number;
  } | null;
  revenue: RevenueData;
  growthFunnel: { stage: string; value: number }[];
  mostActiveUsers: UserRow[];
  leastActiveUsers: UserRow[];
  trading: TradingActivity | null;
  tradingError?: string | null;
  methodologyNote?: string;
}

// ── Formatting helpers ────────────────────────────────────────────────

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
}

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function formatBdt(n: number): string {
  return `৳${formatCompact(n)}`;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Never visited';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'Never visited';
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDateShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// ── Stat tile ──────────────────────────────────────────────────────────

const ACCENT_CLASSES = {
  blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  green: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400',
  amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
} as const;

function StatTile({
  label,
  value,
  sublabel,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent: keyof typeof ACCENT_CLASSES;
  icon: ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 pr-1">
          <p className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 truncate">{label}</p>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</div>
          {sublabel && <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">{sublabel}</p>}
        </div>
        <div className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full flex items-center justify-center ${ACCENT_CLASSES[accent]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Icons — lucide-react, matching the icon set the homepage/coins page use ─

const Icon = {
  Users: () => <Users className="w-4 h-4" />,
  Clock: () => <Clock className="w-4 h-4" />,
  UserPlus: () => <UserPlus className="w-4 h-4" />,
  Coin: () => <Coins className="w-4 h-4" />,
  TrendUp: () => <TrendingUp className="w-4 h-4" />,
  TrendDown: () => <TrendingDown className="w-4 h-4" />,
  Compass: () => <Compass className="w-4 h-4" />,
  Activity: () => <Activity className="w-4 h-4" />,
};

// ── 30-day visits trend — hand-built SVG line + area, no chart library ──

function TrendChart({ data }: { data: DailyTrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { points, maxY, gridValues, width, height, padding } = useMemo(() => {
    const width = 720;
    const height = 200;
    const padding = { top: 16, right: 12, bottom: 26, left: 34 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const rawMax = Math.max(...data.map((d) => d.sessions), 1);
    // Round the axis ceiling up to a "clean" step so gridline labels are tidy.
    const magnitude = Math.pow(10, Math.max(0, Math.floor(Math.log10(rawMax))));
    const niceMax = Math.ceil(rawMax / (magnitude / 2 || 1)) * (magnitude / 2 || 1) || rawMax;
    const maxY = Math.max(niceMax, 4);

    const n = Math.max(data.length - 1, 1);
    const points = data.map((d, i) => ({
      ...d,
      x: padding.left + (i / n) * plotW,
      y: padding.top + plotH - (d.sessions / maxY) * plotH,
    }));

    const gridValues = [0, 0.5, 1].map((f) => Math.round(maxY * f));

    return { points, maxY, gridValues, width, height, padding };
  }, [data]);

  if (data.length === 0 || points.every((p) => p.sessions === 0)) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-gray-400 dark:text-gray-500">
        No visits recorded yet
      </div>
    );
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)},${height - padding.bottom} L ${points[0].x.toFixed(1)},${height - padding.bottom} Z`;
  const bottomY = height - padding.bottom;
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  const handleMove = (e: MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const n = points.length;
    const plotW = width - padding.left - padding.right;
    let idx = Math.round(((relX - padding.left) / plotW) * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    setHoverIndex(idx);
  };

  const handleTouch = (e: TouchEvent<SVGRectElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((touch.clientX - rect.left) / rect.width) * width;
    const n = points.length;
    const plotW = width - padding.left - padding.right;
    let idx = Math.round(((relX - padding.left) / plotW) * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    setHoverIndex(idx);
  };

  // Keep the in-SVG tooltip from running off the right edge.
  const tooltipW = 118;
  const tooltipFlip = hovered ? hovered.x + 10 + tooltipW > width : false;
  const tooltipX = hovered ? (tooltipFlip ? hovered.x - 10 - tooltipW : hovered.x + 10) : 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-[200px]"
      role="img"
      aria-label="Visits over the last 30 days"
    >
      {/* Gridlines */}
      {gridValues.map((v, i) => {
        const y = padding.top + (height - padding.top - padding.bottom) * (1 - v / maxY);
        return (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeWidth={1}
              className="text-gray-200 dark:text-gray-800"
            />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" className="fill-gray-400 dark:fill-gray-500" fontSize="9">
              {formatCompact(v)}
            </text>
          </g>
        );
      })}

      {/* Area wash + line */}
      <path d={areaPath} className="fill-blue-500/10" />
      <path d={linePath} fill="none" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Endpoint marker + value label (today) */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-[#111]" strokeWidth={2} />
      <text
        x={points[points.length - 1].x}
        y={Math.max(points[points.length - 1].y - 10, 10)}
        textAnchor="end"
        className="fill-gray-700 dark:fill-gray-200 font-semibold"
        fontSize="11"
      >
        {points[points.length - 1].sessions}
      </text>

      {/* X-axis: sparse date labels */}
      {points
        .filter((_, i) => i % Math.ceil(points.length / 6) === 0 || i === points.length - 1)
        .map((p, i) => (
          <text key={i} x={p.x} y={height - 8} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" fontSize="9">
            {formatDateShort(p.dateKey)}
          </text>
        ))}

      {/* Hover layer */}
      {hovered && (
        <g>
          <line x1={hovered.x} x2={hovered.x} y1={padding.top} y2={bottomY} stroke="currentColor" strokeWidth={1} className="text-gray-300 dark:text-gray-700" />
          <circle cx={hovered.x} cy={hovered.y} r={5} className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-[#111]" strokeWidth={2} />
          <g transform={`translate(${tooltipX}, ${Math.max(hovered.y - 40, padding.top)})`}>
            <rect width={tooltipW} height={40} rx={8} className="fill-gray-900 dark:fill-black" opacity={0.95} />
            <text x={10} y={16} className="fill-white" fontSize="10" fontWeight={600}>
              {formatDateShort(hovered.dateKey)}
            </text>
            <text x={10} y={30} className="fill-gray-300" fontSize="9">
              {hovered.sessions} visits · {formatDuration(hovered.avgSeconds)} avg
            </text>
          </g>
        </g>
      )}

      {/* Transparent hit-area for mouse and touch tracking */}
      <rect
        x={padding.left}
        y={padding.top}
        width={width - padding.left - padding.right}
        height={height - padding.top - padding.bottom}
        fill="transparent"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        onTouchMove={handleTouch}
        onTouchEnd={() => setHoverIndex(null)}
      />
    </svg>
  );
}

// ── Device breakdown — compact stacked bar (part-to-whole, 3 categories) ─

interface Segment {
  key: string;
  label: string;
  value: number;
  className: string;
}

// Generic part-to-whole bar — a legend is always shown (per the dataviz
// guide, identity is never color-alone), segments separated by a surface gap.
function SegmentBar({ segments, emptyText }: { segments: Segment[]; emptyText: string }) {
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">{emptyText}</p>;
  }

  return (
    <div>
      <div className="flex w-full h-3 rounded-full overflow-hidden gap-0.5">
        {visible.map((s) => (
          <div
            key={s.key}
            className={s.className}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {visible.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className={`w-2 h-2 rounded-full ${s.className}`} />
            {s.label} · {Math.round((s.value / total) * 100)}%
          </div>
        ))}
      </div>
    </div>
  );
}

function DeviceBreakdown({ breakdown }: { breakdown: SiteAnalyticsData['deviceBreakdown'] }) {
  return (
    <SegmentBar
      emptyText="No device data yet"
      segments={[
        { key: 'mobile', label: 'Mobile', value: breakdown.mobile, className: 'bg-blue-600 dark:bg-blue-500' },
        { key: 'desktop', label: 'Desktop', value: breakdown.desktop, className: 'bg-indigo-500 dark:bg-indigo-400' },
        { key: 'tablet', label: 'Tablet', value: breakdown.tablet, className: 'bg-emerald-500 dark:bg-emerald-400' },
      ]}
    />
  );
}

// ── Bangladesh traffic map — bubble-scatter, not a traced coastline ──────
// The 8 divisional-capital dots are placed at their real relative lat/lon
// position within Bangladesh's bounding box (so the layout is geographically
// meaningful), but the panel itself doesn't claim to be a precise coastline
// trace — that's what the exact-count ranked list next to it is for.

interface CityPoint {
  key: Exclude<GeoBucketKey, 'other_bd' | 'outside_bd' | 'unknown'>;
  label: string;
  x: number; // % across the plotting area, derived from longitude
  y: number; // % down the plotting area, derived from latitude
}

const GEO_CITY_POINTS: CityPoint[] = [
  { key: 'rangpur', label: 'Rangpur', x: 26.0, y: 16.7 },
  { key: 'sylhet', label: 'Sylhet', x: 80.6, y: 30.2 },
  { key: 'rajshahi', label: 'Rajshahi', x: 12.5, y: 38.6 },
  { key: 'mymensingh', label: 'Mymensingh', x: 50.0, y: 32.5 },
  { key: 'dhaka', label: 'Dhaka', x: 50.2, y: 47.5 },
  { key: 'khulna', label: 'Khulna', x: 32.5, y: 62.7 },
  { key: 'barishal', label: 'Barishal', x: 49.4, y: 65.1 },
  { key: 'chattogram', label: 'Chattogram', x: 78.8, y: 70.5 },
];

const GEO_LABELS: Record<GeoBucketKey, string> = Object.fromEntries(
  BD_GEO_BUCKETS.map((b) => [b.key, b.label])
) as Record<GeoBucketKey, string>;

function BangladeshMap({ breakdown }: { breakdown: SiteAnalyticsData['geoBreakdown'] }) {
  const width = 240;
  const height = 315;
  const maxValue = Math.max(...GEO_CITY_POINTS.map((p) => breakdown?.[p.key] || 0), 1);
  const totalAll = Object.values(breakdown || {}).reduce((sum, v) => sum + (v || 0), 0);

  const minR = 5;
  const maxR = 26;
  const radiusFor = (value: number) => (value <= 0 ? 3 : minR + (maxR - minR) * Math.sqrt(value / maxValue));

  const rankedRows = [...BD_GEO_BUCKETS]
    .map((b) => ({ label: b.label, value: breakdown?.[b.key] || 0 }))
    .sort((a, b) => b.value - a.value);

  if (totalAll === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">No location data yet</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 items-start">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[220px] mx-auto sm:mx-0"
        role="img"
        aria-label="Visits by Bangladesh city, last 30 days"
      >
        <rect
          x={2}
          y={2}
          width={width - 4}
          height={height - 4}
          rx={16}
          className="fill-blue-50/60 dark:fill-blue-500/5 stroke-blue-100 dark:stroke-blue-900/40"
          strokeWidth={1.5}
          strokeDasharray="3 4"
        />
        <text
          x={width / 2}
          y={height - 12}
          textAnchor="middle"
          className="fill-blue-300 dark:fill-blue-800"
          fontSize="9"
          fontStyle="italic"
        >
          Bay of Bengal
        </text>
        {GEO_CITY_POINTS.map((p) => {
          const value = breakdown?.[p.key] || 0;
          const r = radiusFor(value);
          const cx = (p.x / 100) * width;
          const cy = (p.y / 100) * height;
          return (
            <g key={p.key}>
              <title>{`${p.label}: ${value.toLocaleString()} visits (30d)`}</title>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                className={value > 0 ? 'fill-blue-600/70 dark:fill-blue-400/60 stroke-blue-700 dark:stroke-blue-300' : 'fill-gray-300/50 dark:fill-gray-700/50 stroke-gray-300 dark:stroke-gray-700'}
                strokeWidth={1}
              />
              <text
                x={cx}
                y={cy - r - 4}
                textAnchor="middle"
                className="fill-gray-600 dark:fill-gray-300 font-semibold"
                fontSize="8.5"
              >
                {p.label}
              </text>
              {value > 0 && (
                <text x={cx} y={cy + 3} textAnchor="middle" className="fill-white" fontSize="8" fontWeight={700}>
                  {formatCompact(value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ul className="space-y-2">
        {rankedRows.map((r) => {
          const pct = totalAll > 0 ? Math.round((r.value / totalAll) * 100) : 0;
          return (
            <li key={r.label} className="flex items-center gap-2.5 sm:gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 w-24 sm:w-28 shrink-0 truncate">{r.label}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                  style={{ width: `${Math.max(pct, r.value > 0 ? 3 : 0)}%` }}
                />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-200 w-16 text-right shrink-0">
                {formatCompact(r.value)} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Growth funnel — each stage as a percentage of the first stage ────────

function FunnelBars({ stages }: { stages: SiteAnalyticsData['growthFunnel'] }) {
  const base = stages[0]?.value || 0;
  if (base === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">No visitor data yet</p>;
  }
  return (
    <ul className="space-y-3">
      {stages.map((s, i) => {
        const pct = base > 0 ? Math.round((s.value / base) * 100) : 0;
        return (
          <li key={s.stage}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{s.stage}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatCompact(s.value)} {i > 0 && <span>· {pct}% of visitors</span>}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400"
                style={{ width: `${Math.max(pct, s.value > 0 ? 2 : 0)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Retention — D1/D7/D30, approximated from last-visit vs signup date ───

function RetentionRow({ retention }: { retention: SiteAnalyticsData['retention'] }) {
  const buckets: { label: string; data: { eligible: number; retained: number; rate: number } }[] = [
    { label: 'D1', data: retention.d1 },
    { label: 'D7', data: retention.d7 },
    { label: 'D30', data: retention.d30 },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {buckets.map((b) => (
        <div key={b.label} className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {b.data.eligible > 0 ? `${b.data.rate}%` : '—'}
          </p>
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">
            {b.label} retention
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">
            {b.data.retained}/{b.data.eligible} eligible
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Balance integrity watchlist — accounts sitting on an implausibly large
// balance, worth a human glance given this site's history with tampered
// balances (see app/api/simulator/trade's SANE_BALANCE_CAP).

function BalanceIntegrityCard({ data }: { data: SiteAnalyticsData['balanceIntegrity'] }) {
  const isClean = data.flaggedCount === 0;
  return (
    <div
      className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border ${
        isClean
          ? 'bg-white dark:bg-[#1A1F26] border-gray-100 dark:border-gray-800'
          : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              isClean ? ACCENT_CLASSES.green : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Balance Integrity</h3>
        </div>
        <Link
          href="/admin/users/top-coin-holders"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:gap-1.5 transition-all shrink-0"
        >
          Review <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {isClean ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No balances above {formatCompact(data.threshold)} coins right now — nothing flagged for review.
        </p>
      ) : (
        <>
          <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
            <strong>{data.flaggedCount}</strong> account{data.flaggedCount === 1 ? '' : 's'} above{' '}
            {formatCompact(data.threshold)} coins — worth a manual check.
          </p>
          <ul className="space-y-1">
            {data.watchlist.map((u, i) => (
              <li key={u.uid} className="flex items-center justify-between gap-3 py-1.5 border-b border-amber-100 dark:border-amber-500/20 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                  {u.email && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{u.email}</p>}
                </div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 shrink-0">{formatCompact(u.coins)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ── Account integrity — Firebase Auth vs the `users` collection. These two
// drift apart silently: deleting an Auth account leaves its Firestore doc
// behind, and some accounts never get a doc written, so a raw doc count
// overstates how many real users exist. Duplicate emails (two UIDs, one
// address) indicate a signup that fired twice concurrently.
function AccountIntegrityCard({
  data,
  onRefresh,
}: {
  data: SiteAnalyticsData['accountIntegrity'];
  onRefresh?: () => void;
}) {
  const [syncingAction, setSyncingAction] = useState<'backfill' | 'clean' | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!data || 'error' in data) {
    return (
      <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 border bg-white dark:bg-[#1A1F26] border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Account Integrity</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {(data as any)?.error || 'Unavailable right now.'}
        </p>
      </div>
    );
  }

  const isClean = data.orphanedDocCount === 0 && data.missingDocCount === 0 && data.duplicateEmailCount === 0;

  const handleAction = async (action: 'backfill-missing-user-docs' | 'delete-orphaned-user-docs') => {
    setSyncingAction(action === 'backfill-missing-user-docs' ? 'backfill' : 'clean');
    setFeedback(null);
    try {
      const res = await fetchWithFreshToken('/api/admin/site-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Action failed');

      setFeedback({
        message:
          action === 'backfill-missing-user-docs'
            ? `Successfully created ${json.backfilledCount} missing user doc(s).`
            : `Successfully deleted ${json.deletedCount} orphaned user doc(s).`,
        type: 'success',
      });
      onRefresh?.();
    } catch (err: any) {
      setFeedback({ message: err.message || 'Operation failed', type: 'error' });
    } finally {
      setSyncingAction(null);
    }
  };

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border ${
        isClean
          ? 'bg-white dark:bg-[#1A1F26] border-gray-100 dark:border-gray-800'
          : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              isClean ? ACCENT_CLASSES.green : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isClean ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Account Integrity</h3>
        </div>

        {isClean && onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh integrity stats"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Firebase Auth accounts</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCompact(data.authAccountCount)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Firestore user docs</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCompact(data.userDocCount)}</p>
        </div>
      </div>

      {isClean ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Auth and Firestore are in sync — no orphaned docs, missing docs, or duplicate emails.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2 text-sm">
            {data.orphanedDocCount > 0 && (
              <li className="text-amber-800 dark:text-amber-300">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <strong>{data.orphanedDocCount}</strong> user doc{data.orphanedDocCount === 1 ? '' : 's'} with no Auth account — leftovers from deleted accounts.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAction('delete-orphaned-user-docs')}
                    disabled={syncingAction !== null}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 shrink-0 transition-colors"
                  >
                    {syncingAction === 'clean' ? 'Cleaning...' : 'Clean Orphaned Docs'}
                  </button>
                </div>
              </li>
            )}
            {data.missingDocCount > 0 && (
              <li className="text-amber-800 dark:text-amber-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <strong>{data.missingDocCount}</strong> Auth account{data.missingDocCount === 1 ? '' : 's'} with no user doc — invisible to admin lists.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAction('backfill-missing-user-docs')}
                    disabled={syncingAction !== null}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 shrink-0 transition-colors shadow-xs"
                  >
                    {syncingAction === 'backfill' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{syncingAction === 'backfill' ? 'Syncing...' : 'Sync Missing Docs'}</span>
                  </button>
                </div>
                {data.missingDocs && data.missingDocs.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-2 border-l-2 border-amber-300 dark:border-amber-700 text-[11px] text-gray-700 dark:text-gray-300">
                    {data.missingDocs.map((m) => (
                      <li key={m.uid} className="truncate">
                        <span className="font-semibold">{m.email || 'No email'}</span> ({m.providers.join(', ') || 'unknown'}) • UID: <code className="font-mono text-[10px]">{m.uid.slice(0, 10)}...</code>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}
            {data.duplicateEmailCount > 0 && (
              <li className="text-amber-800 dark:text-amber-300">
                <strong>{data.duplicateEmailCount}</strong> email
                {data.duplicateEmailCount === 1 ? '' : 's'} with more than one account:
                <ul className="mt-1 space-y-1">
                  {data.duplicateEmails.map((d) => (
                    <li key={d.email} className="text-[11px] text-gray-600 dark:text-gray-400 break-all">
                      {d.email} — {d.count} accounts ({d.accounts.map((a) => a.providers.join('/') || 'unknown').join(', ')})
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>

          {feedback && (
            <p className={`text-xs font-semibold ${feedback.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
              {feedback.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SessionRetentionCard({
  data,
  onRefresh,
}: {
  data: SiteAnalyticsData['sessionRetention'];
  onRefresh?: () => void;
}) {
  const [isPruning, setIsPruning] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!data) return null;

  const handlePrune = async () => {
    setIsPruning(true);
    setFeedback(null);
    try {
      const res = await fetchWithFreshToken('/api/admin/site-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prune-expired-sessions' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Pruning failed');

      setFeedback({
        message: `Successfully pruned ${json.prunedCount} stale anonymous session(s).`,
        type: 'success',
      });
      onRefresh?.();
    } catch (err: any) {
      setFeedback({ message: err.message || 'Pruning failed', type: 'error' });
    } finally {
      setIsPruning(false);
    }
  };

  const hasPrunable = data.prunableCandidatesCount > 0;

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border ${
        hasPrunable
          ? 'bg-amber-50/60 dark:bg-amber-500/5 border-amber-200/80 dark:border-amber-500/20'
          : 'bg-white dark:bg-[#1A1F26] border-gray-100 dark:border-gray-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              hasPrunable ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : ACCENT_CLASSES.green
            }`}
          >
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Session Storage &amp; Retention</h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Tiered lifecycle: 7d anonymous bounces vs 90d registered users</p>
          </div>
        </div>

        {hasPrunable && (
          <button
            type="button"
            onClick={handlePrune}
            disabled={isPruning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors shadow-xs shrink-0"
          >
            {isPruning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isPruning ? 'Pruning...' : `Prune ${formatCompact(data.prunableCandidatesCount)} Stale`}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Total Sessions</p>
          <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{formatCompact(data.totalCount)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">User Sessions (90d)</p>
          <p className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCompact(data.userCount)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Guest Sessions (14d)</p>
          <p className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-300">{formatCompact(data.anonymousCount)}</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        {hasPrunable
          ? `${formatCompact(data.prunableCandidatesCount)} anonymous guest sessions older than 14 days can be pruned safely. Their metrics are already permanently archived in daily rollups.`
          : 'Session storage is lean and optimized. Daily traffic aggregates are archived permanently in daily rollups.'}
      </p>

      {feedback && (
        <p className={`mt-2 text-xs font-semibold ${feedback.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}

function NewVsReturningBar({ data }: { data: SiteAnalyticsData['newVsReturning'] }) {
  return (
    <SegmentBar
      emptyText="No visitor data yet"
      segments={[
        { key: 'new', label: 'New', value: data.new, className: 'bg-blue-600 dark:bg-blue-500' },
        { key: 'returning', label: 'Returning', value: data.returning, className: 'bg-emerald-500 dark:bg-emerald-400' },
      ]}
    />
  );
}

function BuyVsSellBar({ data }: { data: { buys: number; sells: number } }) {
  return (
    <SegmentBar
      emptyText="No trades yet"
      segments={[
        { key: 'buys', label: 'Buy orders', value: data.buys, className: 'bg-green-600 dark:bg-green-500' },
        { key: 'sells', label: 'Sell orders', value: data.sells, className: 'bg-red-500 dark:bg-red-400' },
      ]}
    />
  );
}

// ── Traffic sources — magnitude comparison across categories, single hue ─

const SOURCE_LABELS: Record<string, string> = {
  direct: 'Direct',
  internal: 'Internal',
  search_google: 'Google',
  search_other: 'Other search',
  social: 'Social',
  other: 'Other',
};

function HorizontalBarList({ rows, emptyText }: { rows: { label: string; value: number }[]; emptyText: string }) {
  const filtered = rows.filter((r) => r.value > 0);
  const max = Math.max(...filtered.map((r) => r.value), 1);
  if (filtered.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">{emptyText}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {filtered.map((r) => (
        <li key={r.label} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0 truncate">{r.label}</span>
          <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
              style={{ width: `${Math.max((r.value / max) * 100, 3)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-10 text-right shrink-0">
            {formatCompact(r.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Meter — a single ratio against a limit (bounce rate) ─────────────────

function Meter({ value, label, goodBelow, warnBelow }: { value: number; label: string; goodBelow: number; warnBelow: number }) {
  const tone =
    value <= goodBelow
      ? { fill: 'bg-green-600 dark:bg-green-500', text: 'text-green-600 dark:text-green-400', word: 'Healthy' }
      : value <= warnBelow
      ? { fill: 'bg-amber-500 dark:bg-amber-400', text: 'text-amber-600 dark:text-amber-400', word: 'Watch' }
      : { fill: 'bg-red-500 dark:bg-red-400', text: 'text-red-600 dark:text-red-400', word: 'High' };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}%</span>
        <span className={`text-xs font-semibold ${tone.text}`}>{tone.word}</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${tone.fill}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">{label}</p>
    </div>
  );
}

// ── Peak activity hours — 24 single-hue bars ──────────────────────────────

function PeakHoursChart({ hours }: { hours: { hour: number; sessions: number }[] }) {
  const max = Math.max(...hours.map((h) => h.sessions), 1);
  if (hours.every((h) => h.sessions === 0)) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">No activity data yet</p>;
  }
  const formatHour = (h: number) => {
    const period = h < 12 ? 'am' : 'pm';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour}${period}`;
  };
  return (
    <div>
      <div className="flex items-end gap-[3px] h-24">
        {hours.map((h) => (
          <div
            key={h.hour}
            className="flex-1 rounded-t bg-blue-600 dark:bg-blue-500 min-h-[2px]"
            style={{ height: `${Math.max((h.sessions / max) * 100, 2)}%` }}
            title={`${formatHour(h.hour)}: ${h.sessions} visits`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
    </div>
  );
}

// ── Simple ranked list (top pages / most-traded stocks) ──────────────────

function RankedListCard({
  title,
  icon,
  accent,
  rows,
  emptyText,
}: {
  title: string;
  icon: ReactNode;
  accent: keyof typeof ACCENT_CLASSES;
  rows: { label: string; value: string }[];
  emptyText: string;
}) {
  return (
    <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${ACCENT_CLASSES[accent]}`}>{icon}</div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r, i) => (
            <li key={`${r.label}-${i}`} className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 dark:border-gray-900 last:border-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[11px] font-semibold text-gray-300 dark:text-gray-600 w-4 shrink-0">{i + 1}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.label}</span>
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 shrink-0">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── User list card (most / least active) ─────────────────────────────────

function UserListCard({
  title,
  icon,
  accent,
  users,
  emptyText,
  metricLabel,
  viewAllHref,
}: {
  title: string;
  icon: ReactNode;
  accent: keyof typeof ACCENT_CLASSES;
  users: UserRow[];
  emptyText: string;
  metricLabel: (u: UserRow) => string;
  viewAllHref?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${ACCENT_CLASSES[accent]}`}>{icon}</div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:gap-1.5 transition-all shrink-0">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      {users.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {users.map((u, i) => (
            <li key={u.uid} className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 dark:border-gray-900 last:border-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[11px] font-semibold text-gray-300 dark:text-gray-600 w-4 shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                  {u.email && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{u.email}</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{metricLabel(u)}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{timeAgo(u.lastVisitAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CoinLeaderboardCard({ users, viewAllHref }: { users: CoinRow[]; viewAllHref?: string }) {
  return (
    <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${ACCENT_CLASSES.amber}`}>
            <Icon.Coin />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Top Coin Holders</h3>
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:gap-1.5 transition-all shrink-0">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      {users.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">No users with coins yet</p>
      ) : (
        <ul className="space-y-1">
          {users.map((u, i) => (
            <li key={u.uid} className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 dark:border-gray-900 last:border-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[11px] font-semibold text-gray-300 dark:text-gray-600 w-4 shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                  {u.email && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{u.email}</p>}
                </div>
              </div>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                {formatCompact(u.coins)} <span className="text-gray-400 dark:text-gray-500 font-normal">coins</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Section root ──────────────────────────────────────────────────────

export default function SiteAnalyticsSection({
  data,
  loading,
  error,
  onRefresh,
}: {
  data: SiteAnalyticsData | null;
  loading: boolean;
  error?: string | null;
  onRefresh?: () => void;
}) {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [localCopyFeedback, setLocalCopyFeedback] = useState<string | null>(null);

  const handleCopyMd = async () => {
    if (!data) return;
    try {
      const content = generateAdminAnalyticsMarkdown(data);
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        const dateTag = new Date().toISOString().split('T')[0];
        downloadAnalyticsFile(`stocksimulatorbd-analytics-${dateTag}.md`, content, 'text/markdown;charset=utf-8');
      }
      setLocalCopyFeedback('Markdown copied!');
      setTimeout(() => setLocalCopyFeedback(null), 3000);
    } catch {
      setExportModalOpen(true);
    }
  };

  const handleCopyJson = async () => {
    if (!data) return;
    try {
      const content = generateAdminAnalyticsJson(data);
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        const dateTag = new Date().toISOString().split('T')[0];
        downloadAnalyticsFile(`stocksimulatorbd-analytics-${dateTag}.json`, content, 'application/json;charset=utf-8');
      }
      setLocalCopyFeedback('JSON copied!');
      setTimeout(() => setLocalCopyFeedback(null), 3000);
    } catch {
      setExportModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[92px] rounded-2xl sm:rounded-3xl bg-gray-100 dark:bg-[#1A1F26] animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-[#1A1F26] border border-red-100 dark:border-red-500/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
        <p className="text-sm text-red-600 dark:text-red-400">{error || 'Site analytics unavailable right now.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* AI Strategy & LLM Export Toolbar */}
      <div className="bg-white dark:bg-[#1A1F26] border border-gray-200/80 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">AI Strategy &amp; LLM Export</h3>
              {localCopyFeedback && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md animate-in fade-in">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {localCopyFeedback}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Format live traffic, retention curves, trading volume, and monetization into prompt-ready briefs for ChatGPT, Claude, or Gemini.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleCopyMd}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all inline-flex items-center gap-1.5 shadow-xs active:scale-95"
            title="Copy formatted Markdown brief to clipboard"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export as Markdown</span>
          </button>

          <button
            type="button"
            onClick={handleCopyJson}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all inline-flex items-center gap-1.5 shadow-xs active:scale-95"
            title="Copy raw JSON data to clipboard"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Export as JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#16202D] border border-gray-200/80 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all inline-flex items-center gap-1.5 shadow-xs active:scale-95"
            title="Inspect prompt preview and file download options"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Export Studio</span>
          </button>
        </div>
      </div>

      {/* Visits KPI row */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon.TrendUp />
            Site Visits
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 text-green-700 dark:text-green-400 text-xs font-bold shrink-0">
            <Radio className="w-3 h-3 animate-pulse" />
            {data.activeRightNow.toLocaleString()} online now
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <StatTile label="Visits today" value={formatCompact(data.visitors.today)} accent="blue" icon={<Icon.Users />} />
          <StatTile label="Last 7 days" value={formatCompact(data.visitors.last7Days)} accent="blue" icon={<Icon.Users />} />
          <StatTile label="Last 30 days" value={formatCompact(data.visitors.last30Days)} accent="blue" icon={<Icon.Users />} />
          <StatTile
            label="Avg time on site"
            value={formatDuration(data.avgSessionSeconds.today || data.avgSessionSeconds.last7Days)}
            sublabel={`${formatDuration(data.avgSessionSeconds.last7Days)} avg (7d)`}
            accent="green"
            icon={<Icon.Clock />}
          />
        </div>
      </div>

      {/* Trend chart + device split */}
      <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Visits — last 30 days</h3>
          <TrendChart data={data.dailyTrend} />
        </div>
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Device split (30d)</h3>
          <DeviceBreakdown breakdown={data.deviceBreakdown} />
        </div>
      </div>

      {/* Visitor location — Bangladesh divisional cities */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Visitor Location (30d)
        </h2>
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
          <BangladeshMap breakdown={data.geoBreakdown} />
        </div>
      </div>

      {/* Traffic sources, visitor loyalty, bounce rate */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
          <Icon.Compass />
          Traffic & Engagement Quality
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Traffic sources (30d)</h3>
            <HorizontalBarList
              emptyText="No traffic data yet"
              rows={Object.entries(data.trafficSources).map(([key, value]) => ({
                label: SOURCE_LABELS[key] || key,
                value,
              }))}
            />
          </div>
          <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">New vs returning visitors (30d)</h3>
            <NewVsReturningBar data={data.newVsReturning} />
          </div>
          <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Bounce rate (7d)</h3>
            <Meter
              value={data.bounceRate}
              label="Sessions with 1 page view and ≤10s active time"
              goodBelow={40}
              warnBelow={60}
            />
          </div>
        </div>
      </div>

      {/* Peak hours + top landing pages */}
      <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Peak activity hours (7d, Dhaka time)</h3>
          <PeakHoursChart hours={data.peakHours} />
        </div>
        <RankedListCard
          title="Top Landing Pages"
          icon={<Icon.Compass />}
          accent="purple"
          rows={data.topLandingPages.map((p) => ({ label: p.path, value: formatCompact(p.views) }))}
          emptyText="No page view data yet"
        />
      </div>

      {/* Content performance — which blog posts and stock pages pull traffic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <RankedListCard
          title="Top Blog Posts"
          icon={<Newspaper className="w-4 h-4" />}
          accent="indigo"
          rows={data.topBlogPosts.map((p) => ({ label: p.path.replace(/^\/blog\//, ''), value: formatCompact(p.views) }))}
          emptyText="No blog view data yet"
        />
        <RankedListCard
          title="Top Stock Pages"
          icon={<LineChart className="w-4 h-4" />}
          accent="blue"
          rows={data.topStockPages.map((p) => ({ label: p.path.replace(/^\/stocks\//, '').toUpperCase(), value: formatCompact(p.views) }))}
          emptyText="No stock page view data yet"
        />
      </div>

      {/* Registrations KPI row */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Icon.UserPlus />
          New Registrations
        </h2>
        {/* State the source explicitly: these counts come from Firebase Auth,
            so they should match the Firebase console exactly. */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">
          {data.registrations.source === 'firebase-auth' ? (
            <>Counted from Firebase Auth — matches the Firebase console.</>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              {data.registrations.sourceWarning || 'Falling back to Firestore user documents.'}
            </span>
          )}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <StatTile label="Today" value={formatCompact(data.registrations.today)} accent="indigo" icon={<Icon.UserPlus />} />
          <StatTile label="Last 7 days" value={formatCompact(data.registrations.last7Days)} accent="indigo" icon={<Icon.UserPlus />} />
          <StatTile label="Last 30 days" value={formatCompact(data.registrations.last30Days)} accent="indigo" icon={<Icon.UserPlus />} />
          <StatTile
            label="All-time accounts"
            value={formatCompact(data.registrations.totalAllTime)}
            sublabel={
              data.registrations.totalUserDocs !== data.registrations.totalAllTime
                ? `${formatCompact(data.registrations.totalUserDocs)} user docs`
                : undefined
            }
            accent="purple"
            icon={<Icon.UserPlus />}
          />
        </div>
      </div>

      {/* Disclaimer agreements — see components/app/DisclaimerGate.tsx.
          One per account, ever, so these are first-time agreements on that
          day, not an active-users count. */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Disclaimer Agreements
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
          <StatTile
            label="Today"
            value={formatCompact(data.disclaimerAgreements.today)}
            accent="green"
            icon={<ShieldCheck className="w-4 h-4" />}
          />
          <StatTile
            label="Last 7 days"
            value={formatCompact(data.disclaimerAgreements.last7Days)}
            accent="green"
            icon={<ShieldCheck className="w-4 h-4" />}
          />
          <StatTile
            label="Last 30 days"
            value={formatCompact(data.disclaimerAgreements.last30Days)}
            accent="green"
            icon={<ShieldCheck className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Retention + growth funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Retention</h3>
          <RetentionRow retention={data.retention} />
          <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-4">
            % of eligible accounts whose most recent visit landed N+ days after signup. Sampled from {formatCompact(data.retention.sampledUsers)} accounts
            {data.retention.truncated ? ' (capped sample)' : ''}.
          </p>
        </div>
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Growth Funnel (30d)</h3>
          <FunnelBars stages={data.growthFunnel} />
        </div>
      </div>

      {/* Integrity checks — balances, Auth/Firestore drift, and session retention */}
      <BalanceIntegrityCard data={data.balanceIntegrity} />
      <AccountIntegrityCard data={data.accountIntegrity} onRefresh={onRefresh} />
      <SessionRetentionCard data={data.sessionRetention} onRefresh={onRefresh} />

      {/* Revenue & recharges */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Revenue &amp; Recharges
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 mb-4">
          <StatTile
            label="Approved (30d)"
            value={formatBdt(data.revenue.approvedLast30Days.bdt)}
            sublabel={`${formatCompact(data.revenue.approvedLast30Days.count)} recharges`}
            accent="green"
            icon={<Wallet className="w-4 h-4" />}
          />
          <StatTile
            label="Approved (all-time)"
            value={formatBdt(data.revenue.approvedAllTime.bdt)}
            sublabel={`${formatCompact(data.revenue.approvedAllTime.count)} recharges`}
            accent="green"
            icon={<Wallet className="w-4 h-4" />}
          />
          <StatTile
            label="Avg recharge"
            value={formatBdt(data.revenue.avgApprovedRechargeBdt)}
            accent="blue"
            icon={<Repeat className="w-4 h-4" />}
          />
          <StatTile
            label="Recharge conversion"
            value={`${data.revenue.conversionRatePercent}%`}
            sublabel={`${formatCompact(data.revenue.rechargerCount)} of ${formatCompact(data.registrations.totalAllTime)} users`}
            accent="indigo"
            icon={<Icon.UserPlus />}
          />
        </div>
        {data.revenue.pending.count > 0 && (
          <Link
            href="/admin/recharge/pending"
            className="flex items-center justify-between gap-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
          >
            <span className="text-xs sm:text-sm text-orange-800 dark:text-orange-300">
              <strong>{data.revenue.pending.count}</strong> recharge{data.revenue.pending.count === 1 ? '' : 's'} awaiting approval — {formatBdt(data.revenue.pending.bdt)} total
            </span>
            <ArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
          </Link>
        )}
        {data.revenue.truncated && (
          <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-2">
            Revenue figures were computed from a capped sample of recharge requests and may undercount.
          </p>
        )}
      </div>

      {/* Engagement — who's active, who's gone quiet, who's rich */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
          <Icon.Users />
          Engagement
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <UserListCard
            title="Most Active Users"
            icon={<Icon.TrendUp />}
            accent="green"
            users={data.mostActiveUsers}
            emptyText="No visit data yet"
            metricLabel={(u) => `${u.visitCount} visits total`}
            viewAllHref="/admin/users/most-active"
          />
          <UserListCard
            title="Going Quiet"
            icon={<Icon.TrendDown />}
            accent="amber"
            users={data.leastActiveUsers}
            emptyText="Not enough data yet"
            metricLabel={(u) => `${u.visitCount} visits total`}
            viewAllHref="/admin/users/going-quiet"
          />
          <CoinLeaderboardCard users={data.topCoinHolders} viewAllHref="/admin/users/top-coin-holders" />
        </div>
      </div>

      {/* Trading activity — the metric most specific to a paper-trading simulator */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
          <Icon.Activity />
          Trading Activity
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 mb-4">
          <StatTile
            label="Trades today"
            value={formatCompact(data.trading?.trades.today ?? 0)}
            accent="green"
            icon={<Icon.Activity />}
          />
          <StatTile
            label="Trades (7d)"
            value={formatCompact(data.trading?.trades.last7Days ?? 0)}
            accent="green"
            icon={<Icon.Activity />}
          />
          <StatTile
            label="Active traders (7d)"
            value={formatCompact(data.trading?.activeTraders.last7Days ?? 0)}
            sublabel={`${formatCompact(data.trading?.activeTraders.today ?? 0)} today`}
            accent="blue"
            icon={<Icon.Users />}
          />
          <StatTile
            label="Coins in circulation"
            value={data.totalCoinsInCirculation != null ? formatCompact(data.totalCoinsInCirculation) : '—'}
            accent="amber"
            icon={<Icon.Coin />}
          />
        </div>

        {data.tradingError ? (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl sm:rounded-3xl p-4">
            {data.tradingError}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[40fr_60fr] gap-3 sm:gap-4">
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Buy vs sell orders (30d)</h3>
              <BuyVsSellBar data={data.trading?.buyVsSell ?? { buys: 0, sells: 0 }} />
            </div>
            <RankedListCard
              title="Most Traded Stocks (30d)"
              icon={<Icon.TrendUp />}
              accent="purple"
              rows={(data.trading?.mostTradedStocks ?? []).map((s) => ({ label: s.symbol, value: `${formatCompact(s.count)} trades` }))}
              emptyText="No trades yet"
            />
          </div>
        )}
        {data.trading?.truncated && (
          <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-2">
            Very high-volume windows are sampled from the most recent trades rather than fully counted.
          </p>
        )}
      </div>

      {data.methodologyNote && (
        <p className="text-[11px] text-gray-400 dark:text-gray-600 leading-relaxed">{data.methodologyNote}</p>
      )}

      <AnalyticsExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={data}
      />
    </div>
  );
}
