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

## Market Feeds, Scrapers & DSE Modern Architecture

- **Primary Live Price Sync (`api/market_sync.py`)**:
  - Dual-engine architecture supporting both the modern DSE platform (`https://new.dsebd.org/api/live/prices`) and the legacy scroll board (`https://www.dsebd.org/latest_share_price_scroll_l.php`).
  - **Government Securities Filter**: Strictly excludes all 215 Treasury Bonds (`assetType: GOVDBT`, `sector: TBond`, `board: YIELDDBT`, `symbol.startswith('TB')`), preserving pure equity/corporate trading parity.
  - **Auto-Failover**: Automatically tries the primary engine, seamlessly falling back to the alternative engine if an outage, timeout, or low stock count (`< 50`) occurs.
  - **Real-Time Market Status**: Extracts authoritative exchange matching engine state from `session.isOpen` (`"Open"` vs `"Closed"`).
- **Stock Categories Sync (`api/category_sync.py`)**:
  - **Instant Single-Pass Engine**: Consumes `/api/live/prices` to map all 419 instruments to categories (`A`, `B`, `N`, `Z`) in < 200ms in a single request, eliminating fragile multi-threaded HTML scraping.
  - **Classic Fallback**: Retains multi-threaded scraping across A/B/G/N/Z boards if the modern API is unreachable.
  - **Health Monitoring Parity**: Fully compatible with `app/api/health/route.ts` and Uptime Kuma monitoring (`scrapers.categorySync.status == 'healthy'`).
- **Industry Sectors (`api/lanka_sector_sync.py`)**: 21 LankaBangla sectors sync with audit changelog.
- **Price Failsafe (`api/lanka_price_sync.py`)**: Backup price scraper activating only when primary heartbeat is stale.

### Modern DSE Endpoints & Discovered Feeds (`new.dsebd.org`)
- **`/api/live/depth?code=[symbol]`**: Real-time Level 2 Market Depth (Bids & Asks Order Book with price, quantity, order count, and spread).
- **`/api/live/news`**: 500-item live feed of Price Sensitive Information (PSI), dividend declarations, and corporate disclosures in clean JSON.
- **`/api/live/market`**: Official real-time indices (`DSEX`, `DS30`, `DSES`), market breadth (`advanced`, `declined`, `unchanged`), market turnover, volume, and top movers.
- **`/api/live/companies/search?q=`**: Fast scrip code to legal company name lookup.
- **`/company/[symbol]` RSC Payload**: Embedded fundamentals stream containing audited P/E, annual EPS, NAVPS, market cap, dividend yield %, 52-week high/low, 10-year dividend history, 8-year financials, 30-day P/E trend, and shareholding pattern (% Sponsor, % Institute, % Foreign, % Public).

### Oracle Always Free Tier VPS Integration
- **Role**: 24/7 background scraping, heavy crawler tasks, and static API caching.
- **Overnight Fundamentals Crawler**: Crawls all 400 company profiles at 3:00 AM BST without Vercel's 60s timeout limits.
- **Zero Firebase Cost**: Serves `fundamentals.json` or order book data directly as an edge cache mirror with sub-30ms latency, keeping Firebase Spark tier usage at zero.

---

## Search & GEO/LLM Intelligence Control Center (`/admin/seo`)

A self-hosted Search Intelligence and Generative Engine Optimization (GEO) control center that operates with **$0 paid API spend** while keeping all SEO state isolated from the production database.

### 1. Dual Firebase Project Architecture (`lib/firebaseSeoAdmin.ts`)
- **Production Firebase**: Contains user accounts, auth, trading state, and balances.
- **SEO Intelligence Firebase**: Strictly isolated database (`seo-intelligence` named app initialized via `SEO_FIREBASE_PROJECT_ID`, `SEO_FIREBASE_CLIENT_EMAIL`, and `SEO_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')`).
- **Zero Database Contamination**: The production database never stores SEO snapshots, audits, or crawl logs.
- **Lockdown Security (`firestore-seo.rules`)**:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if false; // All access server-only via Admin SDK
      }
    }
  }
  ```
- **Health Verification**: `/api/admin/seo/health` tests end-to-end admin custom claim auth, Admin SDK initialization, and write/read confirmation on `seo_config/health_check`.

### 2. Single Domain Source of Truth (`lib/siteUrl.ts`)
- All canonicals, sitemaps, robots.txt, schema.org JSON-LD, OpenGraph tags, and `/llms.txt` derive **exclusively** from `SITE_URL` and `absoluteUrl()` in `lib/siteUrl.ts` (configured via `NEXT_PUBLIC_MAIN_DOMAIN`).
- No conflicting or competing URL variables exist. During domain migration to `https://stocksimulator.shahoriar.bd`, changing `NEXT_PUBLIC_MAIN_DOMAIN` automatically updates every system.

