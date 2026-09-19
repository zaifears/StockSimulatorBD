# AGENTS.md

Project context for AI coding assistants (Antigravity, Claude, Gemini, or any LLM agent) working in this repo. Read this before making changes — it'll save you from re-discovering things the hard way.

## What this is

**StockSimulatorBD** ([stocksimulator.tech](https://www.stocksimulator.tech)) — a free, risk-free paper-trading simulator for the Dhaka Stock Exchange (DSE). Next.js 16 / React 19 / TypeScript, Firebase (Auth + Firestore + Admin SDK) backend, deployed on Vercel, `pnpm` package manager, Tailwind CSS 3.

Audience: students learning the market, and increasingly new investors moving from safer instruments (Sanchayapatra, fixed deposits) into stocks and feeling nervous about it. Keep both framings in mind when touching user-facing copy — don't drop one for the other.

Built and maintained solo by Md Al Shahoriar Hossain (`zaifears`). No automated test suite exists — verification is `tsc --noEmit`, `pnpm build` plus manual/browser checks.

## Repo layout

```
app/
  page.tsx                                Homepage
  trade/                                  Main trading terminal (client-heavy, real-time)
  stocks/[symbol]/                        Per-stock page: candlestick chart + trade panel
  portfolio/                              Portfolio screen: Holdings, Orders, Insights (Boss gated)
  boss/                                   Boss Tier hub: pricing, 14-feature audit, bKash verification
  coins/                                  Balance + bKash recharge UI (+10% Boss bonus calculation)
  profile/                                User profile & subscription status
  auth/                                   Login/signup (email, Google, Google One Tap)
  blog/, blog/[slug]/                     Contentful-backed articles
  admin/                                  Admin dashboard (custom-claim & role gated)
    tier/                                 Boss subscription queue, email search & manual grants
    recharge/{pending,approved,rejected}/ Recharge queue review
    users/{most-active,going-quiet,top-coin-holders}/ Full exportable user lists
    survey/                               Community poll responses
    promo-codes/                          Promo code generation and audit
  policy/                                 Privacy Policy + Terms + trading/virtual-currency disclaimers
  api/                                    Next.js route handlers (see below)
api/                                      Vercel PYTHON serverless functions (NOT under app/api) —
  dse_chart.py                            scrapes dsebd.org day-end archive for chart candles
  market_sync.py                          live price sync (primary, dsebd.org)
  category_sync.py                        DSE market-category (A/B/G/N/Z) sync — see note below
  lanka_sector_sync.py                    industry sector sync (Scraper A, lankabd.com) — see note below
  lanka_price_sync.py                     price failsafe (Scraper B, lankabd.com) — see note below
  run_market.py, run_chart.py             related sync entry points
components/
  admin/                                  SiteAnalyticsSection.tsx, TierList.tsx, RechargeList.tsx, UserExportList.tsx
  portfolio/                              PortfolioInsights.tsx, PortfolioSummary.tsx, HoldingsList.tsx, OrdersList.tsx
  ui/                                     BossBadge.tsx, CoinDisplay.tsx
  simulator/trade/                        TradeModal.tsx
  shared/                                 Footer.tsx, Navbar.tsx etc.
lib/
  firebaseAdmin.ts                        Firebase Admin SDK init — side-effect import shared by every server route
  resendAdmin.ts                          Resend email dispatcher for admin alerts (recharges, boss upgrades)
  utils/                                  money.ts, marketHours.ts, dhakaTime.ts, geoBucket.ts,
                                          persistentRateLimit.ts, simulatorBalances.ts, fetchWithToken.ts,
                                          adminVerification.ts, portfolio.ts
  contentful.ts, contentful-blog.ts       blog CMS client
  dseStocks.ts, dseCompanyNames.ts, bangladeshHolidays.ts
firestore.rules
```

---

## Account Tiers: Bro (Free) vs. Boss (Pro)

The application operates a clear two-tier model:

1. **Bro Tier (Standard / Free)**:
   - Default tier assigned to all newly created accounts (`accountTier = 'Bro'`).
   - 100% Free core DSE trading forever: live market data, full candlestick charts, portfolio holdings, and basic order history.
2. **Boss Tier (Pro)**:
   - **Pricing**: ৳20 for 1 Month (31 Days) or ৳99 for 6 Months (185 Days, Save 18%).
   - **Perks**:
     - **Portfolio Insights & Risk Radar** (`components/portfolio/PortfolioInsights.tsx`): Banked Realized P&L, 21 DSE Industry Sector exposure radar, concentration risk alerts (40%+ single-holding warning), and lifetime commission audit (0.4% brokerage cost tracking).
     - **+10% Extra Coins for Free**: Automatically credited on every approved bKash coin recharge.
     - **Visual Recognition**: Metallic gold `BossBadge` across profile, navbar, and order history.
     - **Upcoming**: PDF Portfolio Statement generation, isolated sandbox slots.

### Real-Time Tier Synchronization (`contexts/AuthContext.tsx`)
- Instead of stale one-shot reads, `AuthContext` runs an active `onSnapshot` listener on `users/{user.uid}`.
- Whenever an admin grants Boss status or a subscription reaches expiry, `accountTier` and `isBoss` update **instantly in the active browser session** without requiring a page refresh.

### Insights Memory & DOM Isolation (`app/portfolio/page.tsx`)
- `getPortfolioInsights()` in `app/portfolio/page.tsx` is wrapped in `isBoss ? getPortfolioInsights(...) : null`.
- For Bro tier accounts, analytics are **never computed or stored in the React tree**.
- DevTools element un-hiding or CSS blur removal reveals only static marketing placeholder examples — actual user portfolio insights physically do not exist in memory or the DOM unless `isBoss === true`.
- The *"Preview Demo"* bypass button and `demoUnlocked` state have been removed.

---

## One Currency & Authoritative Bonus

`artifacts/{appId}/users/{uid}/simulator/state.balance` is the only currency in the app — the real BDT-equivalent trading balance. `appId` = `process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1'`. Credited by bKash recharge approval (`app/api/admin/recharge/route.ts`) and the welcome bonus (`app/api/auth/grant-social-bonus/route.ts`), spent/earned by trading.

- **Standard Recharge Rate**: 20 BDT = 10,000 coins (500 coins per taka). Minimum 20 BDT, maximum 5,000 BDT per request, multiples of 20.
- **Boss +10% Bonus**: Boss users automatically receive 10% extra coins (550 coins / taka).
- **Authoritative Server Credit (`app/api/admin/recharge/route.ts`)**:
  - The admin approval transaction inspects `userData.accountTier === 'Boss' || userData.bossUntil > now` directly from the Firestore user document via Firebase Admin SDK.
  - Client-submitted bonus numbers or flags are ignored — the server authoritatively credits `baseCoins + 10%` for verified Boss users.

---

## Trading is Fully Server-Side

`hooks/useSimulator.ts`'s `executeTrade()` does **not** write Firestore directly — it POSTs to `app/api/simulator/trade/route.ts`, which is the only handler allowed to write `simulator/state`. That route:
- re-derives price from `artifacts/{appId}/public/data/market_info/latest` (never trusts a client-submitted price)
- recomputes commission (`lib/utils/money.ts`, `COMMISSION_RATE = 0.004`)
- enforces the T+1 rule **per purchase lot** (`portfolio[].lots[]`, not just an aggregate `purchaseDate`)
- enforces market hours via `lib/utils/marketHours.ts`'s `isMarketOpenServer()`
- re-enforces `SANE_BALANCE_CAP` (100,000,000) on the SELL path by hand, because **Admin SDK writes bypass `firestore.rules` entirely**

---

## Admin Pipeline & Subscriptions Management (`/admin` & `/admin/tier`)

- **Main Dashboard (`app/admin/page.tsx`)**:
  - Top-priority **Boss Tier Subscriptions** card displays active Boss count and pending requests.
  - **Direct 1-Click Verification**: If pending Boss requests exist, renders an interactive table with Trader Name, Email, Plan, bKash TrxID, and 1-click **"Approve"** and **"Reject"** buttons.
  - **Direct Email Upgrade Bar**: Look up any registered user by email, select duration, and grant Boss access instantly.
  - Listener on `boss_requests` is strictly gated behind `isAdminMode === true` to prevent unauthenticated console errors.
- **Dedicated Subscriptions Manager (`app/admin/tier/page.tsx` & `components/admin/TierList.tsx`)**:
  - 4 KPI metric cards: Action Needed (pulsing indicator), Active Boss Users, Approved Subscriptions, Rejected Subscriptions.
  - Tabs: `Pending Requests`, `Approved`, `Rejected`, and `Search Email / UID & Grant`.
  - Search filter bar for fast matching on trader name, email, plan, or bKash TrxID.
  - 1-click bKash TrxID copy button.
- **Admin Tier Route Handler (`app/api/admin/tier/route.ts`)**:
  - `GET ?search=...`: Resolves user documents by UID, Firestore email query (case-insensitive), or Firebase Admin Auth lookup.
  - `POST action: 'approve'`: Runs an atomic transaction that sets `accountTier: 'Boss'`, calculates `bossUntil`, updates request to `approved`, and logs the admin ID.
  - `POST action: 'manual_grant'`: Accepts either `userId` or `email`, clamps duration through `safeDays()`, and updates the tier.
  - `POST action: 'revoke'`: Reverts user document to `'Bro'` tier and zeroes `bossUntil`.
  - **Safe Days Whitelist**: `ALLOWED_DAYS = [7, 31, 185, 365]`. Invalid or arbitrary day counts (e.g. 100 years) are clamped safely.

---

## Security Architecture & Anti-Tamper Lockdown

### Firestore Security Rules (`firestore.rules`)
All client SDK writes are strictly validated:
1. **Protected User Fields**:
   ```javascript
   function protectedUserFields() {
     return [
       'admin', 'welcomeBonusGranted', 'role', 'isGodMode',
       'disclaimerAgreedAt', 'promoCodeRedeemedAt', 'tradeSurveyCompletedAt',
       'bossUntil', 'bossSince', 'lastBossPlan'
     ];
   }
   ```
2. **Users Collection (`/users/{userId}`)**:
   - `create`: Client is only allowed to create with `accountTier == 'Bro'` and cannot include any `protectedUserFields`.
   - `update`: Client cannot touch any `protectedUserFields`. If `accountTier` is touched, it is only allowed if both the new value and existing value are `'Bro'`.
   - Direct console writes (`db.collection('users').doc(uid).update({ accountTier: 'Boss' })` or `role: 'admin'`) are **strictly rejected with `permission-denied`**.
   - Deletion of `accountTier` via `FieldValue.delete()` is also blocked by the `== 'Bro'` evaluation.
3. **Server-Only Collections**:
   - `coinTransactions`: `allow create, update, delete: if false;` (all writes happen server-side via Admin SDK).
   - `simulator/state`: `allow create, update, delete: if false;` (trades and state creation are server-only).
   - `recharge_requests` and `boss_requests`: Status must be `'pending'`, amounts and durations must match whitelisted pricing (`[20, 99]` BDT, `[31, 185]` days). Updates and deletes are blocked.
   - `short_links`: Click incrementing requires `isAuthenticated()`.

---

## Email Notification System (`lib/resendAdmin.ts`)

- Powered by [Resend](https://resend.com) with HTML email templates and admin alert styling.
- **Boss Upgrade Alerts (`app/api/boss/send-request-email/route.ts`)**: Dispatches on new Boss request submission with plan name, BDT amount, user details, monospace TrxID, and link to `/admin/tier`.
- **Recharge Alerts (`app/api/coins/send-recharge-email/route.ts`)**: Dispatches on coin recharge submission with user tier status (`👑 Boss Tier (+10% Bonus)` vs `Bro Tier`), base coins, and total coins.

---

## Market Feeds & Scrapers

- **Stock Categories (A/B/G/N/Z)**: `api/category_sync.py` scrapes `dsebd.org/latest_share_price_scroll_group.php`. Gated by `CRON_SECRET` at `app/api/category-sync/route.ts`. Multi-thread parallel fetch with drop guard (`MAX_DROP_FRACTION = 0.15`).
- **Industry Sectors (21 LankaBangla Sectors)**: `api/lanka_sector_sync.py` scrapes `lankabd.com/Home/DataMatrix`. Stored in `artifacts/{appId}/public/data/market_info/sectors` with changelog audit trail.
- **Price Failsafe**: `api/lanka_price_sync.py` / `app/api/price-failsafe-sync/route.ts` activates if primary `market_info/latest` is older than 15 minutes during market hours. Dispatches Resend outage alerts to the admin.

---

## Verification & Build Standards

- **Cross-File Type Checking**:
  ```bash
  pnpm type-check
  # or
  pnpm tsc --noEmit
  ```
- **Production Build**:
  ```bash
  pnpm build
  ```
- **Deploying Firestore Security Rules**:
  ```bash
  npx -y firebase-tools@latest deploy --only firestore:rules
  ```
  *(Remember: Vercel deploys code on push, but Firestore rules must be deployed via Firebase CLI).*
- **Commit Message Convention**:
  Every commit must begin with a version number:
  ```bash
  git commit -m "3.8.1 security: plug all audit loopholes..."
  ```
