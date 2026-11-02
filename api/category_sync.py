import gzip
import json
import os
import ssl
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler

# ==============================================================================
# api/category_sync.py
#
# Returns a flat { symbol: category } map (A/B/G/N/Z) and per-category counts.
#
# Source: the same live prices JSON feed market_sync.py reads
# (www.dsebd.org/api/live/prices, apex dsebd.org second) — it carries the
# market category for every instrument in a single response. The old
# per-board PHP pages (latest_share_price_scroll_group.php) were retired by
# DSE and return HTTP 410, so there is no HTML fallback anymore.
# Government Securities (GOVDBT/TBond) are filtered out.
# ==============================================================================

CATEGORIES = ["A", "B", "G", "N", "Z"]
MIN_TOTAL_SYMBOLS = 200

# The second attempt adds a cache-busting query string: all dsebd.org
# hostnames sit behind one CloudFront cache (~15s TTL) that occasionally holds
# a transient empty/partial response, and the query string is part of its
# cache key, so this reaches DSE's origin instead of re-reading that cache.
DSE_API_URLS = [
    "https://www.dsebd.org/api/live/prices",
    "https://dsebd.org/api/live/prices",
]


def _attempt_url(i: int, api_url: str) -> str:
    return api_url if i == 0 else f"{api_url}?_={int(time.time() * 1000)}"
DSE_PAGE_URL = "https://www.dsebd.org/markets/latest-share-price"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)


_SSL_CONTEXT = ssl.create_default_context()


def _create_ssl_context():
    return _SSL_CONTEXT


def _read_response_text(resp) -> str:
    raw = resp.read()
    if resp.headers.get("Content-Encoding", "").lower() == "gzip":
        raw = gzip.decompress(raw)
    return raw.decode("utf-8", errors="ignore")


def is_government_security(code, asset_type="", sector="", board=""):
    code_upper = (code or "").strip().upper()
    asset_upper = (asset_type or "").strip().upper()
    sector_upper = (sector or "").strip().upper()
    board_upper = (board or "").strip().upper()

    if asset_upper in ("GOVDBT", "GSEC", "TBOND"):
        return True
    if sector_upper in ("TBOND", "G-SEC", "TREASURY") or "G-SEC" in sector_upper or "T.BOND" in sector_upper or "TREASURY" in sector_upper:
        return True
    if board_upper in ("YIELDDBT",):
        return True
    if code_upper.startswith("TB") or code_upper.startswith("GSEC") or code_upper.startswith("BGT"):
        return True
    return False


# ------------------------------------------------------------------------------
# Single-Pass Engine (DSE live prices feed)
# ------------------------------------------------------------------------------

def fetch_categories_from_new_dse(api_url=None, timeout=10.0):
    target_api = api_url or DSE_API_URLS[0]
    ctx = _create_ssl_context()
    req = urllib.request.Request(
        target_api,
        headers={
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'Referer': DSE_PAGE_URL
        }
    )
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as res:
        content = _read_response_text(res)
        data = json.loads(content)

    cols = data.get("cols", [])
    rows = data.get("rows", [])
    col_map = {c: i for i, c in enumerate(cols)}

    code_idx = col_map.get("code", 0)
    cat_idx = col_map.get("category", 11)
    board_idx = col_map.get("board", 12)
    sector_idx = col_map.get("sector", 13)
    asset_idx = col_map.get("assetType", 14)

    categories = {}
    counts = {"A": 0, "B": 0, "G": 0, "N": 0, "Z": 0}

    for r in rows:
        if len(r) <= code_idx:
            continue
        symbol = str(r[code_idx]).strip().upper()
        if not symbol or symbol == "TRADING CODE":
            continue

        board = str(r[board_idx]).strip() if len(r) > board_idx else ""
        sector = str(r[sector_idx]).strip() if len(r) > sector_idx else ""
        asset_type = str(r[asset_idx]).strip() if len(r) > asset_idx else ""

        if is_government_security(symbol, asset_type, sector, board):
            continue

        cat = str(r[cat_idx]).strip().upper() if len(r) > cat_idx else ""
        if cat in counts:
            categories[symbol] = cat
            counts[cat] += 1
        elif cat:
            categories[symbol] = cat
            counts[cat] = counts.get(cat, 0) + 1

    if len(categories) < MIN_TOTAL_SYMBOLS:
        raise ValueError(f"New DSE category extraction returned too few symbols ({len(categories)})")

    return {"categories": categories, "counts": counts}


# ------------------------------------------------------------------------------
# Dispatcher & HTTP Handler
# ------------------------------------------------------------------------------

def get_categories(source="auto"):
    """`source` is kept for backward compatibility ("auto" / "new" / "classic")
    but no longer changes anything — the classic boards are gone (HTTP 410)."""
    errors = []
    for i, api_url in enumerate(DSE_API_URLS):
        try:
            res = fetch_categories_from_new_dse(api_url=_attempt_url(i, api_url))
            host = urllib.parse.urlparse(api_url).hostname
            res["source"] = "new-dse-single-pass" if host == "www.dsebd.org" else f"new-dse-single-pass ({host})"
            return res
        except Exception as e:
            errors.append(f"{urllib.parse.urlparse(api_url).hostname}: {e}")

    raise RuntimeError(f"DSE category feed failed on every host ({'; '.join(errors)})")


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(parsed.query)
            source = query.get("source", [None])[0] or os.environ.get("CATEGORY_SYNC_SOURCE", "auto").lower()

            result = get_categories(source=source)
            categories = result["categories"]
            counts = result["counts"]
            engine = result.get("source", "unknown")

            self.send_success_response(categories, counts, engine)

        except Exception as e:
            self.send_error_response(500, f"Category Sync Error: {str(e)}")

    def send_success_response(self, categories, counts, engine="unknown"):
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        payload = {
            "categories": categories,
            "counts": counts,
            "source": engine,
            "totalCategorized": len(categories)
        }
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def send_error_response(self, status, message):
        self.send_response(status)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))
