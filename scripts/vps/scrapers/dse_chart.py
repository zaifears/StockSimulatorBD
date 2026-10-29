"""
dse_chart.py - DSE Chart Scraper module for VPS daemon
"""

import gzip
import json
import logging
import re
import ssl
import urllib.request

logger = logging.getLogger("dse_chart")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

COMPANY_BASE_URLS = [
    "https://new.dsebd.org/company",
    "https://www.dsebd.org/company",
]

_SSL_CONTEXT = ssl.create_default_context()
NEXT_F_RE = re.compile(r'self\.__next_f\.push\(\[1,\s*"(.*?)"\]\)', re.DOTALL)
CANDLE_RE = re.compile(r'\[\{\"t\":[^\]]*?\"date\":\"\d{4}-\d{2}-\d{2}\"[^\]]*?\}\]')
CANDLE_FALLBACK_RE = re.compile(r'(\[\{\"t\":[^\}]*?\"date\":.*?\])')


def _create_ssl_context():
    return _SSL_CONTEXT


def _read_response_text(resp) -> str:
    raw = resp.read()
    if resp.headers.get("Content-Encoding", "").lower() == "gzip":
        raw = gzip.decompress(raw)
    return raw.decode("utf-8", errors="replace")


def fetch_from_new_dse(symbol: str, base_url: str = "https://new.dsebd.org/company") -> list[dict]:
    """Extracts daily candles from modern DSE company page RSC flight stream."""
    url = f"{base_url}/{symbol.upper()}"
    ctx = _create_ssl_context()
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept-Encoding": "gzip",
            "Referer": "https://new.dsebd.org/",
        },
    )

    with urllib.request.urlopen(req, context=ctx, timeout=12.0) as resp:
        html = _read_response_text(resp)

    raw_candles = None
    chunks = NEXT_F_RE.findall(html)
    # Fast path: only unescape the chunk that actually contains the candle series
    for c in chunks:
        if '\\"date\\":\\"' in c and '\\"t\\":' in c:
            try:
                u = json.loads('"' + c + '"')
                m = CANDLE_RE.search(u)
                if m:
                    raw_candles = json.loads(m.group(0))
                    break
            except Exception:
                pass

    if raw_candles is None:
        parts = []
        for c in chunks:
            try:
                parts.append(json.loads('"' + c + '"'))
            except Exception:
                parts.append(c)
        full_flight = "".join(parts)

        match = CANDLE_RE.search(full_flight)
        if not match:
            matches = CANDLE_FALLBACK_RE.findall(full_flight)
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


def get_chart_data(symbol: str, days: int = 90) -> list[dict]:
    """Primary chart data fetcher using modern DSE company data with mirror failover."""
    for base_url in COMPANY_BASE_URLS:
        try:
            candles = fetch_from_new_dse(symbol, base_url=base_url)
            if candles:
                return candles
        except Exception as e:
            logger.warning("[%s] Chart fetch failed on %s: %s", symbol, base_url, e)

    return []
