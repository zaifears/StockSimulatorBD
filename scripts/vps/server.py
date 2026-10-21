#!/usr/bin/env python3
"""
server.py - Production VPS Daemon for StockSimulatorBD

Serves:
1. High-speed market sync, category sync, chart data, sector sync, and price failsafe.
2. Static cache mirror for DSE company fundamentals (/api/fundamentals).
3. System health telemetry (/health) for Uptime Kuma monitoring.
4. On-demand crawler management (/api/crawler/trigger).

Runs as a systemd service (stocksimulator-daemon) behind Caddy on port 8005.
"""

import json
import logging
import os
import re
import subprocess
import sys
import threading
import time
import urllib.request
from typing import Any, Optional

import psutil
from fastapi import FastAPI, HTTPException, Header, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add scrapers directory to module path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(SCRIPT_DIR, "scrapers"))

import category_sync
import dse_chart
import firebase_telemetry
import lanka_price_sync
import lanka_sector_sync
import market_sync

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [vps_daemon] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("vps_daemon")

START_TIME = time.time()
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
FUNDAMENTALS_FILE = os.path.join(DATA_DIR, "fundamentals.json")
CURSOR_FILE = os.path.join(DATA_DIR, "crawler_cursor.json")

BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

# In-memory cached fundamentals with mtime tracking
_cached_fundamentals = {}
_cached_fundamentals_mtime = 0

app = FastAPI(
    title="StockSimulatorBD VPS Daemon",
    description="High-performance background synchronization and fundamentals cache engine",
    version="1.1.0",
)

# Enable CORS for Next.js frontend and edge calls
# allow_credentials=False allows wildcard "*" origin to work seamlessly with navigator.sendBeacon
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_cached_fundamentals() -> dict:
    """Reads fundamentals.json from disk with memory cache invalidated by mtime."""
    global _cached_fundamentals, _cached_fundamentals_mtime
    if not os.path.exists(FUNDAMENTALS_FILE):
        return {}

    try:
        current_mtime = os.path.getmtime(FUNDAMENTALS_FILE)
        if current_mtime != _cached_fundamentals_mtime:
            with open(FUNDAMENTALS_FILE, "r", encoding="utf-8") as f:
                _cached_fundamentals = json.load(f)
            _cached_fundamentals_mtime = current_mtime
            logger.info("Reloaded fundamentals cache: %d symbols", len(_cached_fundamentals))
    except Exception as e:
        logger.error("Error reading %s: %s", FUNDAMENTALS_FILE, e)

    return _cached_fundamentals


def verify_secret_if_configured(auth_header: Optional[str] = None, api_key: Optional[str] = None):
    expected = os.environ.get("CRON_SECRET")
    if not expected:
        return True  # If not set in environment, allow local calls

    bearer_token = auth_header.replace("Bearer ", "").strip() if auth_header else None
    if bearer_token == expected or api_key == expected:
        return True

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


# ── Health & Telemetry ─────────────────────────────────────────────────────────

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    """Uptime Kuma & server monitoring health check."""
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    uptime_sec = int(time.time() - START_TIME)

    cursor_data = None
    if os.path.exists(CURSOR_FILE):
        try:
            with open(CURSOR_FILE, "r", encoding="utf-8") as f:
                cursor_data = json.load(f)
        except Exception:
            pass

    fundamentals = get_cached_fundamentals()
    disk = psutil.disk_usage("/")

    return {
        "status": "healthy",
        "service": "stocksimulator-vps",
        "uptimeSeconds": uptime_sec,
        "memoryMb": round(mem_info.rss / (1024 * 1024), 1),
        "cpuPercent": process.cpu_percent(interval=None),
        "diskFreeGb": round(disk.free / (1024 * 1024 * 1024), 1),
        "fundamentalsCount": len(fundamentals),
        "lastCrawl": cursor_data,
        "timestamp": int(time.time() * 1000),
    }


# ── Market Sync Endpoints ─────────────────────────────────────────────────────

