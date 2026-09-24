#!/usr/bin/env python3
"""
crawl_fundamentals.py - Resilient Overnight Fundamentals Crawler for DSE Equities.

Crawls company profiles from https://new.dsebd.org/company/{symbol}
Extracts audited valuation ratios, 52-week ranges, shareholding distributions,
and corporate disclosures. Saves atomically to data/fundamentals.json.

Designed to run via systemd timer at 3:00 AM BST on the Oracle VPS.
"""

import argparse
import json
import logging
import os
import re
import sys
import time
import urllib.request
import urllib.error

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("dse_crawler")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
FUNDAMENTALS_FILE = os.path.join(DATA_DIR, "fundamentals.json")
CURSOR_FILE = os.path.join(DATA_DIR, "crawler_cursor.json")

DSE_PRICES_API = "https://new.dsebd.org/api/live/prices"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# Core DSE top symbols fallback in case live prices API is down
TOP_SYMBOLS_FALLBACK = [
    "GP", "BATBC", "SQURPHARMA", "BEXIMCO", "BRACBANK", "RENATA", "LHBL", "ISLAMIBANK",
    "BXPHARMA", "UPGDCL", "BERGERPBL", "MARICO", "EBL", "OLYMPIC", "CITYBANK",
    "WALTONHIL", "IDLC", "PUBALIBANK", "PRIMEBANK", "ALARABANK", "DUTCHBANGL",
    "SUMITPOWER", "TITASGAS", "JAMUNAOIL", "MPETROLEUM", "PADMAOIL", "HEIDELBCEM",
    "LAFSURCEML", "MEGHNACEM", "PREMIERBAN", "DHAKABANK", "EXIMBANK", "FIRSTSBANK",
    "GPHISPAT", "BSRMSTEEL", "BSRMLTD", "ACI", "ACIFORMULA", "BEACONPHAR", "IBNSINA",
]


