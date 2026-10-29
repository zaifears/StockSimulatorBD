#!/usr/bin/env python3
"""
firebase_telemetry.py - Production & SEO Firestore Telemetry Engine for Oracle VPS

Offloads high-frequency client tracking and bot telemetry from Vercel Serverless Functions
to the always-on Oracle VPS daemon while maintaining 100% Firestore schema parity with:
  - app/api/analytics/track/route.ts
  - app/api/analytics/notice-event/route.ts
  - app/api/analytics/market-reminder/route.ts
  - app/api/internal/crawler-telemetry/route.ts
"""

import hmac
import json
import logging
import math
import os
import random
import re
import string
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import firebase_admin
from firebase_admin import auth as fb_auth
from firebase_admin import credentials, firestore

logger = logging.getLogger("vps_daemon.telemetry")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FIREBASE_ENV_FILE = os.path.join(SCRIPT_DIR, ".firebase_env.json")

# Dhaka Timezone (UTC+6, no DST)
DHAKA_TZ = timezone(timedelta(hours=6))

_init_lock = threading.Lock()
_env_config: dict[str, str] = {}
_prod_app: Optional[firebase_admin.App] = None
_prod_db: Any = None
_seo_app: Optional[firebase_admin.App] = None
_seo_db: Any = None


def load_env_config() -> dict[str, str]:
    global _env_config
    if _env_config:
        return _env_config

    cfg: dict[str, str] = {}
    if os.path.exists(FIREBASE_ENV_FILE):
        try:
            with open(FIREBASE_ENV_FILE, "r", encoding="utf-8-sig") as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    for k, v in loaded.items():
                        if isinstance(v, str):
                            cfg[k] = v
        except Exception as e:
            logger.error("Failed reading %s: %s", FIREBASE_ENV_FILE, e)

    # Allow environment variables to supplement or override
    for k in (
        "CRON_SECRET",
        "INTERNAL_TELEMETRY_SECRET",
        "NEXT_PUBLIC_SIMULATOR_APP_ID",
        "FIREBASE_PROJECT_ID",
        "FIREBASE_CLIENT_EMAIL",
        "FIREBASE_PRIVATE_KEY",
        "SEO_FIREBASE_PROJECT_ID",
        "SEO_FIREBASE_CLIENT_EMAIL",
        "SEO_FIREBASE_PRIVATE_KEY",
    ):
        val = os.environ.get(k)
        if val and k not in cfg:
            cfg[k] = val

    _env_config = cfg
    return _env_config


def get_prod_db():
    global _prod_app, _prod_db
    if _prod_db is not None:
        return _prod_db

    with _init_lock:
        if _prod_db is not None:
            return _prod_db

        cfg = load_env_config()
        project_id = cfg.get("FIREBASE_PROJECT_ID")
        client_email = cfg.get("FIREBASE_CLIENT_EMAIL")
        private_key = cfg.get("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")

        if not project_id or not client_email or not private_key:
            raise RuntimeError("Missing Production Firebase Admin credentials on VPS")

        try:
            _prod_app = firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": project_id,
                "private_key": private_key,
                "client_email": client_email,
                "token_uri": "https://oauth2.googleapis.com/token",
            })
            _prod_app = firebase_admin.initialize_app(cred)

        _prod_db = firestore.client(app=_prod_app)
        return _prod_db


def get_seo_db():
    global _seo_app, _seo_db
    if _seo_db is not None:
        return _seo_db

    with _init_lock:
        if _seo_db is not None:
            return _seo_db

        cfg = load_env_config()
        project_id = cfg.get("SEO_FIREBASE_PROJECT_ID")
        client_email = cfg.get("SEO_FIREBASE_CLIENT_EMAIL")
        private_key = cfg.get("SEO_FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
        prod_project_id = cfg.get("FIREBASE_PROJECT_ID")

        if not project_id or not client_email or not private_key:
            raise RuntimeError("Missing SEO Firebase Admin credentials on VPS")

        if prod_project_id and project_id == prod_project_id:
            raise RuntimeError("FATAL: SEO_FIREBASE_PROJECT_ID matches production FIREBASE_PROJECT_ID")

        try:
            _seo_app = firebase_admin.get_app("seo-intelligence")
        except ValueError:
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": project_id,
                "private_key": private_key,
                "client_email": client_email,
                "token_uri": "https://oauth2.googleapis.com/token",
            })
            _seo_app = firebase_admin.initialize_app(cred, name="seo-intelligence")

        _seo_db = firestore.client(app=_seo_app)
        return _seo_db