@app.get("/api/market_sync")
def api_market_sync(
    source: str = Query("auto", description="Scrape source: auto, new, or classic"),
    url: Optional[str] = Query(None, description="Custom scrape URL"),
    exclude_gov: bool = Query(True, description="Exclude Treasury bonds"),
    public_only: bool = Query(False, description="Filter public board only"),
):
    try:
        stocks, status_val, engine = market_sync.scrape_market(
            source=source,
            custom_url=url,
            exclude_gov=exclude_gov,
            public_only=public_only,
        )
        return {
            "stocks": stocks,
            "marketStatus": status_val,
            "source": engine,
            "totalStocks": len(stocks),
        }
    except Exception as e:
        logger.error("market_sync failed: %s", e)
        raise HTTPException(status_code=500, detail=f"DSE Market Sync Error: {str(e)}")


@app.get("/api/category_sync")
def api_category_sync(
    source: str = Query("auto", description="Scrape source: auto, new, or classic"),
):
    try:
        res = category_sync.get_categories(source=source)
        return res
    except Exception as e:
        logger.error("category_sync failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Category Sync Error: {str(e)}")


_chart_cache: dict[str, tuple[list[dict[str, Any]], float]] = {}
_chart_lock = threading.Lock()
CHART_TTL_SEC = 180.0  # 3 minutes


def _persist_chart_to_firestore_async(sym: str, chart_data_list: list[dict[str, Any]]):
    def _worker():
        try:
            db = firebase_telemetry.get_prod_db()
            db.collection("stock_charts").document(sym).set({
                "chartData": chart_data_list,
                "lastUpdated": int(time.time() * 1000),
                "isScraping": False,
                "lockTime": 0,
            })
        except Exception as exc:
            logger.debug("Optional Firestore chart backup skipped for %s: %s", sym, exc)

    threading.Thread(target=_worker, daemon=True).start()


@app.get("/api/dse_chart")
def api_dse_chart(symbol: str = Query(..., description="Stock ticker symbol (e.g. GP)")):
    sym = (symbol or "").strip().upper()
    if not sym or not re.match(r"^[A-Z0-9.\-]{1,20}$", sym):
        raise HTTPException(status_code=400, detail="Invalid DSE stock symbol")

    now = time.time()
    with _chart_lock:
        cached = _chart_cache.get(sym)
        if cached and (now - cached[1]) < CHART_TTL_SEC:
            return JSONResponse(
                content=cached[0],
                headers={"Cache-Control": "public, max-age=180, s-maxage=180", "X-Cache": "HIT"},
            )

    try:
        chart_data_list = dse_chart.get_chart_data(sym)
        if chart_data_list:
            with _chart_lock:
                _chart_cache[sym] = (chart_data_list, now)
            _persist_chart_to_firestore_async(sym, chart_data_list)
            return JSONResponse(
                content=chart_data_list,
                headers={"Cache-Control": "public, max-age=180, s-maxage=180", "X-Cache": "MISS"},
            )
    except Exception as e:
        logger.warning("Live dse_chart scrape failed for %s: %s", sym, e)

    # Fallback 1: Stale in-memory cache
    with _chart_lock:
        stale = _chart_cache.get(sym)
        if stale and stale[0]:
            return JSONResponse(
                content=stale[0],
                headers={"Cache-Control": "public, max-age=60, s-maxage=60", "X-Cache": "STALE-MEM"},
            )

    # Fallback 2: Firestore stock_charts/{sym}
    try:
        db = firebase_telemetry.get_prod_db()
        snap = db.collection("stock_charts").document(sym).get()
        if snap.exists:
            doc_data = snap.to_dict() or {}
            fb_chart = doc_data.get("chartData")
            if isinstance(fb_chart, list) and len(fb_chart) > 0:
                with _chart_lock:
                    _chart_cache[sym] = (fb_chart, now)
                return JSONResponse(
                    content=fb_chart,
                    headers={"Cache-Control": "public, max-age=120, s-maxage=120", "X-Cache": "FIRESTORE"},
                )
    except Exception as fb_err:
        logger.warning("Firestore chart fallback failed for %s: %s", sym, fb_err)

    raise HTTPException(status_code=404, detail=f"No chart data found for {sym}")


