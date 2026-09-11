# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — students and first-time learners.** Curious about the Dhaka Stock Exchange, no capital to risk yet, often no BO account. They need to see how prices move, how an order behaves, and what a portfolio does over time before any of it costs them anything.

**Primary — new investors stepping out of safe instruments.** People already comfortable with Sanchayapatra (government savings certificates) or fixed deposits, who find the stock market intimidating and are afraid of losing savings they worked for. Their blocker is nerve, not information. Both framings are load-bearing in user-facing copy; dropping either one narrows the product.

**User Tiers (Bro vs. Boss):**
- **Bro (Default / Free Forever):** All core trading, live DSE data, orders, portfolio tracking, and charts.
- **Boss (Pro Learning Tier):** Active paper traders looking for advanced risk management, 21-sector DSE exposure, banked realized P&L, commission audit, and +10% bonus coins on balance recharges.

**Secondary — experienced traders testing strategies.** Acknowledged on the About page, but never the audience a decision is optimized for.

**Operator — the maintainer as admin.** A single person reviews the bKash recharge queue, manages Boss tier subscription requests and manual email grants, watches site analytics, and audits balance integrity through `/admin` and `/admin/tier`. This is a real recurring workflow, not an afterthought surface.

## Product Purpose

StockSimulatorBD is a free, risk-free paper-trading simulator for the Dhaka Stock Exchange. Users trade real DSE securities with a virtual, non-monetary balance under the market's actual rules, so the first real trade they ever place is not the first trade they have ever placed.

Success is nerve, not engagement: a user who practices here should approach their first real BO-account trade already familiar with prices, orders, settlement, and their own reaction to a loss. Secondary success is comprehension — the Contentful-backed blog exists to close the gap between "I want to invest" and "I know how to start" (BO accounts, broker selection, DSE mechanics).

## Positioning

**A DSE-native simulator, not a global simulator with Bangladeshi stocks in it.** Nearly every paper-trading platform targets US markets. This one is built around Dhaka's actual mechanics: live prices scraped from the DSE archive, T+1 settlement enforced per purchase lot, 0.4% broker commission, trading confined to DSE hours (10:00–14:15 Dhaka, Friday/Saturday weekend) and Bangladesh public holidays. A neighboring product cannot truthfully copy this without rebuilding for the same market.

**The simulation is authoritative, not decorative.** Trades execute server-side in a Firestore Admin SDK transaction that re-derives price, recomputes commission, and re-enforces every rule — the client is never trusted. This came out of a real incident in which client-writable balances were tampered to absurd values. Integrity of the practice environment is a product commitment, not an implementation detail.

## Operating Context

- **Mid-to-low-end Android phones on mobile data.** This is the real usage scene. Performance budget, offline tolerance (custom service worker, PWA), payload size, and thumb-reachable controls are product constraints, not polish. Bangladeshi carriers NAT large numbers of users behind shared IPs — anything IP-keyed must assume legitimate high-volume shared-IP traffic.
- **Trading is time-boxed by the real market.** The app is only tradeable 10:00–14:15 Dhaka time on non-holiday Sunday–Thursday. Everything outside that window is browsing, learning, and portfolio review — a genuinely different mode of use, and the majority of the clock.
- **bKash is the payment rail people already have.** Recharge runs through a manually reviewed bKash flow (submit transaction ID, admin approves or rejects), not a card processor.
- **Distributed as a website first.** Full PWA, installable on desktop and Android; a TWA-wrapped APK is served statically from `/public` for a native-feeling install. The APK is a wrapper — the design language stays web, not platform-native.

## Capabilities and Constraints

**One currency.** `artifacts/{appId}/users/{uid}/simulator/state.balance` is the real BDT-denominated trading balance — the only one, and the one users mean when they say "my balance" or "my coins." A separate legacy `users/{uid}.coins` gating currency existed early on for "premium"-style features and was removed entirely (code and data) as unused.

**Simulation rules currently enforced:** live DSE prices during market hours; T+1 settlement per purchase lot; 0.4% commission (`COMMISSION_RATE = 0.004`); market-hours and holiday gating on both client and server; a 100,000,000 sane-balance cap re-checked by hand on every privileged write path because Admin SDK writes bypass Firestore rules entirely.

**Virtual economy and account tiers:** new verified accounts receive 10,000 free coins on the default **Bro Tier** (100% free core trading forever). Recharge is 20 BDT per 10,000 coins (500 coins per taka), minimum 20 BDT, maximum 5,000 BDT per request, in multiples of 20, subject to admin approval. Users desiring advanced risk analytics, sector exposure breakdown, and a +10% coin bonus (550 coins per taka) can upgrade to the **Boss Tier** for 20 BDT/month (31 days) or 99 BDT/6 months (185 days) via manual bKash verification at `/boss`. Core simulation mechanics and trading remain 100% free forever. Revenue from recharges and subscriptions is a practice-realism device and project sustainability mechanism, not an aggressive paywall or speculative business model.