# ── Fast In-Memory Rate Limiter & Token Cache ─────────────────────────────────

_rate_lock = threading.Lock()
_rate_buckets: dict[str, tuple[int, float]] = {}
_last_rate_cleanup = 0.0


def check_rate_limit(key: str, max_requests: int = 300, window_sec: float = 60.0) -> bool:
    global _last_rate_cleanup
    now = time.time()
    with _rate_lock:
        if now - _last_rate_cleanup > 120.0:
            expired = [k for k, (_, exp) in _rate_buckets.items() if now > exp]
            for k in expired:
                _rate_buckets.pop(k, None)
            _last_rate_cleanup = now

        entry = _rate_buckets.get(key)
        if not entry or now > entry[1]:
            _rate_buckets[key] = (1, now + window_sec)
            return True

        count, reset_at = entry
        if count >= max_requests:
            return False

        _rate_buckets[key] = (count + 1, reset_at)
        return True


_token_cache_lock = threading.Lock()
_token_cache: dict[str, tuple[dict[str, Any], float]] = {}


def verify_token_cached(id_token: Any) -> Optional[dict[str, Any]]:
    if not isinstance(id_token, str) or not id_token.strip():
        return None
    token = id_token.strip()
    now = time.time()

    with _token_cache_lock:
        cached = _token_cache.get(token)
        if cached and now < cached[1]:
            return cached[0]
        if len(_token_cache) > 2000:
            expired = [k for k, (_, exp) in _token_cache.items() if now >= exp]
            for k in expired:
                _token_cache.pop(k, None)

    try:
        # Ensure prod app is initialized before calling verify_id_token
        get_prod_db()
        decoded = fb_auth.verify_id_token(token, app=_prod_app)
        info = {
            "uid": decoded.get("uid"),
            "email": decoded.get("email"),
            "name": decoded.get("name"),
        }
        exp = float(decoded.get("exp", now + 300))
        ttl_until = min(exp - 5.0, now + 300.0)
        if ttl_until > now:
            with _token_cache_lock:
                _token_cache[token] = (info, ttl_until)
        return info
    except Exception:
        return None


# ── Dhaka Time & Geo Bucketing Helpers ────────────────────────────────────────

def get_dhaka_date_key(days_ago: int = 0) -> str:
    dt = datetime.now(DHAKA_TZ) - timedelta(days=days_ago)
    return dt.strftime("%Y-%m-%d")


def get_dhaka_hour() -> int:
    return datetime.now(DHAKA_TZ).hour


VALID_GEO_BUCKETS = {
    "dhaka",
    "chattogram",
    "khulna",
    "rajshahi",
    "sylhet",
    "barishal",
    "rangpur",
    "mymensingh",
    "other_bd",
    "outside_bd",
    "unknown",
}

CITY_ALIASES = {
    "dhaka": "dhaka",
    "chattogram": "chattogram",
    "chittagong": "chattogram",
    "khulna": "khulna",
    "rajshahi": "rajshahi",
    "sylhet": "sylhet",
    "barishal": "barishal",
    "barisal": "barishal",
    "rangpur": "rangpur",
    "mymensingh": "mymensingh",
    "mymensing": "mymensingh",
}

_ip_geo_cache: dict[str, tuple[str, float]] = {}
_ip_geo_lock = threading.Lock()


def _bucket_country_and_city(country: str, city_or_region: str) -> str:
    c = (country or "").strip().upper()
    if not c:
        return "unknown"
    if c != "BD":
        return "outside_bd"
    city_clean = urllib.parse.unquote(city_or_region or "").strip().lower()
    if not city_clean:
        return "other_bd"
    for alias, bucket in CITY_ALIASES.items():
        if alias in city_clean:
            return bucket
    return "other_bd"