def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def get_active_symbols():
    """Fetches list of active non-bond DSE stock symbols."""
    try:
        req = urllib.request.Request(DSE_PRICES_API, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        
        symbols = []
        raw_stocks = (data.get("rows") or data.get("data") or []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
        for item in raw_stocks:
            # item can be list or dict
            if isinstance(item, list) and len(item) > 0:
                code = str(item[0]).strip().upper()
                asset_type = str(item[14]).strip().upper() if len(item) > 14 else ""
                sector = str(item[13]).strip().upper() if len(item) > 13 else ""
                if not code.startswith("TB") and "GOV" not in asset_type and "BOND" not in sector:
                    symbols.append(code)
            elif isinstance(item, dict):
                code = str(item.get("code") or item.get("symbol") or "").strip().upper()
                asset_type = str(item.get("assetType") or "").strip().upper()
                sector = str(item.get("sector") or "").strip().upper()
                if code and not code.startswith("TB") and "GOV" not in asset_type and "BOND" not in sector:
                    symbols.append(code)

        if symbols:
            logger.info("Retrieved %d active equity symbols from DSE API", len(symbols))
            return sorted(list(set(symbols)))
    except Exception as e:
        logger.warning("Failed to fetch symbols from %s: %s. Using fallback list.", DSE_PRICES_API, e)

    return sorted(list(set(TOP_SYMBOLS_FALLBACK)))


def extract_rsc_fundamentals(html: str) -> dict | None:
    """Extracts the rich company data object from Next.js RSC Flight chunks."""
    try:
        chunks = re.findall(r'self\.__next_f\.push\(\[1,\s*"(.*?)"\]\)', html, re.DOTALL)
        if not chunks:
            return None

        full_flight = ""
        for c in chunks:
            try:
                unescaped = json.loads('"' + c + '"')
                full_flight += unescaped
            except Exception:
                full_flight += c

        idx = full_flight.find('"marketCap":')
        if idx == -1:
            return None

        start = full_flight.rfind("{", 0, idx)
        depth = 0
        end = -1
        for i in range(start, len(full_flight)):
            if full_flight[i] == "{":
                depth += 1
            elif full_flight[i] == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break

        if start != -1 and end != -1:
            data = json.loads(full_flight[start:end])
            return data
    except Exception as e:
        logger.debug("RSC extraction failed: %s", e)

    return None


def crawl_symbol(symbol: str, retries: int = 3) -> dict | None:
    """Fetches and parses company profile for a single ticker with backoff."""
    url = f"https://new.dsebd.org/company/{symbol}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                html = resp.read().decode("utf-8", errors="replace")

            data = extract_rsc_fundamentals(html)
            if data and data.get("code"):
                # Clean and enrich payload
                data["_scrapedAt"] = int(time.time() * 1000)
                data["_source"] = "new.dsebd.org"
                return data

            logger.warning("[%s] RSC payload not found on attempt %d", symbol, attempt)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                logger.warning("[%s] 404 Not Found on DSE", symbol)
                return None
            logger.warning("[%s] HTTP %d on attempt %d: %s", symbol, e.code, attempt, e)
        except Exception as e:
            logger.warning("[%s] Network error on attempt %d: %s", symbol, attempt, e)

        if attempt < retries:
            time.sleep(attempt * 1.5)

    return None


def load_existing_fundamentals() -> dict:
    """Loads existing fundamentals store or returns empty dict."""
    if os.path.exists(FUNDAMENTALS_FILE):
        try:
            with open(FUNDAMENTALS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Error reading %s: %s", FUNDAMENTALS_FILE, e)
    return {}


def save_atomic_fundamentals(data: dict):
    """Atomically writes fundamentals store via temporary file replacement."""
    ensure_data_dir()
    tmp_file = f"{FUNDAMENTALS_FILE}.tmp.{os.getpid()}"
    try:
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_file, FUNDAMENTALS_FILE)
        logger.info("Atomically saved %d company fundamentals to %s", len(data), FUNDAMENTALS_FILE)
    except Exception as e:
        logger.error("Failed to atomic save %s: %s", FUNDAMENTALS_FILE, e)
        if os.path.exists(tmp_file):
            os.remove(tmp_file)


def run_crawler(limit: int | None = None, single_symbol: str | None = None, force: bool = False, delay: float = 0.3):
    """Executes the crawler across symbols with progress logging and atomic writes."""
    ensure_data_dir()

    if single_symbol:
        symbols = [single_symbol.upper()]
    else:
        symbols = get_active_symbols()

    if limit and limit > 0:
        symbols = symbols[:limit]

    logger.info("Starting crawler run for %d symbols (delay=%.2fs)", len(symbols), delay)
    store = load_existing_fundamentals()
    success_count = 0
    fail_count = 0

    start_time = time.time()
    for idx, sym in enumerate(symbols, 1):
        logger.info("[%d/%d] Crawling %s...", idx, len(symbols), sym)
        result = crawl_symbol(sym)

        if result:
            store[sym] = result
            success_count += 1
        else:
            fail_count += 1

        # Periodic atomic checkpoint every 25 symbols
        if idx % 25 == 0:
            save_atomic_fundamentals(store)

        time.sleep(delay)

    # Final atomic save
    save_atomic_fundamentals(store)
    duration = time.time() - start_time
    logger.info(
        "Crawler completed in %.1fs. Success: %d, Failed: %d, Total in store: %d",
        duration, success_count, fail_count, len(store)
    )

    # Write cursor/telemetry
    cursor_info = {
        "lastRun": int(time.time() * 1000),
        "durationSec": round(duration, 1),
        "totalSymbols": len(symbols),
        "success": success_count,
        "failed": fail_count,
        "totalInStore": len(store)
    }
    with open(CURSOR_FILE, "w", encoding="utf-8") as f:
        json.dump(cursor_info, f, indent=2)

    return cursor_info


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DSE Company Fundamentals Crawler")
    parser.add_argument("--limit", type=int, default=None, help="Max number of symbols to crawl")
    parser.add_argument("--symbol", type=str, default=None, help="Crawl a single symbol (e.g. GP)")
    parser.add_argument("--force", action="store_true", help="Force full refresh")
    parser.add_argument("--delay", type=float, default=0.3, help="Delay between requests in seconds")
    args = parser.parse_args()

    run_crawler(limit=args.limit, single_symbol=args.symbol, force=args.force, delay=args.delay)