@app.get("/api/lanka_sector_sync")
def api_lanka_sector_sync():
    try:
        html_text = lanka_sector_sync.fetch_data_matrix_html()
        parser = lanka_sector_sync.DataMatrixSectorParser()
        parser.feed(html_text)
        return {
            "sectors": parser.sectors,
            "total": len(parser.sectors),
        }
    except Exception as e:
        logger.error("lanka_sector_sync failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Lanka Sector Sync Error: {str(e)}")


@app.get("/api/lanka_price_sync")
def api_lanka_price_sync():
    try:
        html_text = lanka_price_sync.fetch_data_matrix_html()
        parser = lanka_price_sync.DataMatrixPriceParser()
        parser.feed(html_text)
        return {
            "stocks": parser.stocks,
            "marketStatus": None,
            "source": "lankabd-price",
            "totalStocks": len(parser.stocks),
        }
    except Exception as e:
        logger.error("lanka_price_sync failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Lanka Price Sync Error: {str(e)}")


# ── Company Fundamentals Cache Mirror ──────────────────────────────────────────

@app.get("/api/fundamentals")
def api_fundamentals():
    """Returns the full cached directory of all DSE company fundamentals."""
    fundamentals = get_cached_fundamentals()
    headers = {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Total-Count": str(len(fundamentals)),
    }
    return JSONResponse(content=fundamentals, headers=headers)


@app.get("/api/fundamentals/{symbol}")
def api_fundamentals_symbol(symbol: str):
    """Returns company fundamentals for a single ticker."""
    fundamentals = get_cached_fundamentals()
    data = fundamentals.get(symbol.upper())
    if not data:
        raise HTTPException(status_code=404, detail=f"Fundamentals for {symbol.upper()} not found")

    return JSONResponse(
        content=data,
        headers={"Cache-Control": "public, max-age=3600, s-maxage=86400"},
    )


# ── Live Market Overview & News Feeds ──────────────────────────────────────────

_market_overview_cache = None
_market_overview_time = 0

_market_news_cache = None
_market_news_time = 0


def _fetch_dse_json(urls: list[str], timeout: float = 10.0) -> dict:
    last_err = None
    for url in urls:
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": BROWSER_USER_AGENT,
                    "Accept": "application/json",
                    "Referer": "https://new.dsebd.org/",
                },
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            last_err = e
    raise RuntimeError(f"Failed fetching DSE JSON across mirrors: {last_err}")


@app.get("/api/market_overview")
def api_market_overview():
    """Returns official real-time DSE indices (DSEX, DS30, DSES), market breadth, and turnover totals."""
    global _market_overview_cache, _market_overview_time
    now = time.time()
    if _market_overview_cache and (now - _market_overview_time) < 15:
        return JSONResponse(
            content=_market_overview_cache,
            headers={"Cache-Control": "public, max-age=15, s-maxage=15", "X-Cache": "HIT"},
        )

    try:
        data = _fetch_dse_json([
            "https://new.dsebd.org/api/live/market",
            "https://www.dsebd.org/api/live/market",
        ])
        _market_overview_cache = data
        _market_overview_time = now
        return JSONResponse(
            content=data,
            headers={"Cache-Control": "public, max-age=15, s-maxage=15", "X-Cache": "MISS"},
        )
    except Exception as e:
        logger.error("market_overview fetch failed: %s", e)
        if _market_overview_cache:
            return JSONResponse(content=_market_overview_cache, headers={"X-Cache": "STALE"})
        raise HTTPException(status_code=502, detail=f"Failed to fetch market overview: {str(e)}")


