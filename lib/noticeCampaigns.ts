// lib/noticeCampaigns.ts
// Registry of every pop-up campaign (announcements, promotions, polls) the
// site has run. Client-safe: read by /admin/survey to label results, and by
// the admin API to know which campaign IDs to report on.
//
// The pop-up itself lives in components/notices/activeNotice.tsx. To launch a
// new one:
//   1. Add an entry here with a NEW id and `endedAt: null`.
//   2. Return the pop-up from ActiveNotice in components/notices/activeNotice.tsx
//      with the same campaign id.
// To end one: make ActiveNotice return null and give its entry an `endedAt`.
// Results (analytics_notices/{id}) stay in Firestore and keep showing on
// /admin/survey after a campaign ends.
//
// Always use a new id per campaign: "seen" is tracked per id
// (users/{uid}.noticesSeen.{id} and localStorage), so reusing an id would
// skip everyone who saw the old pop-up.

export type NoticeCampaignKind = 'announcement' | 'promotion' | 'poll';

export interface NoticeCampaign {
  id: string;
  kind: NoticeCampaignKind;
  title: string;
  /** One line for the admin page: what it said and what counted as a conversion. */
  summary: string;
  /** Where the pop-up showed. */
  page: string;
  /** YYYY-MM-DD (Dhaka). */
  startedAt: string;
  /** YYYY-MM-DD (Dhaka), or null while it is live. */
  endedAt: string | null;
}

// Newest first.
export const NOTICE_CAMPAIGNS: NoticeCampaign[] = [
  {
    id: 'support_boss_coins_v1',
    kind: 'promotion',
    title: 'Support the platform: Boss or coins',
    summary:
      'Asked traders to help with the ~$60/year running cost by getting Boss (৳20/month) or buying coins (from ৳20). Shown again 7 days after it was last closed; hidden from active Boss users. Click = Boss or coins button (target in metadata).',
    page: '/trade',
    startedAt: '2026-11-21',
    endedAt: null,
  },
  {
    id: 'dse_settlement_reality_v1',
    kind: 'announcement',
    title: 'DSE settlement cycle update (T+2 / T+3)',
    summary:
      'Explained that shares can only be sold after the settlement cycle (T+2 for A/B/G/N, T+3 for Z), counted in trading days. Click = "Okay" button or a link inside.',
    page: '/trade',
    startedAt: '2026-10-31',
    endedAt: '2026-11-21',
  },
  {
    id: 'facebook_page_launch_v1',
    kind: 'promotion',
    title: 'Official Facebook page launch',
    summary: 'Asked traders to follow the new Facebook page. Click = opened the page; copy = copied its link.',
    page: '/trade',
    startedAt: '2026-10-09',
    endedAt: '2026-10-31',
  },
  {
    id: 'domain_survey',
    kind: 'poll',
    title: 'Domain renewal community poll #1',
    summary: 'Rated the trading experience and voted on the domain. Full results are in the poll tab.',
    page: '/trade',
    startedAt: '2026-09-05',
    endedAt: '2026-10-25',
  },
];

export function getLiveCampaign(): NoticeCampaign | null {
  return NOTICE_CAMPAIGNS.find((c) => c.endedAt === null) ?? null;
}
