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

## Dry-run tools

- **Parity log:** in dry-run, at most once every `COMPARE_EVERY_SECS` (300), the fresh parse is compared
  with the Python daemon's `/api/market_sync`. Read it with `journalctl -u price-feed | grep parity`. A few
  price differences during the session are timing, because the daemon caches for 15 s. Differences in the
  symbol set or field shape are bugs.
- **Captures:** with `CAPTURE_DIR` set, raw DSE payloads are saved on the first fetch, on every Open/Closed
  change, and every `CAPTURE_EVERY_SECS` (900), up to 300 files. Turn the interesting ones (pre-open with
  bonds missing, open, post-close) into golden fixtures with `tests/tools/gen_expected.py`.
- **Rehearsal** (`REHEARSAL=1`, accepted only with `DRY_RUN=1`): polls on the live 15–25 s schedule
  whatever the clock says, to exercise the loop outside market hours. Run it as a separate transient unit
  with its own env file, because `EnvironmentFile` values beat `-E` overrides:
  `systemd-run --unit=price-feed-rehearsal ... -p EnvironmentFile=<copy with BIND=127.0.0.1:8011, REHEARSAL=1> -p RuntimeMaxSec=130`.
  The first run (2026-11-18 night) gave intervals of 15–25 s, all `304`, and parity of 419/419 with no field differences.

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

The scraper VPS (`zaifears-oracle`, `ubuntu@130.210.33.96`, key `E:\.ssh\ssh-zaifears-oracle.key`) is an
**x86_64, 1 GB RAM** Ubuntu 22.04 box (glibc 2.35) that also runs Uptime Kuma, Vaultwarden and the Python
daemon. **Never build there.** Cross-compile on Windows with Zig (TLS uses `ring`, so there's no CMake step):

```bash
python -m pip install --user ziglang
cargo install cargo-zigbuild --locked
rustup target add x86_64-unknown-linux-gnu
CARGO_ZIGBUILD_ZIG_PATH="$(python -c "import ziglang,os;print(os.path.join(os.path.dirname(ziglang.__file__),'zig.exe'))")" \
  cargo zigbuild --release --target x86_64-unknown-linux-gnu.2.35
```

The output is `target/x86_64-unknown-linux-gnu/release/price-feed` (~6.6 MB). To release it: `scp` it
to `~/price-feed/price-feed.new`, then run `mv` over the old binary and `sudo systemctl restart price-feed`.

## Install (Phase 2, dry-run): done 2026-11-18

Running on the scraper VPS as `price-feed.service` with `DRY_RUN=1`. It uses about 8–13 MB, and
`https://live.shahoriar.bd/health` answers through Cloudflare. The steps, for a rebuild:

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
