'use client';

// components/notices/activeNotice.tsx
// The one pop-up currently shown on /trade (app/trade/page.tsx renders
// <ActiveNotice />). Return null for no pop-up.
//
// To launch a new promotion or announcement:
//   1. Register it in lib/noticeCampaigns.ts with a NEW id and endedAt: null,
//      so /admin/survey labels its results and shows it as live.
//   2. Return it from ActiveNotice below, using that id. Either:
//      - a custom component that tracks itself with useOnceNotice(id)
//        (see SupportNotice.tsx), or
//      - the generic modal: <UserNoticeModal campaignId="my_promo_v1" ... />
//        (props documented on UserNoticeModalProps).
// Each signed-in trader sees it once by default: the button, a link inside,
// or closing it records users/{uid}.noticesSeen.{id} (a timestamp). Custom
// pop-ups can repeat with useOnceNotice(id, { repeatAfterDays: n }).
//
// Past campaigns' content is in git history (the T+2/T+3 settlement notice,
// dse_settlement_reality_v1, lived in app/trade/page.tsx until 2026-11-21).

import SupportNotice from './SupportNotice';

export function ActiveNotice() {
  return <SupportNotice />;
}
