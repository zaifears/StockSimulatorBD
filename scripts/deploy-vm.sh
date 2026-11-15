#!/usr/bin/env bash
# Release to the Oracle VM (shaho-shoily) with the bundle proven BEFORE the live
# service is touched. Run from Git Bash at the repo root:
#
#   bash scripts/deploy-vm.sh              build, stage, smoke-test, swap, purge cache
#   bash scripts/deploy-vm.sh --stage-only build, stage and smoke-test only (live site untouched)
#   bash scripts/deploy-vm.sh --skip-build reuse the existing .next (must be a SELF_HOST=1 build)
#   bash scripts/deploy-vm.sh --force      allow a swap during DSE trading hours
#
# Why this exists: the manual procedure stops the service first and only then
# finds out whether the new bundle starts. A bad bundle (missing server.js or
# node_modules) crash-loops in front of users. Here the new release is extracted
# to releases/next, booted on a spare port, and only swapped in after it answers.
# The swap itself is a few seconds; if the new release fails its check after the
# swap, the previous one is put back automatically.
set -euo pipefail

VM_HOST="${VM_HOST:-ubuntu@129.225.126.188}"
VM_KEY="${VM_KEY:-/e/.ssh/ssh-shaho-shoily-2026-11-14.key}"
CF_TOKEN_FILE="${CF_TOKEN_FILE:-/e/.ssh/cloudflare-token.txt}"
CF_ZONE_NAME="${CF_ZONE_NAME:-stocksimulator.tech}"
SITE_URL="${SITE_URL:-https://www.stocksimulator.tech}"
REMOTE_ROOT="stocksimulator-web/releases"

STAGE_ONLY=0; SKIP_BUILD=0; FORCE=0
for arg in "$@"; do
  case "$arg" in
    --stage-only) STAGE_ONLY=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --force) FORCE=1 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/.."
SSH=(ssh -i "$VM_KEY" -o ConnectTimeout=20 "$VM_HOST")