def resolve_geo_bucket(headers: dict[str, str], client_ip: str, body_geo: Any = None) -> str:
    if isinstance(body_geo, str) and body_geo in VALID_GEO_BUCKETS and body_geo != "unknown":
        return body_geo

    raw_country = headers.get("x-vercel-ip-country") or headers.get("cf-ipcountry")
    raw_city = headers.get("x-vercel-ip-city") or headers.get("cf-ipcity") or ""
    if raw_country:
        bucket = _bucket_country_and_city(raw_country, raw_city)
        if bucket != "unknown":
            return bucket

    if not client_ip or client_ip in ("127.0.0.1", "::1", "unknown"):
        return "unknown"

    now = time.time()
    with _ip_geo_lock:
        cached = _ip_geo_cache.get(client_ip)
        if cached and now < cached[1]:
            return cached[0]
        if len(_ip_geo_cache) > 5000:
            _ip_geo_cache.clear()

    bucket = "unknown"
    try:
        url = f"http://ip-api.com/json/{urllib.parse.quote(client_ip)}?fields=status,countryCode,city,regionName"
        req = urllib.request.Request(url, headers={"User-Agent": "StockSimulatorBD-Geo/1.0"})
        with urllib.request.urlopen(req, timeout=1.2) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("status") == "success":
                country_code = data.get("countryCode") or ""
                city_str = f"{data.get('city', '')} {data.get('regionName', '')}"
                bucket = _bucket_country_and_city(country_code, city_str)
    except Exception:
        bucket = "unknown"

    with _ip_geo_lock:
        _ip_geo_cache[client_ip] = (bucket, now + 86400.0)
    return bucket


# ── VisitTracker (/api/analytics/track) Implementation ────────────────────────

VALID_ACTIONS = {"start", "heartbeat", "end"}
VALID_DEVICE_TYPES = {"mobile", "tablet", "desktop", "unknown"}
MAX_DELTA_SECONDS = 120
MAX_PAGE_COUNT = 2000

TTL_USER_DAYS = 90
TTL_GUEST_ACTIVE_DAYS = 14
TTL_GUEST_BOUNCE_DAYS = 7

BOUNCE_MAX_PAGE_COUNT = 1
BOUNCE_MAX_ACTIVE_SECONDS = 10

SOCIAL_HOSTS = (
    "facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com", "linkedin.com",
    "t.co", "tiktok.com", "reddit.com", "pinterest.com", "youtube.com", "wa.me",
    "whatsapp.com", "telegram.org", "t.me",
)
SEARCH_HOSTS = ("bing.com", "yahoo.com", "duckduckgo.com", "baidu.com", "yandex.")
OWN_HOSTS = ("stocksimulator.tech", "stocksimulator.shahoriar.bd")


def _clamp_number(value: Any, min_val: int, max_val: int, fallback: int) -> int:
    if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value):
        n = int(round(value))
    else:
        n = fallback
    return min(max_val, max(min_val, n))


def _sanitize_string(value: Any, max_len: int) -> Optional[str]:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    return trimmed[:max_len]


def _is_plausible_session_id(value: Any) -> bool:
    return isinstance(value, str) and 8 <= len(value) <= 100


def _categorize_referrer(referrer: Optional[str]) -> str:
    if not referrer:
        return "direct"
    try:
        parsed = urllib.parse.urlparse(referrer)
        host = (parsed.hostname or "").lower()
        if host.startswith("www."):
            host = host[4:]
    except Exception:
        return "other"

    if not host:
        return "direct"
    if any(host == own or host.endswith(f".{own}") for own in OWN_HOSTS):
        return "internal"
    if "google." in host:
        return "search_google"
    if any(h in host for h in SEARCH_HOSTS):
        return "search_other"
    if any(h in host for h in SOCIAL_HOSTS):
        return "social"
    return "other"


