# Live prices every ~20 seconds: production plan

Status: **Phase 1 built** (2026-11-18): `services/price-feed/` (Rust, 38 tests), plus the standby rule in
`app/api/stock-sync/route.ts`, which does nothing until `PRICE_FEED_HEALTH_URL` is set.
**Phase 2 started 2026-11-18:** the service runs in dry-run on the scraper VPS (x86_64, 1 GB, ~8–13 MB RSS) behind
`live.shahoriar.bd` (Cloudflare proxied, Full (strict), origin certificate). Its first real session is 2026-11-19.
Verified the same night: the Firestore write path (a full copy written to a throwaway document, read back identical, deleted;
encoding identical to stock-sync's), the Cloudflare cache rule (MISS → HIT → EXPIRED at 10 s), and Telegram.
Tables are in `services/price-feed/README.md`.

**What tomorrow's dry run decides:** whether the parity log stays clean through a real pre-open, open and close,
and whether the schedule follows DSE's day. If it does, Phase 3 (the service writes) can go ahead.
**Still to build before users see 20-second prices:** Phase 4 (slippage guard in the trade route) and Phase 5 (client polling of
the snapshot). Both are code in the web app, independent of the dry-run result.
Goal: prices on `/trade`, `/stocks/*` and `/portfolio` refresh every 15–25 s during
the DSE session, with **no gap between the price a trader sees and the price a
trade fills at**, inside the Firebase Spark free tier, and still working if the
web app ever moves back to Vercel Hobby.

---

## 0. Dry run, day 1 (Thursday 2026-11-19): results

| Question | Result |
|---|---|
| Parser matches Python? | **Yes, bit for bit.** 17 captured payloads (pre-open → close), 6,765 rows. 3 of them are now golden fixtures. The live parity log matched symbol sets in all ~45 checks; 11 showed live-field differences only, which is the daemon's 15 s cache (offline comparison of the same payloads is exact). |
| Schedule follows DSE's day? | **Yes.** 09:45 warmup (60 s), DSE Open seen at 10:01:01, live 10:01–14:00 (714 gaps: min 15.0 s, max 25.2 s, mean 20.1 s), closing tail to 14:15, then sleep until 09:45 Friday. 747 DSE requests, 0 errors, 0 refusals, 0 restarts. |
| How often does DSE's data really change? | **About every 2 minutes** (median 119 s, 125 updates in the session, 30–33 per hour). The 15 s is only CloudFront's cache time. **Prices cannot be fresher than ~2 min from this feed**, whatever we poll. Still far better than today (3-min cron + 3-min client read = up to ~6 min). |
| Firestore writes it would have made | **132** for the whole day (0 heartbeats needed). The 1,500 cap is ~11× that. |
| Bonds missing from the feed | **22 bonds/debentures are absent for the whole session**, not just pre-open (`*PBOND`, `DEB*`, `BANKASI1PB`). They return at 14:00. Carry-forward kept all 419 in every document, as stock-sync already does. `BEXGSUKUK` and `IBBL2PBOND` are missing pre-open only. |
| Production | Unaffected: `/api/health` healthy all day, stock-sync last wrote at 14:57. |
| Seen in passing | ~14:54 DSE briefly served **0 rows**. The Python daemon logged an error and served its cache. price-feed was asleep by then; its < 50-row guard would have treated it as a transient failure. |

**Verdict:** the parsing and the schedule are ready for Phase 3. Before Phase 3:
1. Deploy the web app so `/api/stock-sync` has the standby rule (blocked on 2026-11-18; needs the owner's go-ahead).
2. ~~Adaptive polling~~ **done (4.4.26)**: simulated on Thursday's real timeline, 718 → 384 requests per session (−47%), mean lag 10.3 → 10.0 s.
   Also fixed: heartbeats now cover the whole 10:00–14:15 session clock on trading days, not only while DSE says Open,
   and a weekday DSE never opens is probed every 10 min. Without this, a long halt or an unlisted closure would have let
   `lastUpdated` age past 15 min and set off price-failsafe-sync and `/api/health`, which stock-sync's 3-min rewrites always prevented.
   Original note: **adaptive polling.** After a change, wait ~90 s, then poll every 15 s until the next change.
   That's about 3–4 requests per DSE update instead of ~6: roughly **450 instead of 750 DSE requests a day**, with the same or better
   detection lag (~8 s). It's kinder to DSE and to the shared VPS IP.
3. Flip `DRY_RUN=0` before 09:45 on a trading day (next one: Sunday 2026-11-22), then set `PRICE_FEED_HEALTH_URL` on the web app.

Still open: Friday's 09:45 request shows whether DSE reports `tradingDay: false` on weekends. It runs on its own tomorrow; check
`journalctl -u price-feed --since today`.

---

## 1. Decisions in one screen

| Question | Decision |
|---|---|
| Who fetches DSE? | **One** process, the new `price-feed` service on the scraper VPS (`dse.shahoriar.bd`). Nothing else polls DSE every 20 s. |
| How often? | Every **15–25 s, random** (uniform), **only while DSE is live** (pre-open at 09:45 through the post-close fetch). **No requests at all overnight or on closed days**, apart from a few cheap `304` checks between 10:00 and 14:00 that catch a special Saturday or a late opening (§4a). |
| How do we stay polite? | Conditional GET with `If-None-Match` (DSE answers `304`, verified), one fetcher, back off on `403`/`429`. Randomizing the interval is fine, but it isn't what protects us. |
| What is the source of truth? | **Firestore `market_info/latest`, unchanged.** The service is not a second database. It keeps a copy of the last document it wrote. |
| How do we avoid a mismatch? | **Write Firestore first, publish second.** A price reaches browsers only after it's in Firestore. The trade route keeps reading Firestore. A slippage guard covers the last second of gap. |
| How do browsers get prices? | **v1: poll a Cloudflare-cached `snapshot.json` every 20 s.** SSE is an optional v2, only if measurements justify it (see §6). |
| Rust? | Yes, for `price-feed`: one small static binary doing fetch → transform → Firestore REST write → serve snapshot. No Firebase Admin SDK needed. |
| What if the service dies? | The existing `/api/stock-sync` cron takes over within about 2 minutes, and browsers fall back to today's Firestore read every 3 min. **Stopping the service is the rollback.** |
| What about a move back to Vercel? | Nothing in this design runs on the web host. The service lives on the scraper VPS, and the trade route only reads Firestore. A move changes nothing here. |

---

## 2. Answer: is a random 15–25 s interval a good idea?

Yes. It's cheap and it causes no problems on our side. Be clear about what it does
and doesn't do:

- **What it does:**
  - Cuts requests about 25% compared with a fixed 15 s (average 20 s, so ~900 requests per trading day).
  - Keeps us from fetching in lockstep with crons that fire on the minute.
- **What it doesn't do:** hide us. A rate-based WAF counts requests per window. Anyone
  reading DSE's logs sees one IP calling every ~20 s either way. The real protections:
  1. **A single fetcher.** Today the Python daemon runs `uvicorn --workers 2` and each
     worker keeps its own 15 s cache, so DSE can see 2 requests per window. The VM's
     `fetchDseDirect` fallback is a second IP. After this change, only `price-feed`
     polls at speed.
  2. **Conditional requests.** `GET /api/live/prices` returns
     `ETag` and `Cache-Control: public, max-age=10, s-maxage=15`. Sending
     `If-None-Match` got a **`304`** (tested 2026-11-18). An unchanged feed then costs DSE
     almost nothing, and costs us **no Firestore write**.
  3. **Session-only polling.** Nothing between the post-close fetch and 09:45 the next
     day. On closed days, only the handful of `304` checks in §4a.
  4. **Backing off when told to.** On `403`/`429`, wait 1 → 2 → 5 → 10 min and alert. Never retry
     a `403` with the cache-busting query string, because that query string goes past their cache to their servers.
  5. **No evasion.** No rotating IPs, no proxy pools. A well-behaved single client is the
     defensible position. If DSE blocks it anyway, we fall back to lankabd and
     ask them, rather than work around a block.
- **Evidence that DSE does filter clients:** a plain `curl` (default user agent) got
  `403 Error from cloudfront`, while the browser user agent our scrapers already send got `200`.
  So they run a WAF. Rates matter, so keep ours boring.
- **Cost of the randomness:** displayed price age becomes 0–25 s (our interval) plus
  0–15 s (DSE's CDN cache): about 20 s typical, about 40 s worst case. DSE itself updates no faster than about
  15 s, so a fixed interval wouldn't be meaningfully fresher. Tests must not assume
  fixed timing.

---

## 3. What I measured (2026-11-18)

| Fact | Value | Why it matters |
|---|---|---|
| DSE feed | `{cols, rows[629], session}`, ~59 KB JSON | 629 rows before the TBond filter, ~400 after |
| DSE caching | `s-maxage=15`, weak `ETag`, `304` works | Sets the freshness floor; makes conditional GET possible |
| VPS `/api/market_sync` body | ~74 KB | ≈ size of `market_info/latest` |
| Scraper VPS | not behind Cloudflare (`Via: 1.1 Caddy`, no `cf-ray`), daemon ~21 MB | The snapshot needs a Cloudflare-proxied hostname |
| Web VM | 956 MB, Next ~180 MB RSS, 421 MB free | Not touched by this plan |
| Today's client read | `getDoc(market_info/latest)` every 180 s per visible tab ([useSimulator.ts:184](../hooks/useSimulator.ts)) | Grows with users, ~75 KB of Firestore egress each time |
| Today's writer | `/api/stock-sync`, external cron, ~3 min, `set()` whole doc ([stock-sync/route.ts:239](../app/api/stock-sync/route.ts)) | Becomes the fallback |
| `stock-sync` market-hours guard | **None**: it scrapes and writes on every tick, at any hour, unless the cron itself is limited to session hours (check in Phase 0) | Could be ~480 DSE requests + ~480 Firestore writes a day spent overnight. The standby rule (§4 rule 5) removes them |
| `shahoriar.bd` | On Cloudflare (`milan`/`teresa.ns.cloudflare.com`). `dse.shahoriar.bd` is **DNS-only** (grey cloud, straight to `130.210.33.96`), so it gets no edge cache | The snapshot host needs a **proxied** record |

**Readers of `market_info/latest`** (all keep working unchanged):
`app/api/simulator/trade` (fill price + `marketStatus`/`lastUpdated` for the open
check), `lib/dseStocks.ts` (10-min server cache for stock pages), `app/api/health`,
`app/api/price-failsafe-sync` (treats `lastUpdated` older than 15 min as "primary dead"),
`hooks/useSimulator.ts` (client display).

---

## 4. Architecture

```
                       DSE www.dsebd.org/api/live/prices
                                  │  1 conditional GET every 15–25 s (session only)
                                  ▼
   scraper VPS  ┌──────────────────────────────────────────────┐
                │ price-feed (Rust, systemd, MemoryMax=64M)      │
                │  1 fetch → 2 transform (same rules as today)   │
                │  3 if changed: Firestore REST write ──────────────┐
                │  4 on write OK: swap in-memory snapshot        │  │
                │  GET /v1/snapshot.json  GET /health            │  │
                └──────────────────────────────────────────────┘  │
                          ▲ origin (Caddy)                         ▼
   Cloudflare   live.shahoriar.bd (proxied, s-maxage=10)          Firestore
                          ▲                                        market_info/latest
   browsers     poll every 20 s while visible ─────── fallback: getDoc every 180 s
                                                                   ▲
   web app      trade route reads Firestore (unchanged) ───────────┘
   (VM or Vercel)  /api/stock-sync cron = standby writer (skips while feed is healthy)
```

### Rules the writer must follow

1. **Firestore first, then publish.** The new snapshot is served only after the
   Firestore write returns OK. If the write fails, keep serving the previous
   snapshot, so browsers never see a price trades can't use.
2. **Same document shape.** Same fields as `stock-sync` writes (`stocks`, `lastUpdated`,
   `totalStocks`, `marketStatus`, `source`), plus `source: "price-feed"`, `seq` (always increasing:
   fetch time in ms) and `etag`. Raw BDT turnover (no `valueMn`), TBond and government-security
   filter, carry-forward for missing bonds (`missingSince`, 7-day expiry): all the same
   rules as `market_sync.py` + `stock-sync/route.ts`, proven by golden tests (§9).
3. **Write only on change.** A `304`, or an identical rows hash, means no write.
4. **Heartbeat (only while `LIVE`).** If nothing has changed for 5 min, write anyway (refreshing
   `lastUpdated`) so the trade route's 20-min status check and the failsafe's 15-min
   staleness alarm keep treating the feed as alive. This costs at most 12 writes an hour on a frozen day.
5. **Standby cron.** Before scraping, `/api/stock-sync` calls `price-feed`'s `GET /health`
   (2 s timeout, no Firestore cost). If it answers `healthy`, whether it's actively polling or idle
   because the market is closed, the cron returns 200 without fetching or writing. If the
   service is unreachable or unhealthy, the cron runs exactly as today. This also ends the
   overnight scraping the cron does now. The URL comes from `PRICE_FEED_HEALTH_URL`; while it's
   unset, the rule is off, so it can ship **before** the feed goes primary.
6. **Daily write budget, enforced in the service:** stop writing after `MAX_WRITES_PER_DAY`
   (start at 1,500), alert, and leave the cron to cover. Firestore on Spark fails hard
   at the quota, and **Spark quotas reset at midnight Pacific = 14:00 Dhaka (13:00 in
   US summer time), in the middle of the session.** Running out at 12:00 means two hours of
   failed writes across the whole app (trades included), not just prices.

### 4a. When to fetch: knowing whether DSE is live

You can't know the market is open without asking DSE. The cheapest way to ask is a
conditional GET: when nothing has changed, DSE answers `304` with an empty body, and the
status we parsed last time (`session.isOpen`) still holds. The service runs this daily
state machine (Dhaka time, every day of the week, Fridays and Saturdays included):

| State | When | Requests to DSE | Writes |
|---|---|---|---|
| `SLEEP` | after the closing tail → 09:45 next day | **none** | none |
| first poll | 09:45 every day | one request: reads `session.tradingDay`, `isOpen`, today's closing time | on change |
| `WARMUP` | DSE says `tradingDay: true` (or Sun–Thu if it hasn't said), 09:45–10:30, not yet Open | every 60 s | on change |
| `PROBE` | Fri/Sat or `tradingDay: false`, or a weekday that didn't open by 10:30 | conditional GET at 10:00, 10:05, 10:15, 10:30, then every 30 min to 14:00: **12 a day including 09:45, nearly all `304`** | none, unless DSE says Open |
| `LIVE` | DSE reports `Open`, from any state | every 15–25 s, random | on change + 5-min heartbeat |
| `CLOSING` | was Open today, now isn't | every 60 s until DSE's closing time (a halt), then 15 more minutes | final write with `Closed` |
| hard stop | 14:45 | none, even if DSE is stuck on `Open` | none |

**Built differently from the first draft (2026-11-18):** the feed itself carries
`session.tradingDay` and today's `opening`/`closing`/`postClosing` times (today: 10:00 / 14:00 / 14:10).
So the service needs **no copy of the holiday calendar**: DSE tells it at 09:45 whether today
is a trading day. On a `304`, `tradingDay` is not re-applied, because an unchanged Saturday
feed still carries Thursday's value. Whether DSE sets `tradingDay: false` on weekends and holidays
is **not yet observed**. Capture a Friday fixture to confirm. If it doesn't, Sun–Thu holidays cost
about 45 conditional requests (09:45–10:30) before dropping to probes.

**Noticed in passing:** DSE's own session now closes at 14:00, while the trade route accepts
orders until 14:15. Orders after 14:00 fill at the closing price. That's a separate decision, outside this plan.

- **Special Saturday / surprise opening:** a `PROBE` that sees `Open` switches to `LIVE` within
  5 min of the opening (at worst 30 min, if DSE opens after 10:30). The first write
  carries the fresh `Open` status, so the trade route's existing rule (DSE's own status
  ≤ 20 min old outranks the weekend rule and the holiday calendar, in `marketHours.ts`)
  allows trading with no other change. That's how special Saturdays already work, just faster.
- **Scheduled holiday that DSE opens anyway:** same path as above.
- **Calendar says open but DSE stays closed** (an unlisted holiday, an emergency closure):
  `EXPECTED` keeps getting `304`s and "Closed". After 10:30 the service drops to the
  `PROBE` schedule, so it never polls a closed market at full speed for long.
- **Trading halt mid-session:** DSE reports something other than `Open`, and the service
  moves to `CLOSING`-style 60 s polling until 14:45 or until `Open` comes back.
- **`marketStatus` after close:** the final write records `Closed`, so the app never
  shows "Open" overnight.
- **Reading the session state:** use the same `session.isOpen` field `market_sync.py`
  reads today. Capture fixtures of the `Pre Open`, `Open`, `Closed` and halted states during Phase 2
  if they can be seen.

---

## 5. No mismatch between screen and fill

- The screen shows only snapshots that are already in Firestore (rule 1). Cloudflare can
  serve one that's up to 10 s old, so the screen can be **older** than Firestore, never newer.
- **Slippage guard** in `app/api/simulator/trade/route.ts`:
  - The client sends `quotedPrice` (the price on screen).
  - The server **still fills at the Firestore price**, exactly as today. `quotedPrice` is only compared,
    never used to fill, so the price-tampering fix stays intact.
  - If `|fill − quoted| > max(0.5% × quoted, ৳0.10)`, it returns `409 { error, currentPrice }`
    and the trade modal shows "Price moved to ৳X, confirm?". Confirming re-submits with the new quote.
  - **Why the ৳0.10 floor:** DSE prices move in ৳0.10 ticks (verify in Phase 1). Below ৳20, one tick
    is already more than 0.5% (at ৳3.20 it's 3.1%), so a pure 0.5% rule would interrupt every
    trade in a cheap stock whenever it moved at all. With the floor, the rule is 0.5% on anything ≥ ৳20
    and "more than one tick" below that.
  - Requests without `quotedPrice` (old cached clients) behave exactly as today.
- The client ignores any snapshot whose `seq` is lower than the one it holds (CDN or
  fallback reordering).
- The trade response already returns the executed price. Show that in the confirmation, not
  the quote.

---

## 6. Why v1 is CDN polling, not SSE

I earlier suggested SSE. For this app, a cached JSON file polled every 20 s is the better first ship:

| | Poll `snapshot.json` via Cloudflare | SSE stream |
|---|---|---|
| Freshness | ≤ 20 s + 10 s edge | ~1 s after write |
| Real gain over polling | none (DSE itself is ~15 s) | ~10 s on average |
| Origin load | ~1 request / 10 s per Cloudflare location, whatever the user count | 1 open connection per tab |
| Works through Messenger/Instagram in-app browsers, corporate proxies | yes | sometimes buffered or cut |
| Cloudflare Free 100 s timeout | not relevant | needs heartbeats, reconnect logic |
| Code | `fetch()` + existing `MarketInfo` type | `EventSource`, delta merging, `Last-Event-ID` resync |
| Rollback | stop the service: clients fall back | same, plus clients reconnecting in a loop |

**Revisit SSE (v2) only if** you want updates faster than ~15 s (not possible from this
feed) or Cloudflare analytics show the polling egress is a problem. The service can add an
`/v1/stream` endpoint later without changing anything else.

Snapshot endpoint details:
- `GET https://live.shahoriar.bd/v1/snapshot.json`. It's on the `shahoriar.bd` zone so it
  survives leaving `stocksimulator.tech` (planned in ~5 months). The site's own domain can change
  without touching it, because the snapshot is served with `Access-Control-Allow-Origin: *`.
- Body: exactly the document last written to Firestore
- Headers: `Cache-Control: public, max-age=5, s-maxage=10`, a strong `ETag` (= `seq`), `Access-Control-Allow-Origin: *`.
  `*` is safe here because the data is public, read-only and sent without credentials. Cloudflare doesn't vary its cache on `Origin`, so a
  per-origin allow-list would break.
- Cloudflare (`shahoriar.bd` zone): a new **proxied** `A` record `live` → `130.210.33.96`, and a cache
  rule for that hostname that respects origin headers. Leave `dse.shahoriar.bd` DNS-only as it is,
  so its analytics and crawler endpoints don't change. Caddy on the VPS gets a `live.shahoriar.bd` site
  that proxies to `127.0.0.1:8010`. Use a Cloudflare Origin Certificate, or keep Caddy's automatic HTTPS
  with the zone's SSL mode on Full (strict).
- About 15 KB compressed. A tab kept open through the whole session downloads about 4 MB. Polling
  pauses when the tab is hidden.

---

## 7. Firebase Spark budget

Spark daily limits: **50k reads, 20k writes, 20k deletes**. Monthly: **10 GiB egress**, 1 GiB stored.

| Item | Today | After |
|---|---|---|
| Price writes | ~100/day (cron every 3 min) | ≤ ~900 (only on change) + heartbeats; capped at 1,500 |
| Client display reads | visible tabs × 20/hour. Example: 100 tabs × 4.5 h = **9,000 reads/day** | ~0 (only when the snapshot fails) |
| Egress from those reads | 9,000 × ~75 KB ≈ **675 MB/day ≈ 20 GB/month: over the 10 GiB limit at that traffic** | ~0 (served by Cloudflare, not Firestore) |
| Trade reads | 1 doc read (~75 KB) per trade | unchanged |
| Storage | unchanged (same doc overwritten) | unchanged |

The "today" column is an example, not a measurement. **Phase 0 records the real
numbers from the Firebase console** (Usage tab) before anything changes. If current egress
is already near 10 GiB/month, this change is the fix, not a risk.

Firestore's soft limit of ~1 sustained write per second per document isn't a concern at 1 per 20 s.

---

## 8. Vercel Hobby portability

| If the web app moves back to Vercel | Effect |
|---|---|
| Long-lived connections (SSE) | Not needed in v1. In v2 they'd still live on the VPS, never in a function. |
| Hobby crons run at most once per day | The standby cron is already external, so this doesn't change. |
| Function duration / compute budget | The trade route does the same work as today (+1 comparison). |
| `NEXT_PUBLIC_LIVE_SNAPSHOT_URL` | Same env var on Vercel, same value. |

The design depends only on: Firestore, the scraper VPS, Cloudflare. If the scraper VPS
is lost, the app degrades to today's behaviour automatically.

---

## 9. The Rust service (`services/price-feed/`)

- **Crates:** `tokio`, `axum`, `reqwest` (rustls, gzip), `serde`/`serde_json`,
  `gcp_auth` (service-account → OAuth token), `tracing`, `rand`, `sha2`. Firestore is
  written with one REST call (`PATCH …/documents/artifacts/{appId}/public/data/market_info/latest`),
  so no community Firestore crate and no Admin SDK.
- **Expected size:** ~600–900 lines, ~5–15 MB RSS. Set `MemoryMax=64M` in systemd.
- **Configuration (env):** `APP_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `MAX_WRITES_PER_DAY`,
  `TELEGRAM_*`, `UPTIME_KUMA_PUSH_URL`, `BIND=127.0.0.1:8010`.
- **Credentials:** a **dedicated** Google service account with `roles/datastore.user`,
  separate from the Next app's. Firestore IAM can't scope a key to one document, but
  this key can be revoked on its own. Key file `0600`, outside the repo.
- **Build:** check the scraper VPS architecture first (`uname -m`; Ampere A1 is `aarch64`).
  If it has spare RAM, `cargo build --release` on the box is simplest. Otherwise
  `cargo zigbuild --target <arch>-unknown-linux-musl` locally, or GitHub Actions.
- **Tests (`cargo test`, the first real test suite in the repo):**
  - Golden fixtures captured from the live feed: pre-open (bonds missing), open, post-close, empty
    `rows`, `403` body. Expected output = what `stock-sync` writes today.
  - Parity script: run the TS transform and the Rust transform on the same fixture, diff the output.
  - Unit tests for: carry-forward expiry, TBond filter, the "write-first-then-publish" ordering (a failed
    write must not publish), the budget cap, the backoff schedule.

### Failure handling

| Failure | Behaviour |
|---|---|
| DSE timeout / 5xx | One retry with the cache-busting query string, then wait for the next tick |
| DSE 403 / 429 | No cache-busting retry. Back off 1 → 2 → 5 → 10 min. Telegram alert after the 2nd |
| DSE returns < 50 rows | Treat as a failure (same rule as `market_sync.py`), don't write |
| Firestore write error | Keep the old snapshot. Retry next tick. Alert after 5 in a row |
| `RESOURCE_EXHAUSTED` (quota) | Stop writing until 14:00 Dhaka / midnight PT. Alert immediately |
| Daily budget reached | Same as above, our own cap |
| Service crash | systemd restarts it. The cron covers after 120 s |
| Scraper VPS down | Cron writes via `dse-direct`. Clients fall back to Firestore reads |
| DSE frozen (304 for hours) | Heartbeat write every 5 min. Prices stay correct |

### Observability

- `GET /health` → `{status, lastFetchAt, lastFetchStatus, lastWriteAt, writesToday,
  consecutiveFailures, dseMarketStatus, seq}`. Uptime Kuma keyword monitor on `"healthy"`.
- Push to the existing Uptime Kuma push URL after each successful write. It alarms if silent for 3 min during the session.
- One structured log line per tick to journald.

---

## 10. Rollout (no swaps during DSE hours, per the existing deploy rule)

| Phase | Work | Done when | Rollback |
|---|---|---|---|
| **0. Baseline** | Record Firebase usage (reads, writes, egress per day for 7 days), the doc size, the scraper VPS arch/RAM, and who calls `/api/stock-sync` and how often | Numbers in this doc | n/a |
| **1. Build** | Rust service + golden/parity tests + state-machine tests (§4a, including a Saturday `PROBE` → `LIVE` case and a calendar-open-but-closed case). Standby rule in `stock-sync` (deploy it; it has no effect while `PRICE_FEED_HEALTH_URL` is unset) | `cargo test` green, parity diff empty, `pnpm type-check` clean | revert commit |
| **2. Shadow** | Run the service **dry-run** for 2 sessions: fetch + transform + log a diff against `latest`, **no writes** | No field diffs beyond timing; DSE never answered 403/429 | stop service |
| **3. Primary writer** | Flip to writing, before 09:45 on a trading day. Clients unchanged (still 3-min reads, now fresher) | 3 sessions: no failsafe alarms, writes ≤ budget, trade route healthy | `systemctl stop price-feed`: the cron resumes in ≤ 120 s |
| **4. Slippage guard** | Server accepts optional `quotedPrice` (backward compatible), then the client sends it | No accidental 409s with the guard on | revert, harmless |
| **5. Client polling** | `NEXT_PUBLIC_LIVE_SNAPSHOT_URL`: poll every 20 s while visible; fall back to `getDoc` every 180 s if the snapshot fails 3× or is > 3 min old in session | Firestore display reads ~0, prices ~20 s fresh on `/trade`, `/stocks/*`, `/portfolio` | unset the env var + redeploy, or stop the service (clients fall back) |
| **6. Docs** | Update AGENTS.md (market feeds section, single writer, budget, live host) | merged | n/a |
| v2 (optional) | SSE endpoint | only if §6 criteria are met | n/a |

---

## 11. Decisions and open questions

Decided (2026-11-18):
- Slippage: 0.5%, with a one-tick (৳0.10) floor (§5).
- Hostname: `live.shahoriar.bd`, proxied (§6).
- No scraping while the market is closed. Special openings are caught by `304` probes (§4a).
- Rust, not Python.

Still open (each one blocks a later phase, not Phase 1):
1. **Scraper VPS architecture and free RAM** (blocks Phase 2's binary): `uname -m`, `free -m`.
2. **Who calls `/api/stock-sync`, and is the cron limited to session hours?** (Phase 0)
3. **Real Firebase usage** (blocks setting `MAX_WRITES_PER_DAY` before Phase 3).
4. ~~`.vercelignore`: add `services/`~~ (done).
5. **Does DSE report `tradingDay: false` on Fri/Sat/holidays?** Capture a fixture on Friday (`cargo run -- --check-dse`).

## Assumptions

- The DSE session is 10:00–14:30 Dhaka, Sun–Thu, plus special working days (from `marketHours.ts`).
- The scraper VPS has steady outbound access to DSE, as `market_sync.py` does today.
- Nothing else writes `market_info/latest` except `stock-sync` and, during outages, `price-failsafe-sync`.
