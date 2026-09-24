import html
import json
import ssl
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler

# api/lanka_sector_sync.py
# Scraper A of the DSE-market-data-pipeline plan: a slow-moving reference
# sync, not a price feed. Scrapes lankabd.com's DataMatrix board
# (https://lankabd.com/Home/DataMatrix) for each DSE symbol's industry
# sector and returns a flat { symbol: sector } map. DSE's own public boards
# (dsebd.org, scraped by api/market_sync.py and api/category_sync.py) never
# publish a sector/industry field — lankabd.com is the only source that
# does, so this is intentionally a separate site from the market-category
# (A/B/G/N/Z) sync, not a duplicate of it.
#
# Confirmed scrapable (2026-08-24): robots.txt 404s, the page carries
# <meta name="robots" content="index,follow">, no login wall, and the whole
# ~413-row table is server-rendered into the initial HTML — a bare GET with
# just a User-Agent returned every symbol in one response, no JS execution
# or pagination needed (the "Show N" control is client-side DataTables.js
# over data that's already fully present). Only two <table> tags exist on
# the whole page (a small layout table earlier, then this one), so unlike
# category_sync.py's malformed-tbody situation, tracking <table>/</table>
# start/end tags alone is enough to scope the parser safely here.
#
# Table structure (id="TableDataMatrix"): each <tr>'s first <td> holds an
# <a href="/Company/OverviewV2?...">SYMBOL</a> followed by a second,
# text-less market-depth icon anchor in that same cell — which is why the
# parser takes the *first* anchor with non-empty text rather than just "the
# first anchor". The third <td> (0-indexed cell 2) holds the plain-text
# sector name (e.g. "Ceramics Sector", "Bank", "Food &amp; Allied"), which
# already matches the site's own canonical sector-dropdown values 1:1, so
# it's stored verbatim (HTML-unescaped) rather than renamed/normalized.
DATA_MATRIX_URL = "https://lankabd.com/Home/DataMatrix"

# ~413 symbols on the live site as of 2026-08-24. A response far short of
# that means the scrape broke (layout change, WAF challenge page, partial
# render) — abort rather than write a partial map over a good one. Sector
# reclassification is real but rare (an occasional AGM-driven move), never a
# mass same-day shift, so a hard floor this low only ever trips on a genuine
# scrape failure, matching api/category_sync.py's MIN_TOTAL_SYMBOLS reasoning.
MIN_TOTAL_SYMBOLS = 100

# A healthy response is ~2MB (the table itself is the bulk of the page). A
# WAF challenge/interstitial page is typically a few KB to a few tens of KB
# — checking this before parsing catches that case even though a challenge
# page would also fail the MIN_TOTAL_SYMBOLS check on its own (0 rows),
# because a bare row-count failure reads as "parse failure" in logs when the
# real cause is "we got blocked", and those need different follow-up.
MIN_HTML_BYTES = 200_000

REQUEST_TIMEOUT_SECONDS = 15.0
MAX_TRANSPORT_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 1.5

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


class BlockedError(Exception):
    """403/429 — a block signal. Don't retry into an active block."""


class TransportError(Exception):
    """Timeout, connection error, or non-block HTTP error after retries."""


class DataMatrixSectorParser(HTMLParser):
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
        self.current_sector = None
        self.sectors = {}

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
            self.current_sector = None
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
            if self.cell_index == 2:
                self.current_sector = html.unescape("".join(self.cell_text_parts).strip())
            self.in_cell = False
        elif tag == "tr":
            if self.current_symbol and self.current_sector:
                # Filter out Government Securities / Treasury Bonds (G-SEC / T.Bond)
                if "G-SEC" not in self.current_sector and "T.Bond" not in self.current_sector and not self.current_symbol.startswith("TB"):
                    self.sectors[self.current_symbol] = self.current_sector

    def handle_data(self, data):
        if self.in_symbol_anchor:
            self.anchor_text_parts.append(data)
        elif self.in_cell:
            self.cell_text_parts.append(data)


def fetch_data_matrix_html() -> str:
    """Returns the raw HTML body. Raises BlockedError immediately on a 403/429
    (retrying into an active block just extends it), or TransportError after
    MAX_TRANSPORT_ATTEMPTS on a timeout / connection error / other HTTP
    status — matching the transport-failure vs blocking-signal distinction
    called for in the pipeline plan."""
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
            parser = DataMatrixSectorParser()
            parser.feed(html_text)
            sectors = parser.sectors
        except Exception as e:  # noqa: BLE001
            self.send_error_response(500, f"Parse failure: {e}")
            return

        if len(sectors) < MIN_TOTAL_SYMBOLS:
            self.send_error_response(
                500,
                f"Parsed only {len(sectors)} symbols (need >= {MIN_TOTAL_SYMBOLS}) — "
                f"table structure likely changed",
            )
            return

        self.send_success_response(sectors)

    def send_success_response(self, sectors):
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"sectors": sectors, "total": len(sectors)}).encode("utf-8"))

    def send_error_response(self, status, message):
        self.send_response(status)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))
