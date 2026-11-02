import gzip
import json
import os
import ssl
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler

# ==============================================================================
# DSE Market Sync
#
# Source: DSE's live prices JSON feed on www.dsebd.org (the apex dsebd.org is
# tried second). dsebd.org, www.dsebd.org and new.dsebd.org are all the same
# CloudFront distribution serving identical data, so only the canonical host
# is used. The old PHP scroll board (latest_share_price_scroll_l.php) was
# retired by DSE and returns HTTP 410, so there is no HTML fallback anymore.
#
# - Government Securities Filter: Strictly filters out all 215 Treasury Bonds
#   (assetType: GOVDBT, sector: TBond, board: YIELDDBT, code prefix TB) to
#   maintain pure equity and corporate trading parity.
# - Value (Turnover) unit normalization: Converts DSE's millions-of-BDT value
#   field into raw BDT (x 1,000,000) to match lanka_price_sync.py and UI fmtCompact().
# - Real-time session state: Extracts exchange matching engine status ("Open" / "Closed")
#   from session.isOpen, including on government-declared working Saturdays.
# ==============================================================================

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

DEFAULT_NEW_COLS = [
    "code", "ltp", "ycp", "open", "high", "low", "close",
    "volume", "value", "trades", "percent", "category",
    "board", "sector", "assetType"
]

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

# ------------------------------------------------------------------------------
# DSE Live Prices Parser
# ------------------------------------------------------------------------------

def is_government_security(code, asset_type="", sector="", board=""):
    """
    Multi-guard check for Bangladesh Government Securities (Treasury Bonds, G-SEC).
    Identifies and excludes all 215 DSE Treasury Bonds across assetType,
    sector, board, and code prefix.
    """
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


def parse_new_dse_payload(data, exclude_gov=True, public_only=False):
    """
    Parses the JSON payload returned by https://www.dsebd.org/api/live/prices.
    """
    cols = data.get("cols") or DEFAULT_NEW_COLS
    rows = data.get("rows") or []
    col_map = {col: i for i, col in enumerate(cols)}

    code_idx = col_map.get("code", 0)
    ltp_idx = col_map.get("ltp", 1)
    ycp_idx = col_map.get("ycp", 2)
    high_idx = col_map.get("high", 4)
    low_idx = col_map.get("low", 5)
    close_idx = col_map.get("close", 6)
    volume_idx = col_map.get("volume", 7)
    value_idx = col_map.get("value", 8)
    trades_idx = col_map.get("trades", 9)
    percent_idx = col_map.get("percent", 10)
    board_idx = col_map.get("board", 12)
    sector_idx = col_map.get("sector", 13)
    asset_idx = col_map.get("assetType", 14)

    stocks = []
    for row in rows:
        if len(row) <= code_idx:
            continue
        symbol = str(row[code_idx]).strip().upper()
        if not symbol or symbol == "TRADING CODE":
            continue

        board = str(row[board_idx]).strip() if len(row) > board_idx else ""
        sector = str(row[sector_idx]).strip() if len(row) > sector_idx else ""
        asset_type = str(row[asset_idx]).strip() if len(row) > asset_idx else ""

        # Filter out government securities if requested
        if exclude_gov and is_government_security(symbol, asset_type, sector, board):
            continue

        # If caller strictly requested PUBLIC board equities/funds only
        if public_only and board != "PUBLIC":
            continue

        try:
            ltp = float(row[ltp_idx]) if len(row) > ltp_idx and row[ltp_idx] not in ("--", "", "0", None) else 0.0
            high = float(row[high_idx]) if len(row) > high_idx and row[high_idx] not in ("--", "", None) else 0.0
            low = float(row[low_idx]) if len(row) > low_idx and row[low_idx] not in ("--", "", None) else 0.0
            close = float(row[close_idx]) if len(row) > close_idx and row[close_idx] not in ("--", "", None) else 0.0
            ycp = float(row[ycp_idx]) if len(row) > ycp_idx and row[ycp_idx] not in ("--", "", None) else 0.0
            trade = float(row[trades_idx]) if len(row) > trades_idx and row[trades_idx] not in ("--", "", None) else 0.0
            value_mn = float(row[value_idx]) if len(row) > value_idx and row[value_idx] not in ("--", "", None) else 0.0
            # Convert DSE value (in millions of BDT) to raw BDT (x 1,000,000)
            value = round(value_mn * 1_000_000, 2)
            volume = float(row[volume_idx]) if len(row) > volume_idx and row[volume_idx] not in ("--", "", None) else 0.0
            raw_pct = float(row[percent_idx]) if len(row) > percent_idx and row[percent_idx] not in ("--", "", None) else 0.0

            # When traded: change = (ltp - ycp) if ltp > 0 else (close - ycp)
            if trade > 0 or ltp > 0:
                change = round(ltp - ycp, 2) if ltp > 0 else round(close - ycp, 2)
                change_percent = round(raw_pct, 2)
            else:
                change = 0.0
                change_percent = 0.0

            traded = trade > 0

            stocks.append({
                "symbol": symbol,
                "ltp": ltp,
                "high": high,
                "low": low,
                "close": close,
                "ycp": ycp,
                "change": change,
                "changePercent": change_percent,
                "trade": trade,
                "value": value,
                "volume": volume,
                "traded": traded
            })
        except (ValueError, TypeError):
            continue

    # Real-time session state direct from the exchange's matching engine
    session = data.get("session") or {}
    market_status = None
    if isinstance(session, dict) and "isOpen" in session:
        market_status = "Open" if session.get("isOpen") else "Closed"

    return stocks, market_status


