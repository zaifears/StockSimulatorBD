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
import subprocess
import sys
import time
import urllib.request
from typing import Optional

import psutil
from fastapi import FastAPI, HTTPException, Header, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add scrapers directory to module path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(SCRIPT_DIR, "scrapers"))

import category_sync
import dse_chart
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

# In-memory cached fundamentals with mtime tracking
_cached_fundamentals = {}
_cached_fundamentals_mtime = 0

app = FastAPI(
    title="StockSimulatorBD VPS Daemon",
    description="High-performance background synchronization and fundamentals cache engine",
    version="1.0.0",
)

# Enable CORS for Next.js frontend and edge calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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


@app.get("/api/dse_chart")
def api_dse_chart(symbol: str = Query(..., description="Stock ticker symbol (e.g. GP)")):
    try:
        chart_data_list = dse_chart.get_chart_data(symbol)
        if not chart_data_list:
            raise HTTPException(status_code=404, detail=f"No chart data found for {symbol}")
        return chart_data_list
    except HTTPException:
        raise
    except Exception as e:
        logger.error("dse_chart failed for %s: %s", symbol, e)
        raise HTTPException(status_code=500, detail=f"DSE Chart Scraper Error: {str(e)}")


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
        req = urllib.request.Request(
            "https://new.dsebd.org/api/live/market",
            headers={"User-Agent": "StockSimulatorBD-VPS/1.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
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
def api_market_news(symbol: Optional[str] = Query(None, description="Optional stock ticker to filter")):
    """Returns live 500-item DSE corporate disclosures & PSI news, optionally filtered by symbol."""
    global _market_news_cache, _market_news_time
    now = time.time()
    data = None
    if _market_news_cache and (now - _market_news_time) < 60:
        data = _market_news_cache
    else:
        try:
            req = urllib.request.Request(
                "https://new.dsebd.org/api/live/news",
                headers={"User-Agent": "StockSimulatorBD-VPS/1.0"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                _market_news_cache = data
                _market_news_time = now
        except Exception as e:
            logger.error("market_news fetch failed: %s", e)
            if _market_news_cache:
                data = _market_news_cache
            else:
                raise HTTPException(status_code=502, detail=f"Failed to fetch market news: {str(e)}")

    news_rows = data.get("rows", [])
    if symbol:
        sym_clean = symbol.strip().upper()
        news_rows = [item for item in news_rows if str(item.get("code") or "").upper() == sym_clean]

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

    # Run in background via Popen so HTTP request returns immediately
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


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8005"))
    logger.info("Starting StockSimulator VPS Daemon on 127.0.0.1:%d", port)
    uvicorn.run("server:app", host="127.0.0.1", port=port, log_level="info")