def _normalize_analytics_path(path: str) -> str:
    cleaned = (path or "/").split("?")[0].split("#")[0].strip()
    if len(cleaned) > 1 and cleaned.endswith("/"):
        cleaned = cleaned[:-1]
    if re.match(r"^/stocks/[^/]+$", cleaned, re.IGNORECASE):
        symbol = cleaned[len("/stocks/"):].upper()
        return f"/stocks/{symbol}"
    if re.match(r"^/blog/[^/]+$", cleaned, re.IGNORECASE):
        slug = cleaned[len("/blog/"):].lower()
        return f"/blog/{slug}"
    return cleaned or "/"


def _path_to_doc_id(path: str) -> str:
    norm = _normalize_analytics_path(path)
    doc_id = f"p_{norm.replace('/', '_')}"
    return doc_id[:400]


def handle_analytics_track(body: dict[str, Any], headers: dict[str, str], client_ip: str) -> tuple[dict[str, Any], int]:
    if not check_rate_limit(f"analytics:{client_ip}", max_requests=300, window_sec=60.0):
        return {"success": False, "error": "Rate limited"}, 429

    action = body.get("action")
    if action not in VALID_ACTIONS:
        return {"success": False, "error": "Invalid or missing action"}, 400

    session_id = body.get("sessionId")
    if not _is_plausible_session_id(session_id):
        return {"success": False, "error": "Invalid or missing sessionId"}, 400

    db = get_prod_db()
    session_ref = db.collection("analytics_sessions").document(session_id)

    # ── START ─────────────────────────────────────────────────────────────────
    if action == "start":
        token_info = verify_token_cached(body.get("idToken"))
        uid = token_info["uid"] if token_info else None
        date_key = get_dhaka_date_key(0)
        hour = get_dhaka_hour()
        entry_path = _normalize_analytics_path(_sanitize_string(body.get("entryPath"), 300) or "/")
        referrer = _sanitize_string(body.get("referrer"), 300)
        guest_id = _sanitize_string(body.get("guestId"), 100)
        raw_device = body.get("deviceType")
        device_type = raw_device if raw_device in VALID_DEVICE_TYPES else "unknown"

        source_bucket = _categorize_referrer(referrer)
        geo_bucket = resolve_geo_bucket(headers, client_ip, body.get("geoBucket"))

        daily_ref = db.collection("analytics_daily").document(date_key)
        user_ref = db.collection("users").document(uid) if uid else None
        guest_ref = db.collection("analytics_guests").document(guest_id) if (not uid and guest_id) else None
        page_ref = db.collection("analytics_pages").document(_path_to_doc_id(entry_path))

        @firestore.transactional
        def _start_tx(transaction):
            existing = session_ref.get(transaction=transaction)
            if existing.exists:
                return {"alreadyStarted": True}

            is_first_visit_today = False
            is_new_visitor_ever = False
            has_identity_signal = False
            guest_snap = None

            if user_ref is not None:
                has_identity_signal = True
                user_snap = user_ref.get(transaction=transaction)
                user_data = user_snap.to_dict() if user_snap.exists else {}
                is_first_visit_today = (user_data.get("lastVisitDateKey") if user_data else None) != date_key
                is_new_visitor_ever = (not user_snap.exists) or (not user_data.get("visitCount"))
            elif guest_ref is not None:
                has_identity_signal = True
                guest_snap = guest_ref.get(transaction=transaction)
                is_new_visitor_ever = not guest_snap.exists

            if guest_ref is not None and guest_snap is not None:
                guest_data = guest_snap.to_dict() if guest_snap.exists else {}
                transaction.set(
                    guest_ref,
                    {
                        "firstSeenAt": guest_data.get("firstSeenAt") if guest_snap.exists else firestore.SERVER_TIMESTAMP,
                        "lastSeenAt": firestore.SERVER_TIMESTAMP,
                        "visitCount": firestore.Increment(1),
                    },
                    merge=True,
                )

            retention_tier = "user" if uid else "ephemeral"
            ttl_days = TTL_USER_DAYS if uid else TTL_GUEST_BOUNCE_DAYS
            expires_at = datetime.now(timezone.utc) + timedelta(days=ttl_days)

            transaction.set(
                session_ref,
                {
                    "sessionId": session_id,
                    "uid": uid or None,
                    "isAnonymous": not bool(uid),
                    "retentionTier": retention_tier,
                    "guestId": guest_id or None,
                    "startedAt": firestore.SERVER_TIMESTAMP,
                    "lastPingAt": firestore.SERVER_TIMESTAMP,
                    "endedAt": None,
                    "activeSeconds": 0,
                    "pageCount": 1,
                    "entryPath": entry_path,
                    "lastPath": entry_path,
                    "referrer": referrer,
                    "sourceBucket": source_bucket,
                    "deviceType": device_type,
                    "dateKey": date_key,
                    "expiresAt": expires_at,
                },
            )

            transaction.set(
                daily_ref,
                {
                    "dateKey": date_key,
                    "totalSessions": firestore.Increment(1),
                    "loggedInSessions": firestore.Increment(1 if uid else 0),
                    "guestSessions": firestore.Increment(0 if uid else 1),
                    "uniqueLoggedInUsers": firestore.Increment(1 if (is_first_visit_today and uid) else 0),
                    "newVisitorSessions": firestore.Increment(1 if (has_identity_signal and is_new_visitor_ever) else 0),
                    "returningVisitorSessions": firestore.Increment(1 if (has_identity_signal and not is_new_visitor_ever) else 0),
                    f"device_{device_type}": firestore.Increment(1),
                    f"source_{source_bucket}": firestore.Increment(1),
                    f"hour_{hour}": firestore.Increment(1),
                    f"geo_{geo_bucket}": firestore.Increment(1),
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                },
                merge=True,
            )

            transaction.set(
                page_ref,
                {
                    "path": entry_path,
                    "views": firestore.Increment(1),
                    "lastDateKey": date_key,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                },
                merge=True,
            )

            if user_ref is not None:
                transaction.set(
                    user_ref,
                    {
                        "visitCount": firestore.Increment(1),
                        "lastVisitAt": firestore.SERVER_TIMESTAMP,
                        "lastVisitDateKey": date_key,
                    },
                    merge=True,
                )

            return {"alreadyStarted": False}

        tx = db.transaction()
        res = _start_tx(tx)
        return {"success": True, **res}, 200

    # ── HEARTBEAT / END ───────────────────────────────────────────────────────
    session_snap = session_ref.get()
    if not session_snap.exists:
        return {"success": True, "skipped": True}, 200

    session = session_snap.to_dict() or {}
    date_key = session.get("dateKey") or get_dhaka_date_key(0)
    delta = _clamp_number(body.get("deltaActiveSeconds"), 0, MAX_DELTA_SECONDS, 0)
    raw_path = _sanitize_string(body.get("path"), 300)
    last_path = _normalize_analytics_path(raw_path) if raw_path else None
    incoming_page_count = _clamp_number(body.get("pageCount"), 0, MAX_PAGE_COUNT, 0)

    session_update: dict[str, Any] = {
        "lastPingAt": firestore.SERVER_TIMESTAMP,
        "activeSeconds": firestore.Increment(delta),
    }
    if last_path:
        session_update["lastPath"] = last_path

    token_info = verify_token_cached(body.get("idToken"))
    incoming_uid = token_info["uid"] if token_info else None

    if not session.get("uid"):
        if incoming_uid:
            session_update["uid"] = incoming_uid
            session_update["isAnonymous"] = False
            session_update["retentionTier"] = "user"
            session_update["expiresAt"] = datetime.now(timezone.utc) + timedelta(days=TTL_USER_DAYS)
        else:
            current_pages = incoming_page_count or session.get("pageCount") or 1
            current_seconds = (session.get("activeSeconds") or 0) + delta
            if (current_pages > 1 or current_seconds >= 15) and session.get("retentionTier") != "guest":
                session_update["retentionTier"] = "guest"
                session_update["expiresAt"] = datetime.now(timezone.utc) + timedelta(days=TTL_GUEST_ACTIVE_DAYS)

    is_navigation = bool(last_path and last_path != session.get("lastPath"))
    if incoming_page_count > (session.get("pageCount") or 0):
        session_update["pageCount"] = incoming_page_count
    if action == "end":
        session_update["endedAt"] = firestore.SERVER_TIMESTAMP

    daily_update: dict[str, Any] = {
        "dateKey": date_key,
        "totalActiveSeconds": firestore.Increment(delta),
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }
    if action == "end":
        daily_update["completedSessions"] = firestore.Increment(1)
        final_page_count = session_update.get("pageCount") or session.get("pageCount") or 1
        final_active_seconds = (session.get("activeSeconds") or 0) + delta
        if final_page_count <= BOUNCE_MAX_PAGE_COUNT and final_active_seconds <= BOUNCE_MAX_ACTIVE_SECONDS:
            daily_update["bounces"] = firestore.Increment(1)

    daily_ref = db.collection("analytics_daily").document(date_key)
    effective_uid = session.get("uid") or incoming_uid
    user_time_ref = db.collection("users").document(effective_uid) if (effective_uid and delta > 0) else None
    nav_page_ref = db.collection("analytics_pages").document(_path_to_doc_id(last_path)) if (is_navigation and last_path) else None
    nav_page_update = {
        "path": last_path,
        "views": firestore.Increment(1),
        "lastDateKey": date_key,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }

    if action == "end":
        @firestore.transactional
        def _end_tx(transaction):
            fresh = session_ref.get(transaction=transaction)
            fresh_data = fresh.to_dict() if fresh.exists else {}
            already_ended = bool(fresh.exists and fresh_data and fresh_data.get("endedAt"))

            tx_daily = dict(daily_update)
            if already_ended:
                tx_daily.pop("completedSessions", None)
                tx_daily.pop("bounces", None)

            transaction.set(session_ref, session_update, merge=True)
            transaction.set(daily_ref, tx_daily, merge=True)
            if user_time_ref is not None:
                transaction.set(user_time_ref, {"totalActiveSeconds": firestore.Increment(delta)}, merge=True)
            if nav_page_ref is not None:
                transaction.set(nav_page_ref, nav_page_update, merge=True)

        tx = db.transaction()
        _end_tx(tx)
        return {"success": True}, 200

    batch = db.batch()
    batch.set(session_ref, session_update, merge=True)
    batch.set(daily_ref, daily_update, merge=True)
    if user_time_ref is not None:
        batch.set(user_time_ref, {"totalActiveSeconds": firestore.Increment(delta)}, merge=True)
    if nav_page_ref is not None:
        batch.set(nav_page_ref, nav_page_update, merge=True)
    batch.commit()

    return {"success": True}, 200