@app.get("/api/market_news")
def api_market_news(symbol: Optional[str] = Query(None, description="Optional stock ticker(s) to filter, comma-separated")):
    """Returns live 500-item DSE corporate disclosures & PSI news, optionally filtered by symbol(s) and merged with cached company disclosures."""
    global _market_news_cache, _market_news_time
    now = time.time()
    data = None
    if _market_news_cache and (now - _market_news_time) < 60:
        data = _market_news_cache
    else:
        try:
            data = _fetch_dse_json([
                "https://new.dsebd.org/api/live/news",
                "https://www.dsebd.org/api/live/news",
            ])
            _market_news_cache = data
            _market_news_time = now
        except Exception as e:
            logger.error("market_news fetch failed: %s", e)
            if _market_news_cache:
                data = _market_news_cache
            else:
                data = {"rows": []}

    news_rows = list(data.get("rows", []))
    if symbol:
        target_symbols = [s.strip().upper() for s in symbol.split(",") if s.strip()]
        target_set = set(target_symbols)
        filtered_live = [
            item for item in news_rows
            if str(item.get("code") or "").upper() in target_set
        ]

        # Enrich with cached company announcements from fundamentals.json so symbols outside
        # the global 500-item recent rolling window still return their official DSE disclosures.
        def _numeric_id(val: object) -> int:
            digits = "".join(ch for ch in str(val or "") if ch.isdigit())
            return int(digits) if digits else 0

        fundamentals = get_cached_fundamentals()
        seen_num_ids = {_numeric_id(item.get("id")) for item in filtered_live if _numeric_id(item.get("id")) > 0}
        seen_keys = {
            (str(item.get("code") or "").upper(), str(item.get("date") or ""), str(item.get("summary") or item.get("title") or ""))
            for item in filtered_live
        }
        merged = list(filtered_live)
        for sym in target_symbols:
            fund_entry = fundamentals.get(sym)
            if not isinstance(fund_entry, dict):
                continue
            comp_name = fund_entry.get("name") or sym
            announcements = fund_entry.get("recentAnnouncements") or fund_entry.get("disclosures") or []
            for disc in announcements:
                if not isinstance(disc, dict):
                    continue
                disc_id = str(disc.get("id") or "")
                num_id = _numeric_id(disc_id)
                if num_id > 0 and num_id in seen_num_ids:
                    continue
                raw_summary = disc.get("summary") or disc.get("title") or "Corporate Disclosure"
                summary_with_code = raw_summary if raw_summary.upper().startswith(f"{sym}:") else f"{sym}: {raw_summary}"
                key = (sym, str(disc.get("date") or ""), summary_with_code)
                if key in seen_keys:
                    continue
                if num_id > 0:
                    seen_num_ids.add(num_id)
                seen_keys.add(key)
                merged.append({
                    "id": disc_id or f"{sym}-{disc.get('date', '')}-{len(merged)}",
                    "code": sym,
                    "name": comp_name,
                    "type": disc.get("type") or "Disclosure",
                    "summary": summary_with_code,
                    "body": disc.get("body") or "",
                    "date": disc.get("date") or "",
                    "filedAt": disc.get("filedAt") or disc.get("date") or "",
                })

        merged.sort(key=lambda item: _numeric_id(item.get("id")), reverse=True)
        news_rows = merged

    return JSONResponse(
        content={
            "news": news_rows,
            "total": len(news_rows),
            "timestamp": int(now * 1000),
        },
        headers={"Cache-Control": "public, max-age=60, s-maxage=120"},
    )


# ── Crawler Management ────────────────────────────────────────────────────────

@app.post("/api/crawler/trigger")
def api_trigger_crawler(
    limit: Optional[int] = Query(None, description="Limit symbols to crawl"),
    symbol: Optional[str] = Query(None, description="Crawl a single symbol"),
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
):
    """Manually triggers background crawler task."""
    verify_secret_if_configured(authorization, x_api_key)

    crawler_script = os.path.join(SCRIPT_DIR, "crawl_fundamentals.py")
    cmd = [sys.executable, crawler_script]
    if limit:
        cmd.extend(["--limit", str(limit)])
    if symbol:
        cmd.extend(["--symbol", symbol])

    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    logger.info("Triggered crawler background execution: %s", " ".join(cmd))

    return {
        "status": "started",
        "message": f"Fundamentals crawler dispatched in background{' for ' + symbol if symbol else ''}",
        "timestamp": int(time.time() * 1000),
    }


