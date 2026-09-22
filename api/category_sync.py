import json
import os
import ssl
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler

# ==============================================================================
# api/category_sync.py
#
# Scrapes each DSE market-category board (A, B, G, N, Z) and returns a flat
# { symbol: category } map and counts.
#
# Upgraded with modern DSE architecture:
# - Primary Engine (Instant Single-Pass): Queries https://new.dsebd.org/api/live/prices
#   where market categories (A, B, N, Z) are available for all instruments in a single
#   high-speed CloudFront-cached JSON response (< 200ms).
# - Fallback Engine (Multi-Threaded Classic): Scrapes each classic HTML board
#   (https://www.dsebd.org/latest_share_price_scroll_group.php?group=X) via
#   ThreadPoolExecutor across A/B/G/N/Z boards if the modern API is unreachable.
# - Government Securities Filter: Automatically filters out Treasury Bonds (GOVDBT/TBond).
# ==============================================================================

CATEGORIES = ["A", "B", "G", "N", "Z"]
MIN_TOTAL_SYMBOLS = 200

NEW_DSE_API_URL = "https://new.dsebd.org/api/live/prices"
NEW_DSE_PAGE_URL = "https://new.dsebd.org/markets/latest-share-price"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

REQUEST_TIMEOUT_SECONDS = 12.0
MAX_ATTEMPTS_PER_CATEGORY = 3
RETRY_BACKOFF_SECONDS = 1.5


def _create_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


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
# Modern Single-Pass Engine (new.dsebd.org)
# ------------------------------------------------------------------------------

def fetch_categories_from_new_dse(timeout=15.0):
    ctx = _create_ssl_context()
    req = urllib.request.Request(
        NEW_DSE_API_URL,
        headers={
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
            'Referer': NEW_DSE_PAGE_URL
        }
    )
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as res:
        content = res.read().decode('utf-8', errors='ignore')
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
# Classic Multi-Threaded HTML Engine (dsebd.org)
# ------------------------------------------------------------------------------

class CategoryTableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_table = False
        self.symbols = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "table" and "shares-table" in (attrs_dict.get("class") or ""):
            self.in_table = True
        elif tag == "a" and self.in_table:
            href = attrs_dict.get("href") or ""
            if "displayCompany.php" in href:
                query = urllib.parse.urlparse(href).query
                name = urllib.parse.parse_qs(query).get("name", [None])[0]
                if name:
                    self.symbols.append(name.strip().upper())

    def handle_endtag(self, tag):
        if tag == "table" and self.in_table:
            self.in_table = False


def fetch_category_once(group: str, ctx: ssl.SSLContext) -> list:
    url = f"https://www.dsebd.org/latest_share_price_scroll_group.php?group={group}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, context=ctx, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        html = response.read().decode("utf-8", errors="ignore")
    parser = CategoryTableParser()
    parser.feed(html)
    return parser.symbols


def fetch_category_with_retry(group: str, ctx: ssl.SSLContext) -> tuple:
    last_error = None
    for attempt in range(1, MAX_ATTEMPTS_PER_CATEGORY + 1):
        try:
            symbols = fetch_category_once(group, ctx)
            return (group, symbols, None)
        except Exception as e:
            last_error = str(e)
            if attempt < MAX_ATTEMPTS_PER_CATEGORY:
                time.sleep(RETRY_BACKOFF_SECONDS)
    return (group, [], last_error)


def fetch_all_categories_classic() -> dict:
    ctx = _create_ssl_context()
    categories = {}
    counts = {}
    errors = {}

    with ThreadPoolExecutor(max_workers=len(CATEGORIES)) as pool:
        futures = [pool.submit(fetch_category_with_retry, group, ctx) for group in CATEGORIES]
        for future in as_completed(futures):
            group, symbols, error = future.result()
            counts[group] = len(symbols)
            if error:
                errors[group] = error
            for symbol in symbols:
                categories[symbol] = group

    if errors:
        raise ValueError(f"Failed to fetch {len(errors)} category boards: {errors}")

    if len(categories) < MIN_TOTAL_SYMBOLS:
        raise ValueError(f"Classic category scraper returned too few symbols ({len(categories)})")

    return {"categories": categories, "counts": counts}


# ------------------------------------------------------------------------------
# Dispatcher & HTTP Handler
# ------------------------------------------------------------------------------

def get_categories(source="auto"):
    if source == "new":
        res = fetch_categories_from_new_dse()
        res["source"] = "new-dse-single-pass"
        return res

    if source == "classic":
        res = fetch_all_categories_classic()
        res["source"] = "classic-dse-multi-thread"
        return res

    # Auto mode: try fast modern API first, seamlessly fall back to classic if needed
    try:
        res = fetch_categories_from_new_dse()
        res["source"] = "new-dse-single-pass"
        return res
    except Exception as e:
        res = fetch_all_categories_classic()
        res["source"] = f"classic-dse-fallback (new failed: {str(e)[:80]})"
        return res


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
