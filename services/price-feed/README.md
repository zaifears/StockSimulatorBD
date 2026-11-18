# price-feed

The single writer of Firestore `artifacts/{appId}/public/data/market_info/latest`
while DSE is live. It polls DSE every 15–25 s (random), writes the document,
and **only then** serves the same document at `GET /v1/snapshot.json` for
browsers (through Cloudflare). Design, budget and rollout:
[`docs/live-prices-plan.md`](../../docs/live-prices-plan.md).

Runs on the scraper VPS (`dse.shahoriar.bd`), never on the web host, so a move
of the web app (VM ↔ Vercel) changes nothing here.

## What it does, and doesn't do

- Asks DSE only between 09:45 and the close. Overnight and on closed days it
  sends **no** requests, apart from about 12 conditional (`304`) probes
  10:00–14:00 that catch a special working Saturday or a late opening.
- Sends `If-None-Match`; an unchanged feed costs DSE an empty `304` and costs
  us no Firestore write.
- Never retries a `403`/`429`; backs off 1 → 2 → 5 → 10 min and alerts.
- Writes only when the data changed, plus a heartbeat every 5 min while Open.
- Stops writing at `MAX_WRITES_PER_DAY`, or until 08:05 UTC if Firestore
  reports its quota exhausted. Either way `/health` turns `degraded` and
  `/api/stock-sync` resumes on its next tick.
- Same rows as `scripts/vps/scrapers/market_sync.py` + `app/api/stock-sync`
  (government-securities filter, raw-BDT turnover, 7-day carry-forward of
  symbols missing from the pre-open feed). The golden tests prove it.

## Endpoints

| Path | Purpose |
|---|---|
| `GET /v1/snapshot.json` | Last document written to Firestore. `Cache-Control: public, max-age=5, s-maxage=10`, strong `ETag` (= `seq`), `Access-Control-Allow-Origin: *`. `503` until a document exists, and always in dry-run. |
| `GET /health` | `status` = `healthy` / `degraded` / `starting` / `dry-run`, plus counters. `/api/stock-sync` skips its run only on `healthy`. No secrets in it. |

## Develop

```bash
cargo test                       # unit, golden (vs Python) and HTTP tests
cargo clippy --all-targets -- -D warnings
cargo run -- --check-dse         # two requests to DSE, no credentials needed
```

After changing `scripts/vps/scrapers/market_sync.py`, regenerate the golden files and re-run the tests:

```bash
python -I tests/tools/gen_expected.py tests/fixtures/closed_2026-11-18.json tests/fixtures/closed_2026-11-18.expected.json
python -I tests/tools/gen_expected.py tests/fixtures/edge_cases.json tests/fixtures/edge_cases.expected.json
```

## Build for the VPS

Check the target first: `ssh <vps> 'uname -m; free -m'`.

- If it has a GB or more free: install rustup there and run `cargo build --release`.
- Otherwise cross-compile (TLS uses `ring`, so there's no CMake step):
  `cargo zigbuild --release --target aarch64-unknown-linux-gnu` (or `x86_64-unknown-linux-gnu`).

## Install (Phase 2, dry-run)

1. `mkdir ~/price-feed`, copy the binary there, and copy `deploy/env.example` to `~/price-feed/.env` (`chmod 600`).
2. Create a dedicated service account (`roles/datastore.user`). Put its key at
   `~/price-feed/service-account.json` (`chmod 600`).
3. `sudo cp deploy/price-feed.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now price-feed`
4. `curl -s 127.0.0.1:8010/health` should report `"status":"dry-run"`. The dry-run parity log:
   `journalctl -u price-feed -f | grep parity`.
5. Cloudflare (`shahoriar.bd` zone): a proxied `A` record `live` pointing at the VPS. Add
   `deploy/Caddyfile.snippet` to Caddy and reload it.

Go primary (Phase 3) only after the dry run is clean: set `DRY_RUN=0`, restart
before 09:45 on a trading day, then set `PRICE_FEED_HEALTH_URL` on the web app.

**Rollback at any point:** `sudo systemctl stop price-feed`. `/health` becomes
unreachable, so `/api/stock-sync` writes as before on its next tick, and
browsers fall back to Firestore reads.