@app.get("/api/crawler/status")
def api_crawler_status():
    """Returns the last crawler execution status and statistics."""
    if os.path.exists(CURSOR_FILE):
        try:
            with open(CURSOR_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            return {"error": f"Failed reading cursor: {e}"}
    return {"status": "never_run", "totalInStore": len(get_cached_fundamentals())}


# ── Offloaded Client Analytics & Bot Telemetry Endpoints ──────────────────────

def _extract_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first_ip = forwarded.split(",")[0].strip()
        if first_ip:
            return first_ip
    real_ip = request.headers.get("x-real-ip") or request.headers.get("cf-connecting-ip")
    if real_ip:
        return real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


async def _parse_json_body(request: Request) -> Optional[dict[str, Any]]:
    try:
        raw = await request.body()
        if not raw:
            return {}
        parsed = json.loads(raw.decode("utf-8"))
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None


@app.post("/api/analytics/track")
async def api_analytics_track(request: Request):
    """High-frequency visitor session/heartbeat tracker offloaded from Vercel."""
    from starlette.concurrency import run_in_threadpool

    body = await _parse_json_body(request)
    if body is None:
        return JSONResponse(content={"success": False, "error": "Invalid JSON body"}, status_code=400)

    client_ip = _extract_client_ip(request)
    headers_dict = {k.lower(): v for k, v in request.headers.items()}

    try:
        payload, status_code = await run_in_threadpool(
            firebase_telemetry.handle_analytics_track, body, headers_dict, client_ip
        )
        return JSONResponse(content=payload, status_code=status_code)
    except Exception as e:
        logger.error("analytics/track error: %s", e)
        return JSONResponse(content={"success": False, "error": "Internal server error"}, status_code=500)


@app.post("/api/analytics/notice-event")
async def api_analytics_notice_event(request: Request):
    """Campaign modal telemetry offloaded from Vercel."""
    from starlette.concurrency import run_in_threadpool

    body = await _parse_json_body(request) or {}
    client_ip = _extract_client_ip(request)
    headers_dict = {k.lower(): v for k, v in request.headers.items()}

    try:
        payload, status_code = await run_in_threadpool(
            firebase_telemetry.handle_notice_event, body, headers_dict, client_ip
        )
        return JSONResponse(content=payload, status_code=status_code)
    except Exception as e:
        logger.error("analytics/notice-event error: %s", e)
        return JSONResponse(content={"success": False, "error": "Internal Server Error"}, status_code=500)


@app.post("/api/analytics/market-reminder")
async def api_analytics_market_reminder(request: Request):
    """Market reminder acceptance telemetry offloaded from Vercel."""
    from starlette.concurrency import run_in_threadpool

    body = await _parse_json_body(request) or {}
    client_ip = _extract_client_ip(request)
    headers_dict = {k.lower(): v for k, v in request.headers.items()}

    try:
        payload, status_code = await run_in_threadpool(
            firebase_telemetry.handle_market_reminder, body, headers_dict, client_ip
        )
        return JSONResponse(content=payload, status_code=status_code)
    except Exception as e:
        logger.error("analytics/market-reminder error: %s", e)
        return JSONResponse(content={"error": "Internal Server Error"}, status_code=500)


@app.post("/api/internal/crawler-telemetry")
async def api_internal_crawler_telemetry(request: Request):
    """Bot crawler telemetry offloaded from Vercel middleware."""
    from starlette.concurrency import run_in_threadpool

    body = await _parse_json_body(request) or {}
    headers_dict = {k.lower(): v for k, v in request.headers.items()}

    try:
        payload, status_code = await run_in_threadpool(
            firebase_telemetry.handle_crawler_telemetry, body, headers_dict
        )
        return JSONResponse(content=payload, status_code=status_code)
    except Exception as e:
        logger.error("internal/crawler-telemetry error: %s", e)
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8005"))
    logger.info("Starting StockSimulator VPS Daemon on 127.0.0.1:%d", port)
    uvicorn.run("server:app", host="127.0.0.1", port=port, log_level="info")
