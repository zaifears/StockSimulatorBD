import html as html_lib
import json
import os
import re
import ssl
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler

# ==============================================================================
# DSE Market Sync (Dual-Engine Primary Scraper)
#
# Supports both:
# 1. Classic DSE board (https://www.dsebd.org/latest_share_price_scroll_l.php)
# 2. Modern DSE platform (https://new.dsebd.org/markets/latest-share-price)
#    via its live feed (https://new.dsebd.org/api/live/prices).
#
# Key Features:
# - Automatic dual-engine failover: if one platform encounters an outage,
#   network timeout, or low-stock anomaly (< 50 items), the scraper seamlessly
#   falls back to the alternative engine before erroring out.
# - Government Securities Filter: The new DSE platform lists all 634 instruments
#   including 215 Government Securities (Treasury Bonds, e.g. TB10Y...). These
#   are strictly filtered out to maintain pure equity and corporate trading parity.
# - Output schema parity: Exact key/type congruence with app/api/stock-sync/route.ts
#   and the trading engine (symbol, ltp, high, low, close, ycp, change,
#   changePercent, trade, value, volume, traded).
# ==============================================================================

CLASSIC_DSE_URL = "https://www.dsebd.org/latest_share_price_scroll_l.php"
NEW_DSE_BASE_URL = "https://new.dsebd.org"
NEW_DSE_API_URL = "https://new.dsebd.org/api/live/prices"
NEW_DSE_PAGE_URL = "https://new.dsebd.org/markets/latest-share-price"

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
# Classic DSE Helpers & Parser
# ------------------------------------------------------------------------------

MARKET_STATUS_RE = re.compile(r'Market\s*Status\s*:\s*([A-Za-z][A-Za-z \-]{0,30})', re.I)

def extract_market_status(html_text):
    text = html_lib.unescape(re.sub(r'<[^>]+>', ' ', html_text))
    match = MARKET_STATUS_RE.search(text)
    if not match:
        return None
    return ' '.join(match.group(1).split()).split('  ')[0].strip() or None


class DSEMarketParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_td = False
        self.current_cell_data = []
        self.current_row = []
        self.stocks = []

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.current_row = []
        elif tag == 'td':
            self.in_td = True
            self.current_cell_data = []

    def handle_endtag(self, tag):
        if tag == 'td':
            self.in_td = False
            cell_text = "".join(self.current_cell_data).strip().replace(',', '')
            self.current_row.append(cell_text)
        elif tag == 'tr':
            if len(self.current_row) >= 10:
                symbol = self.current_row[1]
                if symbol != 'TRADING CODE' and symbol != '':
                    try:
                        ltp = float(self.current_row[2]) if self.current_row[2] not in ['--', '', '0'] else 0.0
                        high = float(self.current_row[3]) if self.current_row[3] not in ['--', ''] else 0.0
                        low = float(self.current_row[4]) if self.current_row[4] not in ['--', ''] else 0.0
                        close = float(self.current_row[5]) if self.current_row[5] not in ['--', ''] else 0.0
                        ycp = float(self.current_row[6]) if self.current_row[6] not in ['--', ''] else 0.0
                        change = float(self.current_row[7]) if self.current_row[7] not in ['--', ''] else 0.0
                        trade = float(self.current_row[8]) if self.current_row[8] not in ['--', ''] else 0.0
                        value = float(self.current_row[9]) if self.current_row[9] not in ['--', ''] else 0.0
                        volume = float(self.current_row[10]) if len(self.current_row) > 10 and self.current_row[10] not in ['--', ''] else 0.0

                        changePercent = round((change / ycp) * 100, 2) if ycp > 0 else 0.0
                        traded = trade > 0

                        self.stocks.append({
                            "symbol": symbol,
                            "ltp": ltp,
                            "high": high,
                            "low": low,
                            "close": close,
                            "ycp": ycp,
                            "change": change,
                            "changePercent": changePercent,
                            "trade": trade,
                            "value": value,
                            "volume": volume,
                            "traded": traded
                        })
                    except ValueError:
                        pass

    def handle_data(self, data):
        if self.in_td:
            self.current_cell_data.append(data)


# ------------------------------------------------------------------------------
# Modern DSE Helpers & Parser (new.dsebd.org)
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
    Parses the JSON payload returned by https://new.dsebd.org/api/live/prices.
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
            value = float(row[value_idx]) if len(row) > value_idx and row[value_idx] not in ("--", "", None) else 0.0
            volume = float(row[volume_idx]) if len(row) > volume_idx and row[volume_idx] not in ("--", "", None) else 0.0
            raw_pct = float(row[percent_idx]) if len(row) > percent_idx and row[percent_idx] not in ("--", "", None) else 0.0

            # Match exact calculation parity with classic scraper:
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