# ── Notice Event (/api/analytics/notice-event) Implementation ─────────────────

VALID_NOTICE_ACTIONS = {"impression", "click", "dismiss", "submit", "copy"}


def handle_notice_event(body: dict[str, Any], headers: dict[str, str], client_ip: str) -> tuple[dict[str, Any], int]:
    if not check_rate_limit(f"notice-event:{client_ip}", max_requests=120, window_sec=60.0):
        return {"success": False, "error": "Rate limit exceeded. Please try again later."}, 429

    raw_campaign = body.get("campaignId") if isinstance(body.get("campaignId"), str) else ""
    campaign_id = re.sub(r"[^a-zA-Z0-9_-]", "_", raw_campaign.strip())[:80] or "default_notice"

    raw_action = body.get("action") if isinstance(body.get("action"), str) else ""
    action = raw_action.strip().lower()
    if action not in VALID_NOTICE_ACTIONS:
        return {"success": False, "error": "Invalid notice action."}, 400

    metadata = body.get("metadata") if isinstance(body.get("metadata"), dict) else {}
    auth_header = headers.get("authorization") or ""
    token = auth_header[7:].strip() if auth_header.lower().startswith("bearer ") else body.get("idToken")
    auth_user = verify_token_cached(token)
    uid = auth_user["uid"] if auth_user else None

    date_key = get_dhaka_date_key(0)
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    db = get_prod_db()
    batch = db.batch()

    summary_ref = db.collection("analytics_notices").document(campaign_id)
    batch.set(
        summary_ref,
        {
            "campaignId": campaign_id,
            "totalImpressions": firestore.Increment(1 if action == "impression" else 0),
            "totalClicks": firestore.Increment(1 if action == "click" else 0),
            "totalCopies": firestore.Increment(1 if action == "copy" else 0),
            "totalDismissals": firestore.Increment(1 if action == "dismiss" else 0),
            "totalSubmissions": firestore.Increment(1 if action == "submit" else 0),
            "lastAction": action,
            "lastEventAt": firestore.SERVER_TIMESTAMP,
            "lastDateKey": date_key,
        },
        merge=True,
    )

    daily_ref = db.collection("analytics_notices_daily").document(f"{campaign_id}_{date_key}")
    batch.set(
        daily_ref,
        {
            "campaignId": campaign_id,
            "date": date_key,
            "impressions": firestore.Increment(1 if action == "impression" else 0),
            "clicks": firestore.Increment(1 if action == "click" else 0),
            "copies": firestore.Increment(1 if action == "copy" else 0),
            "dismissals": firestore.Increment(1 if action == "dismiss" else 0),
            "submissions": firestore.Increment(1 if action == "submit" else 0),
            "lastUpdated": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )

    if uid and action in ("click", "copy", "submit", "dismiss"):
        user_ref = db.collection("users").document(uid)
        batch.set(
            user_ref,
            {
                "noticesSeen": {campaign_id: now_iso},
                f"noticesSeen.{campaign_id}": now_iso,
                "lastNoticeInteraction": {
                    "campaignId": campaign_id,
                    "action": action,
                    "at": now_iso,
                },
            },
            merge=True,
        )

    event_ref = db.collection("notice_events").document()
    batch.set(
        event_ref,
        {
            "campaignId": campaign_id,
            "action": action,
            "uid": uid,
            "userEmail": auth_user.get("email") if auth_user else None,
            "displayName": auth_user.get("name") if auth_user else None,
            "clientIP": client_ip if client_ip != "unknown" else None,
            "userAgent": (headers.get("user-agent") or "")[:200] or None,
            "metadata": metadata,
            "dateKey": date_key,
            "createdAt": firestore.SERVER_TIMESTAMP,
        },
    )

    batch.commit()
    return {"success": True, "campaignId": campaign_id, "action": action}, 200


# ── Market Reminder (/api/analytics/market-reminder) Implementation ───────────

VALID_REMINDER_TYPES = {"google_calendar", "apple_ics", "weekly_ics"}
VALID_REMINDER_SOURCES = {
    "trade_banner",
    "trade_row_buy",
    "trade_row_sell",
    "market_row_buy",
    "market_row_sell",
    "trade_panel",
    "market_strip",
    "unknown",
}


def handle_market_reminder(body: dict[str, Any], headers: dict[str, str], client_ip: str) -> tuple[dict[str, Any], int]:
    if not check_rate_limit(f"market-reminder:{client_ip}", max_requests=60, window_sec=60.0):
        return {"error": "Rate limit exceeded. Please try again later."}, 429

    raw_type = body.get("type") if isinstance(body.get("type"), str) else ""
    r_type = raw_type.strip().lower() if raw_type.strip().lower() in VALID_REMINDER_TYPES else "google_calendar"

    raw_source = body.get("source") if isinstance(body.get("source"), str) else ""
    source = raw_source.strip().lower() if raw_source.strip().lower() in VALID_REMINDER_SOURCES else "unknown"

    lead_minutes = body.get("leadMinutes") if body.get("leadMinutes") in (0, 15) else 15
    is_recurring = bool(body.get("isRecurring"))
    next_open_dhaka = body.get("nextOpenDhaka")[:100] if isinstance(body.get("nextOpenDhaka"), str) else None

    auth_header = headers.get("authorization") or ""
    token = auth_header[7:].strip() if auth_header.lower().startswith("bearer ") else body.get("idToken")
    auth_user = verify_token_cached(token)
    uid = auth_user["uid"] if auth_user else None

    date_key = get_dhaka_date_key(0)
    db = get_prod_db()
    batch = db.batch()

    summary_ref = db.collection("analytics_market_reminders").document("summary")
    batch.set(
        summary_ref,
        {
            "totalCount": firestore.Increment(1),
            f"byType.{r_type}": firestore.Increment(1),
            f"bySource.{source}": firestore.Increment(1),
            "lastAcceptedAt": firestore.SERVER_TIMESTAMP,
            "lastDateKey": date_key,
        },
        merge=True,
    )

    daily_ref = db.collection("analytics_market_reminders_daily").document(date_key)
    batch.set(
        daily_ref,
        {
            "date": date_key,
            "totalCount": firestore.Increment(1),
            f"byType.{r_type}": firestore.Increment(1),
            "lastUpdated": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )

    if uid:
        user_ref = db.collection("users").document(uid)
        batch.set(
            user_ref,
            {
                "marketReminderAcceptedAt": firestore.SERVER_TIMESTAMP,
                "lastMarketReminderType": r_type,
            },
            merge=True,
        )

    event_ref = db.collection("market_reminder_events").document()
    batch.set(
        event_ref,
        {
            "type": r_type,
            "source": source,
            "leadMinutes": lead_minutes,
            "isRecurring": is_recurring,
            "nextOpenDhaka": next_open_dhaka,
            "uid": uid or None,
            "dateKey": date_key,
            "clientIP": client_ip if client_ip != "unknown" else None,
            "userAgent": (headers.get("user-agent") or "")[:200] or None,
            "createdAt": firestore.SERVER_TIMESTAMP,
        },
    )

    batch.commit()
    return {"success": True}, 200


# ── Bot Crawler Telemetry (/api/internal/crawler-telemetry) Implementation ────

STANDARD_BOTS = {
    "Googlebot",
    "Google-Extended",
    "Bingbot",
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-SearchBot",
    "PerplexityBot",
    "Perplexity-User",
    "Bytespider",
    "Applebot",
    "Applebot-Extended",
    "CCBot",
}


def handle_crawler_telemetry(body: dict[str, Any], headers: dict[str, str]) -> tuple[dict[str, Any], int]:
    cfg = load_env_config()
    secret = cfg.get("CRON_SECRET") or cfg.get("INTERNAL_TELEMETRY_SECRET")
    if not secret:
        return {"error": "Telemetry secret not configured"}, 500

    incoming_secret = headers.get("x-crawler-telemetry-secret")
    if not incoming_secret or not hmac.compare_digest(
        incoming_secret.encode("utf-8"), secret.encode("utf-8")
    ):
        return {"error": "Unauthorized internal telemetry call"}, 401

    bot_name = body.get("botName")
    if not isinstance(bot_name, str) or bot_name not in STANDARD_BOTS:
        return {"error": "Invalid or untracked botName"}, 400

    user_agent = str(body.get("userAgent") or "")[:250]
    path = str(body.get("path") or "/")[:150]
    try:
        status_code = int(body.get("statusCode") or 200)
    except Exception:
        status_code = 200
    robots_allowed = bool(body.get("robotsAllowed", True))

    seo_db = get_seo_db()
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=5))
    log_id = f"bot_{int(time.time() * 1000)}_{rand_suffix}"

    log_record = {
        "id": log_id,
        "botName": bot_name,
        "userAgent": user_agent,
        "path": path,
        "statusCode": status_code,
        "robotsAllowed": robots_allowed,
        "observationalNote": f"Real observed telemetry: User-Agent claimed identity as {bot_name}.",
        "timestamp": now_iso,
    }

    batch = seo_db.batch()
    batch.set(seo_db.collection("seo_crawler_logs").document(log_id), log_record)
    batch.set(
        seo_db.collection("seo_crawler_summaries").document(bot_name),
        {
            "botName": bot_name,
            "lastSeen": now_iso,
            "totalRequests": firestore.Increment(1),
            "successfulCount": firestore.Increment(1 if status_code == 200 else 0),
            "forbiddenCount": firestore.Increment(1 if status_code == 403 else 0),
            "notFoundCount": firestore.Increment(1 if status_code == 404 else 0),
            "robotsBlockedCount": firestore.Increment(0 if robots_allowed else 1),
            "robotsTxtStatus": "allowed" if robots_allowed else "disallowed",
        },
        merge=True,
    )
    batch.commit()

    return {"success": True, "logged": bot_name}, 200
