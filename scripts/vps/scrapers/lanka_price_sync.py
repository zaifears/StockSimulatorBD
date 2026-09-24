import html
import json
import ssl
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler

# api/lanka_price_sync.py
# Scraper B of the DSE-market-data-pipeline plan: a price FAILSAFE, not a
# replacement for the primary scraper. app/api/price-failsafe-sync/route.ts
# only ever calls this when api/market_sync.py's heartbeat
# (market_info/latest.lastUpdated) has gone stale — see that route for the
# activation logic and the Resend admin-alert email.
#
# Same source and same fetch/retry/block-detection approach as
# api/lanka_sector_sync.py (Scraper A) — see that file's module docstring for
# the confirmed-scrapable evidence (robots.txt 404s, server-rendered,
# ~2MB page, no JS needed). This scraper reads the same
# id="TableDataMatrix" table but pulls the price columns instead of sector:
#
#   cell 0  Symbol (first <a> in the cell; a second, text-less market-depth
#           icon <a> follows in the same cell — same shape as Scraper A)
#   cell 2  Sector (unused here)
#   cell 3  LTP            cell 8  YCP
#   cell 4  Open            cell 9  Change
#   cell 5  High            cell 10 % Change
#   cell 6  Low             cell 11 Volume (Qty)
#   cell 7  Close           cell 12 Value (Turnover, in mn BDT)
#
# Confirmed against a live fetch (2026-08-27): 413 symbols, header row exactly
# matches this column order, no "--" placeholders observed in the price
# columns (unlike dsebd's board). Cells are still parsed defensively (missing/
# non-numeric -> 0) in case a thinly-traded or off-hours snapshot ever shows
# one.
#
# lankabd has no per-symbol "number of trades today" column, so `trade` is
# always reported as 0 here and `traded` is derived from volume > 0 instead —
# the same "no activity" signal market_sync.py gets from trade > 0, just
# sourced from a different column on this site.
#
# Value(Turnover) is in millions of BDT on this page; converted to raw BDT
# (x 1,000,000) to match the shape of market_sync.py's `value` field. This is
# a secondary/display field only used while the failsafe is briefly active —
# exact unit parity with dsebd's own board is not guaranteed, LTP/OHLC
# accuracy (what trades execute against) is the part that matters and is not
# affected by this.
DATA_MATRIX_URL = "https://lankabd.com/Home/DataMatrix"

# Mirrors lanka_sector_sync.py's floor, reasoning, and value.
MIN_HTML_BYTES = 200_000

# ~413 symbols on the live site as of 2026-08-27 (same table Scraper A reads).
# Set below that so an ordinary handful of missing/malformed rows doesn't
# reject an otherwise-good failsafe snapshot, but a real scrape/layout break
# still gets caught rather than handing the app a half-empty market board.
MIN_TOTAL_SYMBOLS = 200

REQUEST_TIMEOUT_SECONDS = 15.0
MAX_TRANSPORT_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 1.5

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# 0-indexed <td> positions inside a data row, per the table structure above.
CELL_SECTOR = 2
CELL_LTP = 3
CELL_OPEN = 4
CELL_HIGH = 5
CELL_LOW = 6
CELL_CLOSE = 7
CELL_YCP = 8
CELL_CHANGE = 9
CELL_CHANGE_PCT = 10
CELL_VOLUME = 11
CELL_VALUE = 12
LAST_CELL_NEEDED = CELL_VALUE


class BlockedError(Exception):
    """403/429 — a block signal. Don't retry into an active block."""


class TransportError(Exception):
    """Timeout, connection error, or non-block HTTP error after retries."""


def _to_float(text):
    cleaned = (text or "").strip().replace(",", "")
    if cleaned in ("", "--", "-"):
        return 0.0
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


class DataMatrixPriceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_target_table = False
        self.cell_index = -1
        self.in_cell = False
        self.in_symbol_anchor = False
        self.anchor_text_parts = []
        self.cell_text_parts = []
        self.current_symbol = None
        self.symbol_captured = False
        self.cell_values = {}
        self.stocks = []

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            if dict(attrs).get("id") == "TableDataMatrix":
                self.in_target_table = True
            return
        if not self.in_target_table:
            return
        if tag == "tr":
            self.cell_index = -1
            self.current_symbol = None
            self.symbol_captured = False
            self.cell_values = {}
        elif tag == "td":
            self.cell_index += 1
            self.in_cell = True
            self.cell_text_parts = []
        elif tag == "a" and self.in_cell and self.cell_index == 0 and not self.symbol_captured:
            self.in_symbol_anchor = True
            self.anchor_text_parts = []

    def handle_endtag(self, tag):
        if tag == "table":
            self.in_target_table = False
            return
        if not self.in_target_table:
            return
        if tag == "a" and self.in_symbol_anchor:
            text = "".join(self.anchor_text_parts).strip()
            if text:
                self.current_symbol = text.upper()
                self.symbol_captured = True
            self.in_symbol_anchor = False
        elif tag == "td":
            if 0 <= self.cell_index <= LAST_CELL_NEEDED:
                self.cell_values[self.cell_index] = "".join(self.cell_text_parts)
            self.in_cell = False
        elif tag == "tr":
            if self.current_symbol and CELL_LTP in self.cell_values:
                # Filter out Government Securities / Treasury Bonds (G-SEC / T.Bond)
                sector = (self.cell_values.get(CELL_SECTOR) or "").strip()
                if "G-SEC" in sector or "T.Bond" in sector or self.current_symbol.startswith("TB"):
                    return

                ltp = _to_float(self.cell_values.get(CELL_LTP))
                ycp = _to_float(self.cell_values.get(CELL_YCP))
                change = _to_float(self.cell_values.get(CELL_CHANGE))
                change_pct = _to_float(self.cell_values.get(CELL_CHANGE_PCT))
                volume = _to_float(self.cell_values.get(CELL_VOLUME))
                value_mn = _to_float(self.cell_values.get(CELL_VALUE))

                self.stocks.append({
                    "symbol": self.current_symbol,
                    "ltp": ltp,
                    "high": _to_float(self.cell_values.get(CELL_HIGH)),
                    "low": _to_float(self.cell_values.get(CELL_LOW)),
                    "close": _to_float(self.cell_values.get(CELL_CLOSE)),
                    "ycp": ycp,
                    "change": change,
                    "changePercent": change_pct if change_pct else (
                        round((change / ycp) * 100, 2) if ycp > 0 else 0
                    ),
                    "trade": 0,
                    "value": value_mn * 1_000_000,
                    "volume": volume,
                    "traded": volume > 0,
                })

    def handle_data(self, data):
        if self.in_symbol_anchor:
            self.anchor_text_parts.append(html.unescape(data))
        elif self.in_cell:
            self.cell_text_parts.append(data)


def fetch_data_matrix_html() -> str:
    """Same transport contract as lanka_sector_sync.py's fetch: raises
    BlockedError immediately on 403/429, TransportError after retries on
    anything else."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    last_error = None
    for attempt in range(1, MAX_TRANSPORT_ATTEMPTS + 1):
        req = urllib.request.Request(DATA_MATRIX_URL, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                return response.read().decode("utf-8", errors="ignore")
        except urllib.error.HTTPError as e:
            if e.code in (403, 429):
                raise BlockedError(f"HTTP {e.code} from lankabd.com — treating as a block signal")
            last_error = f"HTTP {e.code}"
        except Exception as e:  # noqa: BLE001 — timeout, URLError, reset, etc. all retry the same way
            last_error = str(e)
        if attempt < MAX_TRANSPORT_ATTEMPTS:
            time.sleep(RETRY_BACKOFF_SECONDS * attempt)

    raise TransportError(f"Failed after {MAX_TRANSPORT_ATTEMPTS} attempts: {last_error}")


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            html_text = fetch_data_matrix_html()
        except BlockedError as e:
            self.send_error_response(429, str(e))
            return
        except TransportError as e:
            self.send_error_response(502, str(e))
            return
        except Exception as e:  # noqa: BLE001
            self.send_error_response(502, f"Unexpected transport error: {e}")
            return

        if len(html_text) < MIN_HTML_BYTES:
            self.send_error_response(
                502,
                f"Response body unusually small ({len(html_text)} bytes, expected ~2MB) — "
                f"likely a block/challenge page rather than the real table",
            )
            return

        try:
            parser = DataMatrixPriceParser()
            parser.feed(html_text)
            stocks = parser.stocks
        except Exception as e:  # noqa: BLE001
            self.send_error_response(500, f"Parse failure: {e}")
            return

        if len(stocks) < MIN_TOTAL_SYMBOLS:
            self.send_error_response(
                500,
                f"Parsed only {len(stocks)} symbols (need >= {MIN_TOTAL_SYMBOLS}) — "
                f"table structure likely changed",
            )
            return

        self.send_success_response(stocks)

    def send_success_response(self, stocks):
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"stocks": stocks, "total": len(stocks)}).encode("utf-8"))

    def send_error_response(self, status, message):
        self.send_response(status)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))