### 3. Dynamic Knowledge Layer (`/llms.txt` & `/llms-full.txt`)
- Replaced static text files with dynamic route handlers:
  - `app/llms.txt/route.ts`: Concise, entity-clear platform summary.
  - `app/llms-full.txt/route.ts`: Comprehensive guide with selected stock directory, blog articles, and DSE trading rules.
- Automatically injects Change-of-Address notes for retrieval-based AI engines during migration.

### 4. Zero-Dollar API & Engine Stack (`lib/seo/`)
- **Google Search Console**: OAuth connect (`/api/admin/seo/gsc/connect`), callback (`/api/admin/seo/gsc/callback`), and sync (`/api/admin/seo/gsc/sync`). Refresh tokens are encrypted with AES-256-GCM (`lib/seo/crypto.ts`) using `SEO_TOKEN_ENCRYPTION_KEY` before saving to Firestore. OAuth flow enforces RFC 6749 CSRF state verification via `httpOnly` secure cookies.
- **Bing Webmaster Tools**: Official REST API client (`lib/seo/bing.ts`) tracking web, Bing chat traffic, queries, crawl health, and external backlinks. API keys are symmetrically encrypted at rest with AES-256-GCM.
- **Resumable Crawler (`lib/seo/crawler.ts`)**: State machine backed by `seo_jobs/{jobId}` with cursor persistence. Crawls in chunks of 20 URLs to avoid Vercel serverless timeouts. Extracts headings, word counts, schema, and link graphs. All fetches are guarded with `AbortSignal.timeout(6000)`.
- **Internal Link Authority (`lib/seo/authority.ts`)**: Evaluates inbound links, referring pages, click depth, and orphan page penalties without third-party APIs.
- **Opportunity Engine (`lib/seo/opportunities.ts`)**: Derives high-impression/low-CTR opportunities, striking-distance positions (4–15), rising queries, and orphan links.
- **Manual AI / GEO Lab (`lib/seo/aiLab.ts`)**: Generic domain and URL extraction for ChatGPT, Gemini, Perplexity, and Claude responses. Identifies arbitrary competitor citations and tracks empirical visibility without fake scores. Prompts persist in `ai_prompts`.
- **Change Management & Runtime Resolver (`lib/seo/metadataResolver.ts` & `app/api/admin/seo/changes/route.ts`)**: Safe Level 1 metadata overrides (`seo_overrides`) seamlessly consumed by public pages (`app/stocks/[symbol]/page.tsx`, `app/blog/[slug]/page.tsx`, `app/page.tsx`). Includes canonical path normalization (`normalizeSeoPath`), surgical single-URL ISR revalidation (`revalidatePath(cleanPath)` strictly protecting Vercel Hobby 200k ISR write quotas), automated post-apply validation (HTTP 200 check), and clean 1-click rollback.
- **True SEO Change-Impact Engine (`lib/seo/changeImpact.ts`)**: Real baseline tracking without synthetic multipliers; monitors 7d/14d/28d Search Console impact following applied overrides.
- **Domain Migration Center (`lib/seo/migration.ts`)**: Preflight shadow mode tester comparing `stocksimulator.tech` vs `stocksimulator.shahoriar.bd` with strict path preservation (`/stocks/gp` -> `/stocks/gp`), bounded to 10 parallel paths with 4s timeouts.
- **Automated Retention (`app/api/admin/seo/retention/route.ts`)**: Cleans up crawl jobs older than 30d, raw AI responses older than 60d, and audits older than 90d using Firestore `.count().get()` aggregations to ensure free Firestore tier limits are never exceeded.

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