**Tamper-proof security guarantees:** Client console writes cannot escalate permissions or alter `accountTier`, `role`, or `bossUntil` because Firestore security rules enforce `protectedUserFields()`. Sensitive analytics (Portfolio Insights & Risk Radar) are isolated server-side and never injected into DOM or memory for Bro accounts.

**Coverage:** all currently tradeable DSE-listed companies (~300+), each with a symbol page carrying candlestick history.

**Regulatory position — non-negotiable.** StockSimulatorBD is not a licensed brokerage, financial adviser, investment adviser, exchange, or depository participant, and is not affiliated with or endorsed by DSE, BSEC, CDBL, or any broker. It gives no personalized investment advice and guarantees no outcome. Coins have no real-world monetary value and cannot be withdrawn, redeemed, transferred, or exchanged. Disclaimers are a permanent part of the product, not a compliance sticker to be designed away.

**Market facts go stale.** Trading hours, settlement arrangements, circuit breakers, lot sizes, broker charges, and holidays change. Content must not present them as timeless, and official sources (DSE, CDBL, BSEC) remain the authority.

**Engineering constraints:** Next.js 16 / React 19 / TypeScript on Vercel, Firebase Auth + Firestore, Contentful for the blog, Python serverless scrapers for market data. Built and maintained solo. **No automated test suite exists** — verification is `tsc --noEmit` plus manual and browser checks, which makes wide, sweeping refactors expensive and risky. Firestore rules deploy manually, separately from Vercel.

**Language:** English is the shipping language today; Bangla UI or bilingual content is a real roadmap item. Future typography, string-length allowances, and font choices should stay compatible with Bangla script rather than assuming Latin-only. Bangla proper nouns already appear in English copy (Sanchayapatra, bKash, Dhaka).

## Brand Commitments

- **Name and domain:** StockSimulatorBD, canonical at `https://www.stocksimulator.tech`. Existing logo and icon set live in `public/logo` and `public/favicon.svg`.
- **Attribution:** built and maintained by Md Al Shahoriar Hossain (`zaifears`), credited on the About page and in metadata. Contact is a real personal email, not a support desk.
- **Voice:** plain, calm, non-condescending English that treats fear of the market as reasonable rather than foolish. Reassuring without ever tipping into a return promise, a hype claim, or anything that reads as advice.
- **Both audiences, always.** Copy that speaks only to students, or only to Sanchayapatra/FDR switchers, is a regression.

## Evidence on Hand

**Real:** live DSE price and candlestick data scraped from the exchange archive; the full tradeable DSE symbol list; published Contentful blog articles (BO account opening, DSE broker comparison, market mechanics); a downloadable Android APK; a working admin analytics stack with genuine visit, retention, geo, device, and recharge figures; public policy, terms, and disclaimer pages; `llms.txt` and `llms-full.txt` site guides.

**Absent — do not fabricate.** No testimonials, no named users, no case studies, no press coverage, no partner or broker endorsements, no funding or team beyond the solo maintainer, no verified user counts, and no performance or outcome benchmarks. The homepage currently carries an unsourced "Join hundreds of learners practicing today" line; treat it as a claim to substantiate from admin analytics or remove, not as evidence to build on.

## Product Principles

1. **Realistic beats forgiving.** Every rule the real market imposes — settlement delay, commission, closed hours, holidays — stays enforced. Removing friction to make practice pleasant would defeat the reason the product exists.
2. **The simulation must be tamper-proof to be worth trusting.** Authority lives server-side. Any privileged write path re-implements its own limits.
3. **Calm the newcomer without ever promising a return.** The emotional job is lowering fear. The hard line is that nothing may read as advice, prediction, or guarantee.
4. **Built for a mid-range phone on mobile data.** If it only feels good on a fast desktop connection, it does not work for the actual audience.
5. **Learning is part of the product, not marketing around it.** The blog and the simulator serve one arc: understand the market, then practice in it, then act in the real one.

## Accessibility & Inclusion

No formal WCAG conformance level has been committed to. Two product-specific needs are established:

- **Performance is an accessibility issue here.** On mid/low-end Android over patchy carrier data, a heavy page is an excluding page. Offline resilience and payload discipline are inclusion requirements.
- **Bangla script must remain possible.** Type and layout decisions should not foreclose the Bangla or bilingual content already on the roadmap.

Financial-literacy level is the defining inclusion factor: users are assumed to be new to markets, so unexplained jargon (T+1, LTP, circuit breaker, BO account) is an access barrier and needs plain-language support wherever it appears.