# ── 1. Do not swap while people are trading (Sun-Thu 10:00-14:30 Dhaka) ──────
if [ "$STAGE_ONLY" = 0 ] && [ "$FORCE" = 0 ]; then
  dow=$(TZ=Asia/Dhaka date +%u)   # 1=Mon ... 7=Sun
  hm=$((10#$(TZ=Asia/Dhaka date +%H%M)))
  if [ "$dow" != 5 ] && [ "$dow" != 6 ] && [ "$hm" -ge 955 ] && [ "$hm" -le 1430 ]; then
    echo "DSE session is open in Dhaka. Deploy after 14:30, or pass --force." >&2
    exit 1
  fi
fi

# ── 2. Build locally (never on the 1 GB VM) ──────────────────────────────────
if [ "$SKIP_BUILD" = 0 ]; then
  SELF_HOST=1 pnpm build
fi
for f in .next/standalone/server.js .next/standalone/package.json .next/standalone/.next/BUILD_ID .next/static; do
  [ -e "$f" ] || { echo "Missing $f - is this a SELF_HOST=1 build?" >&2; exit 1; }
done

# ── 3. Stage and upload ──────────────────────────────────────────────────────
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/release"
cp -r .next/standalone/.next "$STAGE/release/.next"
cp .next/standalone/server.js .next/standalone/package.json "$STAGE/release/"
rm -rf "$STAGE/release/.next/static"
cp -r .next/static "$STAGE/release/.next/static"
cp -r public "$STAGE/release/public"
tar -czf "$STAGE/release.tgz" -C "$STAGE/release" .
echo "Bundle: $(du -h "$STAGE/release.tgz" | cut -f1)"
scp -i "$VM_KEY" -o ConnectTimeout=20 "$STAGE/release.tgz" "$VM_HOST:$REMOTE_ROOT/incoming.tgz"

# ── 4. On the VM: extract to releases/next, boot it on a spare port ──────────
"${SSH[@]}" "STAGE_ONLY=$STAGE_ONLY bash -s" <<'REMOTE'
set -euo pipefail
cd ~/stocksimulator-web/releases
ENV_FILE="$HOME/stocksimulator-web/.env"
SMOKE_UNIT=stocksimulator-smoke
SMOKE_PORT=3011

wait_for() { # url, seconds
  for _ in $(seq 1 "$2"); do
    [ "$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$1" || true)" = 200 ] && return 0
    sleep 1
  done
  return 1
}

rm -rf next && mkdir next
tar -xzf incoming.tgz -C next && rm -f incoming.tgz
for f in next/server.js next/package.json next/.next/BUILD_ID next/.next/static next/public; do
  [ -e "$f" ] || { echo "Bundle is missing $f - live site untouched." >&2; exit 1; }
done
[ -d current/node_modules/next ] || { echo "current/node_modules/next missing - cannot reuse node_modules." >&2; exit 1; }
cp -al current/node_modules next/node_modules
# Keep the old build's chunks so tabs opened before the release keep working.
cp -an current/.next/static/. next/.next/static/ 2>/dev/null || true

sudo systemctl stop "$SMOKE_UNIT" 2>/dev/null || true
sudo systemctl reset-failed "$SMOKE_UNIT" 2>/dev/null || true
sudo systemd-run --quiet --unit="$SMOKE_UNIT" --uid=ubuntu \
  -p WorkingDirectory="$PWD/next" -p EnvironmentFile="$ENV_FILE" -p MemoryMax=400M \
  -E NODE_ENV=production -E PORT=$SMOKE_PORT -E HOSTNAME=127.0.0.1 -E NEXT_TELEMETRY_DISABLED=1 \
  /opt/node/bin/node --max-old-space-size=300 server.js
smoke_ok=1
wait_for "http://127.0.0.1:$SMOKE_PORT/" 40 || smoke_ok=0
[ "$smoke_ok" = 1 ] && { wait_for "http://127.0.0.1:$SMOKE_PORT/api/health" 20 || smoke_ok=0; }
[ "$smoke_ok" = 1 ] && { wait_for "http://127.0.0.1:$SMOKE_PORT/stocks/gp" 20 || smoke_ok=0; }
if [ "$smoke_ok" = 0 ]; then
  echo "Smoke test FAILED - live site untouched. Last log lines:" >&2
  sudo journalctl -u "$SMOKE_UNIT" -n 25 --no-pager >&2 || true
fi
sudo systemctl stop "$SMOKE_UNIT" 2>/dev/null || true
# The smoke run created next/.next/cache; drop it so the release starts clean.
rm -rf next/.next/cache
[ "$smoke_ok" = 1 ] || exit 1
echo "Smoke test passed (/, /api/health, /stocks/gp)."

if [ "$STAGE_ONLY" = 1 ]; then
  echo "Stage-only: release left in releases/next, live site untouched."
  exit 0
fi

# ── 5. Swap (the only window where the site is down: a few seconds) ─────────
sudo systemctl stop stocksimulator-web
rm -rf prev
mv current prev
mv next current
sudo systemctl start stocksimulator-web
if wait_for "http://127.0.0.1:3010/" 40 && wait_for "http://127.0.0.1:3010/api/health" 20; then
  echo "Release is live."
else
  echo "New release failed after swap - rolling back." >&2
  sudo systemctl stop stocksimulator-web
  mv current "failed-$(date +%s)"
  mv prev current
  sudo systemctl start stocksimulator-web
  wait_for "http://127.0.0.1:3010/" 40 && echo "Rolled back to the previous release." >&2
  exit 1
fi
REMOTE

[ "$STAGE_ONLY" = 1 ] && exit 0

# ── 6. Purge the Cloudflare cache (token is read, never printed) ─────────────
if [ -f "$CF_TOKEN_FILE" ]; then
  token="$(tr -d '\r\n ' < "$CF_TOKEN_FILE")"
  zone="$(curl -s -H "Authorization: Bearer $token" \
    "https://api.cloudflare.com/client/v4/zones?name=$CF_ZONE_NAME" \
    | sed -n 's/.*"result":\[{"id":"\([a-f0-9]*\)".*/\1/p')"
  if [ -n "$zone" ]; then
    curl -s -X POST -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
      --data '{"purge_everything":true}' \
      "https://api.cloudflare.com/client/v4/zones/$zone/purge_cache" \
      | grep -q '"success":true' && echo "Cloudflare cache purged." || echo "Cloudflare purge FAILED - purge it by hand." >&2
  else
    echo "Could not resolve the Cloudflare zone - purge the cache by hand." >&2
  fi
else
  echo "No Cloudflare token file - purge the cache by hand." >&2
fi

echo "Public check: $(curl -s -o /dev/null -m 20 -w '%{http_code}' -A 'Mozilla/5.0' "$SITE_URL/")"