# ------------------------------------------------------------------------------
# Fetchers
# ------------------------------------------------------------------------------

ALLOWED_DSE_HOSTS = ("www.dsebd.org", "dsebd.org")


def _validate_dse_url(url: str) -> str:
    """Validates that the target URL uses HTTPS and targets an allowlisted DSE host."""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https":
        raise ValueError(f"Disallowed URL scheme: {parsed.scheme!r} (only 'https' is permitted)")
    host = (parsed.hostname or "").lower()
    if host not in ALLOWED_DSE_HOSTS:
        raise ValueError(f"Disallowed target host: {host!r} (allowed: {ALLOWED_DSE_HOSTS})")
    if parsed.username or parsed.password:
        raise ValueError("URL credentials are not permitted")
    return url


_SSL_CONTEXT = ssl.create_default_context()


def _create_ssl_context():
    return _SSL_CONTEXT


def _read_response_text(response) -> str:
    raw = response.read()
    if response.headers.get("Content-Encoding", "").lower() == "gzip":
        raw = gzip.decompress(raw)
    return raw.decode("utf-8", errors="ignore")


def fetch_new_dse(api_url=None, exclude_gov=True, public_only=False, timeout=10.0):
    """
    Fetches live market data from DSE's live prices API.
    """
    target_api = _validate_dse_url(api_url or DSE_API_URLS[0])
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
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as response:
        content = _read_response_text(response)
        data = json.loads(content)

    stocks, market_status = parse_new_dse_payload(data, exclude_gov=exclude_gov, public_only=public_only)
    if len(stocks) < 50:
        raise ValueError(f"New DSE scraper returned unusually low count ({len(stocks)})")

    return stocks, market_status


def scrape_market(source="auto", custom_url=None, exclude_gov=True, public_only=False):
    """
    Fetches DSE live prices, trying each dsebd.org hostname in turn.

    `source` is accepted for backward compatibility with older callers
    ("auto" / "new" / "classic") but no longer changes anything: the classic
    PHP board is gone (HTTP 410), so there is only one engine.
    """
    if custom_url:
        stocks, status = fetch_new_dse(api_url=custom_url, exclude_gov=exclude_gov, public_only=public_only)
        return stocks, status, "dse-custom"

    errors = []
    for i, api_url in enumerate(DSE_API_URLS):
        try:
            stocks, status = fetch_new_dse(api_url=_attempt_url(i, api_url), exclude_gov=exclude_gov, public_only=public_only)
            host = urllib.parse.urlparse(api_url).hostname
            return stocks, status, "new-dse" if host == "www.dsebd.org" else f"new-dse ({host})"
        except Exception as e:
            errors.append(f"{urllib.parse.urlparse(api_url).hostname}: {e}")

    raise RuntimeError(f"DSE live prices failed on every host ({'; '.join(errors)})")


# ------------------------------------------------------------------------------
# HTTP Handler
# ------------------------------------------------------------------------------

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(parsed.query)

            source = query.get("source", [None])[0]

            if not source:
                source = os.environ.get("DSE_SCRAPE_SOURCE", "auto").lower()

            exclude_gov_param = query.get("exclude_gov", ["true"])[0].lower()
            exclude_gov = exclude_gov_param not in ("false", "0", "no")

            public_only_param = query.get("public_only", ["false"])[0].lower()
            public_only = public_only_param in ("true", "1", "yes")

            stocks, market_status, engine_used = scrape_market(
                source=source,
                exclude_gov=exclude_gov,
                public_only=public_only
            )

            self.send_success_response(stocks, market_status, engine_used)

        except Exception as e:
            self.send_error_response(500, f"DSE Sync Error: {str(e)}")

    def send_success_response(self, data, market_status=None, engine_used=None):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        payload = {
            "stocks": data,
            "marketStatus": market_status,
            "source": engine_used,
            "totalStocks": len(data)
        }
        self.wfile.write(json.dumps(payload).encode('utf-8'))

    def send_error_response(self, status, message):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode('utf-8'))
