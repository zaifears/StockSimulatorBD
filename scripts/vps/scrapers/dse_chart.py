"""
dse_chart.py - DSE Chart Scraper module for VPS daemon
"""

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


def _create_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def fetch_from_new_dse(symbol: str, base_url: str = "https://new.dsebd.org/company") -> list[dict]:
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

    # Search for candle list in unescaped stream: [{"t":"...", "date":"YYYY-MM-DD", ...}]
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