def _create_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def fetch_new_dse(api_url=None, exclude_gov=True, public_only=False, timeout=20.0):
    """
    Fetches live market data from modern DSE API.
    """
    target_api = api_url or NEW_DSE_API_URL
    ctx = _create_ssl_context()
    req = urllib.request.Request(
        target_api,
        headers={
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
            'Referer': NEW_DSE_PAGE_URL
        }
    )
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as response:
        content = response.read().decode('utf-8', errors='ignore')
        data = json.loads(content)

    stocks, market_status = parse_new_dse_payload(data, exclude_gov=exclude_gov, public_only=public_only)
    if len(stocks) < 50:
        raise ValueError(f"New DSE scraper returned unusually low count ({len(stocks)})")

    return stocks, market_status


def fetch_classic_dse(page_url=None, timeout=30.0):
    """
    Fetches live market data from classic DSE scroll page.
    """
    target_page = page_url or CLASSIC_DSE_URL
    ctx = _create_ssl_context()
    req = urllib.request.Request(
        target_page,
        headers={'User-Agent': USER_AGENT}
    )
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as response:
        html = response.read().decode('utf-8', errors='ignore')

    parser = DSEMarketParser()
    parser.feed(html)

    if len(parser.stocks) < 50:
        raise ValueError(f"Classic DSE scraper returned unusually low count ({len(parser.stocks)})")

    try:
        market_status = extract_market_status(html)
    except Exception:
        market_status = None

    return parser.stocks, market_status


def scrape_market(source="auto", custom_url=None, exclude_gov=True, public_only=False):
    """
    High-level scraper dispatcher with resilient dual-engine auto-failover.
    """
    # 1. Custom URL explicitly targeting new or classic
    if custom_url:
        if "new.dsebd.org" in custom_url:
            # If the user passed the page URL (e.g. /markets/latest-share-price),
            # route to the underlying API endpoint
            target_api = NEW_DSE_API_URL if "markets/latest-share-price" in custom_url else custom_url
            stocks, status = fetch_new_dse(api_url=target_api, exclude_gov=exclude_gov, public_only=public_only)
            return stocks, status, "new-dse-custom"
        else:
            stocks, status = fetch_classic_dse(page_url=custom_url)
            return stocks, status, "classic-dse-custom"

    # 2. Explicit source request
    if source == "new":
        stocks, status = fetch_new_dse(exclude_gov=exclude_gov, public_only=public_only)
        return stocks, status, "new-dse"

    if source == "classic":
        stocks, status = fetch_classic_dse()
        return stocks, status, "classic-dse"

    # 3. Auto mode: check environment preference or try primary with seamless failover
    prefer_new = os.environ.get("DSE_PREFER_NEW", "").lower() in ("1", "true", "yes")

    if prefer_new:
        try:
            stocks, status = fetch_new_dse(exclude_gov=exclude_gov, public_only=public_only)
            return stocks, status, "new-dse"
        except Exception as e:
            # Failover to classic
            stocks, status = fetch_classic_dse()
            return stocks, status, f"classic-dse-fallback (new failed: {str(e)[:100]})"
    else:
        try:
            stocks, status = fetch_classic_dse()
            return stocks, status, "classic-dse"
        except Exception as e:
            # Failover to new
            stocks, status = fetch_new_dse(exclude_gov=exclude_gov, public_only=public_only)
            return stocks, status, f"new-dse-fallback (classic failed: {str(e)[:100]})"


# ------------------------------------------------------------------------------
# HTTP Handler
# ------------------------------------------------------------------------------

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Parse query parameters
            parsed = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(parsed.query)

            custom_url = query.get("url", [None])[0]
            source = query.get("source", [None])[0]

            if not source:
                source = os.environ.get("DSE_SCRAPE_SOURCE", "auto").lower()

            # Gov securities exclusion (defaults to True)
            exclude_gov_param = query.get("exclude_gov", ["true"])[0].lower()
            exclude_gov = exclude_gov_param not in ("false", "0", "no")

            # Public only filter (defaults to False to match LankaBangla & company roster)
            public_only_param = query.get("public_only", ["false"])[0].lower()
            public_only = public_only_param in ("true", "1", "yes")

            stocks, market_status, engine_used = scrape_market(
                source=source,
                custom_url=custom_url,
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