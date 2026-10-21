import json
import re
import ssl
import urllib.request
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

COMPANY_BASE_URLS = [
    "https://new.dsebd.org/company",
    "https://www.dsebd.org/company",
]


def _create_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def fetch_from_modern_dse(symbol: str, base_url: str = "https://new.dsebd.org/company") -> list:
    """Extracts daily candles from modern DSE company page RSC flight stream."""
    url = f"{base_url}/{symbol.upper()}"
    ctx = _create_ssl_context()
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Referer": "https://new.dsebd.org/",
        },
    )

    with urllib.request.urlopen(req, context=ctx, timeout=12.0) as resp:
        html = resp.read().decode("utf-8", errors="replace")

    chunks = re.findall(r'self\.__next_f\.push\(\[1,\s*"(.*?)"\]\)', html, re.DOTALL)
    full_flight = ""
    for c in chunks:
        try:
            unescaped = json.loads('"' + c + '"')
            full_flight += unescaped
        except Exception:
            full_flight += c

    match = re.search(r'\[\{\"t\":[^\]]*?\"date\":\"\d{4}-\d{2}-\d{2}\"[^\]]*?\}\]', full_flight)
    if not match:
        matches = re.findall(r'(\[\{\"t\":[^\}]*?\"date\":.*?\])', full_flight)
        if matches:
            raw_candles = json.loads(matches[0])
        else:
            return []
    else:
        raw_candles = json.loads(match.group(0))

    candles = []
    for item in raw_candles:
        date_str = item.get("date")
        if not date_str:
            continue

        open_val = float(item.get("open", 0.0) or 0.0)
        high_val = float(item.get("high", 0.0) or 0.0)
        low_val = float(item.get("low", 0.0) or 0.0)
        close_val = float(item.get("price", 0.0) or item.get("close", 0.0) or 0.0)
        volume_val = int(float(item.get("volume", 0) or 0))

        if volume_val <= 0 and open_val <= 0:
            continue

        candles.append({
            "date": date_str,
            "open": open_val,
            "high": high_val,
            "low": low_val,
            "close": close_val,
            "volume": volume_val,
        })

    return candles


def get_chart_data(symbol: str) -> list:
    last_error = None
    for base_url in COMPANY_BASE_URLS:
        try:
            candles = fetch_from_modern_dse(symbol, base_url=base_url)
            if candles:
                return candles
        except Exception as e:
            last_error = e
    if last_error:
        raise last_error
    return []


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        symbol = query.get('symbol', [None])[0]

        if not symbol:
            self.send_error_response(400, "Symbol required")
            return

        try:
            chart_data = get_chart_data(symbol)
            if not chart_data:
                self.send_error_response(404, "No data found")
                return

            self.send_success_response(chart_data)
        except Exception as e:
            self.send_error_response(500, f"Scraper Error: {str(e)}")

    def send_success_response(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_response(self, status, message):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode('utf-8'))
