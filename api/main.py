import json
import re
import os
import time
import random
import sqlite3
import calendar
import uuid
import hashlib
import statistics
import html as html_lib
import unicodedata
from pathlib import Path
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
import threading
import asyncio
from curl_cffi import requests
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Response, Request, Header
import httpx
from fastapi.middleware.cors import CORSMiddleware
from letterboxdpy.user import User
from letterboxdpy.movie import Movie
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple

# Import logger - use try/except for Vercel compatibility
try:
    from api.logger import logger, log_section, log_stats
except ImportError:
    from logger import logger, log_section, log_stats

class DiaryEntry(BaseModel):
    film_name: str
    film_year: Optional[str] = None
    watched_date: str
    rating: Optional[float] = None
    rewatch: bool = False
    letterboxd_uri: Optional[str] = None

class ScrapedData(BaseModel):
    username: str
    real_name: str = ""
    entries: List[DiaryEntry]
    source: str = "upload"

class YearRequest(BaseModel):
    sessionId: str
    year: int

class WrappedVisitMetric(BaseModel):
    username: str
    year: Optional[int] = None

YEAR_RANGE_START = 2020
YEAR_RANGE_END = 2025
UPLOAD_SESSION_TTL_SECONDS = 60 * 60
upload_sessions: Dict[str, Dict[str, Any]] = {}
metrics_lock = threading.Lock()
METRICS_SCHEMA_VERSION = 2
metrics_cache: Dict[str, Any] = {
    "schemaVersion": METRICS_SCHEMA_VERSION,
    "totalWrappedGenerations": 0,
    "uniqueUsers": {},
    "events": [],
    "flavorBaseline": {
        "profiles": [],
        "histByYear": {}
    }
}
metrics_rate_lock = threading.Lock()
metrics_rate_limits: Dict[str, Dict[str, float]] = {}
METRICS_RATE_LIMIT_WINDOW_SECONDS = 60
METRICS_RATE_LIMIT_MAX_REQUESTS = 30
FLAVOR_AXES = ("mainstream", "modern", "light", "arthouse", "slow")
FLAVOR_BASELINE_MIN_SAMPLES = 200
FLAVOR_BASELINE_MAX_PROFILES = 10000
SCRAPE_MAX_RETRIES = 2
SCRAPE_RETRY_BACKOFF_SECONDS = 0.35
MAX_ACTOR_CREDITS = 25

app = FastAPI()


def _request_id_from_request(request: Optional[Request] = None) -> str:
    if request:
        rid = (request.headers.get("x-request-id") or "").strip()
        if rid:
            return rid[:120]
    return str(uuid.uuid4())


def _error_payload(code: str, message: str, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"errorCode": code, "message": message}
    if extra:
        payload.update(extra)
    return payload


def _raise_api_error(status_code: int, code: str, message: str, extra: Optional[Dict[str, Any]] = None):
    raise HTTPException(status_code=status_code, detail=_error_payload(code, message, extra))

# Enable CORS
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,https://movies-wrapped-2025.vercel.app"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/proxy")
async def image_proxy(url: str):
    if not url: return Response(status_code=400)
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=10)
            return Response(content=resp.content, media_type=resp.headers.get("Content-Type", "image/jpeg"))
        except:
            return Response(status_code=500)


def _require_metrics_admin_key(x_admin_key: Optional[str]):
    expected_admin_key = os.environ.get("ANALYTICS_ADMIN_KEY", "").strip()
    if not expected_admin_key:
        _raise_api_error(503, "METRICS_NOT_CONFIGURED", "Metrics endpoints are not configured.")
    if x_admin_key != expected_admin_key:
        _raise_api_error(401, "UNAUTHORIZED", "Unauthorized")


@app.post("/api/metrics/wrapped-visit")
async def record_wrapped_visit(payload: WrappedVisitMetric, request: Request):
    _check_rate_limit(request, "wrapped-visit")
    username_hash = _hash_username(payload.username)
    now_iso = datetime.utcnow().isoformat() + "Z"
    with metrics_lock:
        metrics_cache["totalWrappedGenerations"] = int(metrics_cache.get("totalWrappedGenerations", 0)) + 1
        unique_users = metrics_cache.setdefault("uniqueUsers", {})
        if username_hash not in unique_users:
            unique_users[username_hash] = {
                "firstSeenAt": now_iso,
                "lastSeenAt": now_iso,
                "count": 1
            }
        else:
            unique_users[username_hash]["lastSeenAt"] = now_iso
            unique_users[username_hash]["count"] = int(unique_users[username_hash].get("count", 0)) + 1

        events = metrics_cache.setdefault("events", [])
        events.append({
            "ts": now_iso,
            "userHash": username_hash,
            "year": payload.year
        })
        # Keep payload bounded
        if len(events) > 5000:
            metrics_cache["events"] = events[-5000:]

        _save_metrics()

    return {"ok": True}


@app.get("/api/metrics/summary")
async def metrics_summary(
    request: Request,
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key")
):
    _check_rate_limit(request, "metrics-summary")
    _require_metrics_admin_key(x_admin_key)

    with metrics_lock:
        unique_count = len(metrics_cache.get("uniqueUsers", {}))
        total_generations = int(metrics_cache.get("totalWrappedGenerations", 0))
        events = metrics_cache.get("events", [])
        last_30 = events[-30:]
    return {
        "totalWrappedGenerations": total_generations,
        "uniqueWrappedUsers": unique_count,
        "recentEvents": last_30
    }


@app.get("/api/metrics/flavor-summary")
async def metrics_flavor_summary(
    request: Request,
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key")
):
    _check_rate_limit(request, "metrics-flavor-summary")
    _require_metrics_admin_key(x_admin_key)

    with metrics_lock:
        baseline = metrics_cache.get("flavorBaseline", {})
        profiles = baseline.get("profiles", [])
        hist_by_year = baseline.get("histByYear", {})

        years = []
        for year_key, year_blob in hist_by_year.items():
            if not isinstance(year_blob, dict):
                continue
            axes_blob = year_blob.get("axes", {})
            axes_summary = {}
            for axis in FLAVOR_AXES:
                hist = axes_blob.get(axis, [])
                if not isinstance(hist, list) or not hist:
                    axes_summary[axis] = {"peakScore": None, "peakCount": 0, "nonZeroBuckets": 0}
                    continue
                peak_count = max(hist)
                peak_score = hist.index(peak_count) if peak_count > 0 else None
                non_zero_buckets = sum(1 for bucket in hist if int(bucket) > 0)
                axes_summary[axis] = {
                    "peakScore": peak_score,
                    "peakCount": int(peak_count),
                    "nonZeroBuckets": int(non_zero_buckets)
                }

            years.append({
                "year": str(year_key),
                "count": int(year_blob.get("count", 0)),
                "axes": axes_summary
            })

    def _year_sort_value(item: Dict[str, Any]) -> int:
        try:
            return int(item.get("year", 0))
        except (TypeError, ValueError):
            return 0

    years.sort(key=_year_sort_value, reverse=True)
    return {
        "totalProfiles": len(profiles),
        "minSamplesForQuantile": FLAVOR_BASELINE_MIN_SAMPLES,
        "maxProfilesTracked": FLAVOR_BASELINE_MAX_PROFILES,
        "years": years
    }

# Vercel bypass: Disable all persistent disk caching
IS_VERCEL = os.environ.get('VERCEL') == '1' or os.environ.get('AWS_LAMBDA_FUNCTION_NAME') is not None
DEPLOY_VERSION = "1.1.0"  # Bumped: Fixed actor/director scraping and merge logic
DEPLOY_SALT = "actor_director_fix"

def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


# Runtime guardrails for Vercel timeouts:
# keep heavy enrichment bounded so we can always return a wrapped payload.
REQUEST_SOFT_DEADLINE_SECONDS = _env_float(
    "REQUEST_SOFT_DEADLINE_SECONDS",
    52.0 if IS_VERCEL else 180.0
)
MIN_SECONDS_FOR_POSTER_SCRAPE = _env_float(
    "MIN_SECONDS_FOR_POSTER_SCRAPE",
    10.0 if IS_VERCEL else 20.0
)
MAX_POSTER_SCRAPE_FILMS = _env_int(
    "MAX_POSTER_SCRAPE_FILMS",
    110 if IS_VERCEL else 600
)
MAX_IMDB_LOOKUP_FILMS = _env_int(
    "MAX_IMDB_LOOKUP_FILMS",
    600 if IS_VERCEL else 2000
)
MAX_SCAN_FALLBACK_QUERIES = _env_int(
    "MAX_SCAN_FALLBACK_QUERIES",
    8 if IS_VERCEL else 30
)
VERBOSE_DIAGNOSTICS = _env_bool("VERBOSE_DIAGNOSTICS", False)
SCRAPE_DETAIL_LOGS = _env_bool("SCRAPE_DETAIL_LOGS", False)


def _debug_log(message: str):
    if VERBOSE_DIAGNOSTICS:
        logger.info(message)


def _time_remaining_seconds(start_ts: float) -> float:
    return REQUEST_SOFT_DEADLINE_SECONDS - (time.time() - start_ts)


# Memory-only cache for Vercel
_memory_movie_cache = {}

if not IS_VERCEL:
    CACHE_DIR = Path("cache")
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
    except:
        pass
    MOVIE_CACHE_FILE = CACHE_DIR / "movies.json"
else:
    MOVIE_CACHE_FILE = None

if not IS_VERCEL:
    METRICS_FILE = CACHE_DIR / "metrics.json"
else:
    METRICS_FILE = None


def _load_metrics():
    global metrics_cache
    if IS_VERCEL or not METRICS_FILE or not METRICS_FILE.exists():
        return
    try:
        with open(METRICS_FILE, "r", encoding="utf-8") as f:
            metrics_cache = json.load(f)
    except Exception:
        pass


def _ensure_metrics_shape():
    version = int(metrics_cache.get("schemaVersion", 0) or 0)
    metrics_cache["schemaVersion"] = METRICS_SCHEMA_VERSION
    if version != METRICS_SCHEMA_VERSION:
        logger.info(f"metrics_cache schema version update: {version} -> {METRICS_SCHEMA_VERSION}")

    metrics_cache.setdefault("totalWrappedGenerations", 0)
    metrics_cache.setdefault("uniqueUsers", {})
    metrics_cache.setdefault("events", [])
    baseline = metrics_cache.setdefault("flavorBaseline", {})
    baseline.setdefault("profiles", [])
    baseline.setdefault("histByYear", {})
    for year_key, year_blob in baseline.get("histByYear", {}).items():
        if not isinstance(year_blob, dict):
            baseline["histByYear"][year_key] = {
                "count": 0,
                "axes": {axis: _empty_axis_hist() for axis in FLAVOR_AXES}
            }
            continue
        year_blob.setdefault("count", 0)
        axes_blob = year_blob.setdefault("axes", {})
        for axis in FLAVOR_AXES:
            arr = axes_blob.get(axis)
            if not isinstance(arr, list) or len(arr) != 101:
                axes_blob[axis] = _empty_axis_hist()


def _save_metrics():
    if IS_VERCEL or not METRICS_FILE:
        return
    try:
        with open(METRICS_FILE, "w", encoding="utf-8") as f:
            json.dump(metrics_cache, f)
    except Exception:
        pass


def _hash_username(username: str) -> str:
    salt = os.environ.get("METRICS_SALT", "").strip()
    if not salt:
        _raise_api_error(503, "METRICS_NOT_CONFIGURED", "Metrics hashing is not configured.")
    normalized = (username or "").strip().lower()
    return hashlib.sha256(f"{salt}:{normalized}".encode("utf-8")).hexdigest()


def _get_client_ip(request: Request) -> str:
    x_forwarded_for = request.headers.get("x-forwarded-for", "").strip()
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _check_rate_limit(request: Request, scope: str):
    client_ip = _get_client_ip(request)
    now = time.time()
    key = f"{scope}:{client_ip}"
    with metrics_rate_lock:
        entry = metrics_rate_limits.get(key)
        if not entry or now - entry.get("window_start", 0) >= METRICS_RATE_LIMIT_WINDOW_SECONDS:
            metrics_rate_limits[key] = {"window_start": now, "count": 1}
            return

        current_count = int(entry.get("count", 0))
        if current_count >= METRICS_RATE_LIMIT_MAX_REQUESTS:
            _raise_api_error(429, "RATE_LIMITED", "Too many requests. Please try again shortly.")
        entry["count"] = current_count + 1


def _clamp_score(value: float) -> int:
    return int(max(0, min(100, round(value))))


def _cold_start_score(raw_score: float) -> int:
    return _clamp_score(raw_score * 0.85 + 7)


def _empty_axis_hist() -> List[int]:
    return [0] * 101


def _normalize_flavor_profile(target_year: int, raw_profile: Dict[str, int]):
    year_key = str(target_year)
    safe_raw = {axis: _clamp_score(raw_profile.get(axis, 50)) for axis in FLAVOR_AXES}

    with metrics_lock:
        baseline = metrics_cache.setdefault("flavorBaseline", {"profiles": [], "histByYear": {}})
        profiles = baseline.setdefault("profiles", [])
        hist_by_year = baseline.setdefault("histByYear", {})

        year_hist = hist_by_year.setdefault(
            year_key,
            {
                "count": 0,
                "axes": {axis: _empty_axis_hist() for axis in FLAVOR_AXES}
            }
        )
        year_count = int(year_hist.get("count", 0))

        if year_count < FLAVOR_BASELINE_MIN_SAMPLES:
            normalized = {axis: _cold_start_score(safe_raw[axis]) for axis in FLAVOR_AXES}
            mode = "cold_start"
        else:
            normalized = {}
            for axis in FLAVOR_AXES:
                hist = year_hist["axes"].get(axis, _empty_axis_hist())
                score = safe_raw[axis]
                cumulative = sum(hist[: score + 1])
                normalized[axis] = _clamp_score((cumulative / max(1, year_count)) * 100)
            mode = "quantile"

        profile_entry = {
            "year": target_year,
            "axes": safe_raw,
            "ts": datetime.utcnow().isoformat() + "Z"
        }
        profiles.append(profile_entry)
        for axis in FLAVOR_AXES:
            year_hist["axes"].setdefault(axis, _empty_axis_hist())
            year_hist["axes"][axis][safe_raw[axis]] += 1
        year_hist["count"] = int(year_hist.get("count", 0)) + 1

        if len(profiles) > FLAVOR_BASELINE_MAX_PROFILES:
            removed = profiles.pop(0)
            removed_year_key = str(removed.get("year"))
            removed_year_hist = hist_by_year.get(removed_year_key)
            if removed_year_hist:
                removed_axes = removed.get("axes", {})
                for axis in FLAVOR_AXES:
                    idx = _clamp_score(removed_axes.get(axis, 0))
                    axis_hist = removed_year_hist["axes"].setdefault(axis, _empty_axis_hist())
                    axis_hist[idx] = max(0, axis_hist[idx] - 1)
                removed_year_hist["count"] = max(0, int(removed_year_hist.get("count", 0)) - 1)

        _save_metrics()

    meta = {
        "raw": safe_raw,
        "normalized": normalized,
        "baselineSize": year_count,
        "normalizationMode": mode
    }
    return normalized, meta


_load_metrics()
_ensure_metrics_shape()

DEFAULT_LOCAL_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'letterboxd_imdb.db')
DB_SOURCE = os.environ.get("DB_SOURCE", "local").strip().lower()
GH_DB_OWNER = os.environ.get("GH_DB_OWNER", "").strip()
GH_DB_REPO = os.environ.get("GH_DB_REPO", "").strip()
GH_DB_TAG = os.environ.get("GH_DB_TAG", "").strip()
GH_DB_ASSET_NAME = os.environ.get("GH_DB_ASSET_NAME", "letterboxd_imdb.db").strip()
GH_DB_TOKEN = os.environ.get("GH_DB_TOKEN", "").strip()
DB_LOCAL_PATH = os.environ.get("DB_LOCAL_PATH", "").strip()
DB_PATH = DB_LOCAL_PATH or ("/tmp/letterboxd_imdb.db" if DB_SOURCE == "github_release" and IS_VERCEL else DEFAULT_LOCAL_DB_PATH)

_db_lock = threading.Lock()
_db_ready = False
_db_error = None
_db_last_attempt_ts = 0.0
DB_RETRY_COOLDOWN_SECONDS = 300

# Standard browser headers for scraping fallback
# Standard browser headers for scraping fallback
# Note: we let curl_cffi set the User-Agent to match the impersonated browser
HEADERS = {
    'Referer': 'https://letterboxd.com/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}


def _is_retryable_status(status_code: int) -> bool:
    return status_code == 429 or 500 <= status_code <= 599


async def _fetch_with_retry(
    session: AsyncSession,
    url: str,
    *,
    timeout: int = 6,
    allow_redirects: bool = True,
    retries: int = SCRAPE_MAX_RETRIES
):
    last_error: Optional[Exception] = None
    for attempt in range(retries + 1):
        try:
            response = await session.get(url, timeout=timeout, allow_redirects=allow_redirects)
            if _is_retryable_status(response.status_code) and attempt < retries:
                await asyncio.sleep(SCRAPE_RETRY_BACKOFF_SECONDS * (2 ** attempt))
                continue
            return response
        except Exception as exc:
            last_error = exc
            if attempt >= retries:
                break
            await asyncio.sleep(SCRAPE_RETRY_BACKOFF_SECONDS * (2 ** attempt))
    if last_error:
        raise last_error
    raise RuntimeError("Unknown fetch failure")

def _validate_db_file(path: str) -> bool:
    if not path or not os.path.exists(path):
        return False
    if os.path.getsize(path) < 1024 * 1024:
        logger.warning(f"DB file too small, likely invalid: {path}")
        return False

    try:
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM movie_metadata")
        movie_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM names")
        name_count = cur.fetchone()[0]
        conn.close()
        logger.info(f"DB validation ok: {movie_count} movies, {name_count} names")
        return True
    except Exception as e:
        logger.error(f"DB validation failed for {path}: {e}")
        return False

def _download_db_from_github_release(target_path: str) -> bool:
    if not (GH_DB_OWNER and GH_DB_REPO and GH_DB_TAG and GH_DB_ASSET_NAME and GH_DB_TOKEN):
        logger.error("GitHub release DB mode missing required env vars")
        return False

    release_url = f"https://api.github.com/repos/{GH_DB_OWNER}/{GH_DB_REPO}/releases/tags/{GH_DB_TAG}"
    headers = {
        "Authorization": f"Bearer {GH_DB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "letterboxd-wrapped-db-bootstrap"
    }

    try:
        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            rel_resp = client.get(release_url, headers=headers)
            if rel_resp.status_code != 200:
                logger.error(f"Failed to fetch release metadata: HTTP {rel_resp.status_code}")
                return False

            release_data = rel_resp.json()
            assets = release_data.get("assets", [])
            asset = next((a for a in assets if a.get("name") == GH_DB_ASSET_NAME), None)
            if not asset:
                logger.error(f"Release asset not found: {GH_DB_ASSET_NAME}")
                return False

            asset_api_url = asset.get("url")
            if not asset_api_url:
                logger.error("Release asset URL missing in metadata")
                return False

            download_headers = {
                **headers,
                "Accept": "application/octet-stream"
            }

            target_dir = os.path.dirname(target_path) or "."
            os.makedirs(target_dir, exist_ok=True)
            tmp_path = f"{target_path}.part"

            logger.info(f"Downloading DB asset '{GH_DB_ASSET_NAME}' from private GitHub release")
            with client.stream("GET", asset_api_url, headers=download_headers) as resp:
                if resp.status_code != 200:
                    logger.error(f"DB asset download failed: HTTP {resp.status_code}")
                    return False
                logger.info(f"DB asset download started: HTTP {resp.status_code}, size={asset.get('size')} bytes")
                with open(tmp_path, "wb") as f:
                    for chunk in resp.iter_bytes():
                        if chunk:
                            f.write(chunk)

            os.replace(tmp_path, target_path)
            logger.info(f"DB download complete: {target_path}")
            return True
    except Exception as e:
        logger.error(f"Exception while downloading DB from GitHub release: {e}")
        return False

def ensure_db_available() -> bool:
    global _db_ready, _db_error, _db_last_attempt_ts

    if DB_SOURCE not in {"local", "github_release"}:
        logger.warning(f"Unknown DB_SOURCE '{DB_SOURCE}', falling back to local")

    if _db_ready and _validate_db_file(DB_PATH):
        return True

    with _db_lock:
        if _db_ready and _validate_db_file(DB_PATH):
            return True

        if DB_SOURCE == "local":
            _db_ready = _validate_db_file(DB_PATH)
            _db_error = None if _db_ready else f"Local DB not available at {DB_PATH}"
            if not _db_ready:
                logger.warning(_db_error)
            return _db_ready

        if _validate_db_file(DB_PATH):
            _db_ready = True
            _db_error = None
            return True

        now = time.time()
        if _db_error and (now - _db_last_attempt_ts) < DB_RETRY_COOLDOWN_SECONDS:
            logger.warning("Skipping DB re-download due to cooldown")
            return False

        _db_last_attempt_ts = now
        logger.info(f"Attempting DB download from GitHub release to {DB_PATH}")
        downloaded = _download_db_from_github_release(DB_PATH)
        if not downloaded:
            _db_ready = False
            _db_error = "Failed to download DB from GitHub release"
            return False

        _db_ready = _validate_db_file(DB_PATH)
        _db_error = None if _db_ready else "Downloaded DB failed validation"
        if not _db_ready:
            logger.error(_db_error)
        return _db_ready

def get_db_metadata_context():
    if ensure_db_available():
        return "ok", "github_release" if DB_SOURCE == "github_release" else "local_db"
    return "unavailable", "none"

@app.get("/api/db/status")
async def db_status():
    status, source = get_db_metadata_context()
    return {
        "status": status,
        "source": source,
        "path": DB_PATH,
        "db_source": DB_SOURCE
    }

@app.on_event("startup")
async def bootstrap_db():
    is_prod = os.environ.get("VERCEL_ENV") == "production" or os.environ.get("ENV", "").lower() == "production"
    analytics_admin_key = os.environ.get("ANALYTICS_ADMIN_KEY", "").strip()
    metrics_salt = os.environ.get("METRICS_SALT", "").strip()
    if is_prod:
        if not analytics_admin_key:
            raise RuntimeError("Missing required env var ANALYTICS_ADMIN_KEY in production.")
        if not metrics_salt:
            raise RuntimeError("Missing required env var METRICS_SALT in production.")
        if any(origin.strip() == "*" for origin in ALLOWED_ORIGINS):
            raise RuntimeError("ALLOWED_ORIGINS must not include '*' in production.")

    ready = ensure_db_available()
    if ready:
        logger.info(f"DB ready from source={DB_SOURCE} path={DB_PATH}")
    else:
        logger.warning(f"DB unavailable at startup source={DB_SOURCE} path={DB_PATH}")

def get_movie_cache():
    if IS_VERCEL: return _memory_movie_cache
    if MOVIE_CACHE_FILE and MOVIE_CACHE_FILE.exists():
        try:
            with open(MOVIE_CACHE_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_movie_cache(cache):
    global _memory_movie_cache
    if IS_VERCEL:
        _memory_movie_cache = cache
        return
    if MOVIE_CACHE_FILE:
        with open(MOVIE_CACHE_FILE, 'w') as f:
            json.dump(cache, f)

def get_db_connection():
    if not ensure_db_available():
        raise RuntimeError(f"Database unavailable (source={DB_SOURCE}, path={DB_PATH})")
    return sqlite3.connect(DB_PATH)

ROMAN_NUMERAL_MAP = {
    "i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5",
    "vi": "6", "vii": "7", "viii": "8", "ix": "9", "x": "10",
    "xi": "11", "xii": "12", "xiii": "13", "xiv": "14", "xv": "15",
    "xvi": "16", "xvii": "17", "xviii": "18", "xix": "19", "xx": "20"
}

def _strip_trailing_brackets(text: str) -> str:
    # Remove trailing bracketed content like "(2024)" or "[Director's Cut]"
    return re.sub(r'\s*[\(\[\{][^\)\]\}]*[\)\]\}]\s*$', ' ', text or '').strip()

def _clean_text_for_matching(text: str) -> str:
    if not text:
        return ""
    t = str(text)
    # Common bad decode artifacts from uploaded CSV/title parsing
    t = t.replace("\ufffd", " ")
    # Try to repair mojibake when utf-8 bytes were decoded as latin-1/cp1252.
    if re.search(r"[ÃÂâ€]", t):
        for enc in ("latin-1", "cp1252"):
            try:
                repaired = t.encode(enc, errors="ignore").decode("utf-8", errors="ignore")
                if repaired and sum(ch.isalnum() for ch in repaired) >= sum(ch.isalnum() for ch in t):
                    t = repaired
                    break
            except Exception:
                pass
    t = html_lib.unescape(t)
    t = unicodedata.normalize("NFKC", t)
    return " ".join(t.split())

def normalize_title(title):
    """Normalize title for better matching across Letterboxd/IMDb variants."""
    if not title:
        return ""

    t = _clean_text_for_matching(title).lower()
    t = t.replace('–', '-').replace('—', '-')
    t = t.replace('’', "'")
    t = t.replace('‘', "'")
    t = t.replace('²', '2').replace('³', '3')
    t = t.replace('&', ' and ')
    t = _strip_trailing_brackets(t)

    # Replace roman numerals with arabic numbers (I-Xx)
    t = re.sub(
        r'\b(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx)\b',
        lambda m: ROMAN_NUMERAL_MAP.get(m.group(0), m.group(0)),
        t
    )

    # Remove punctuation and normalize whitespace
    t = re.sub(r'[^a-z0-9]+', ' ', t)
    t = ' '.join(t.split())
    return t

def _strip_leading_article(text: str) -> str:
    return re.sub(r'^(the|a|an)\s+', '', text or '').strip()

def _title_match_keys(title: str):
    base = normalize_title(title)
    keys = {base} if base else set()
    no_article = _strip_leading_article(base)
    if no_article:
        keys.add(no_article)
    return keys

def is_placeholder_poster_url(url: str) -> bool:
    return bool(url) and "empty-poster" in url

def _film_url_candidates(slug: str, source_url: Optional[str] = None) -> List[str]:
    """
    Build resilient Letterboxd film URL candidates for scraping.
    Upload-derived slugs often include a year suffix (e.g. "title-2025"),
    while canonical Letterboxd film slugs frequently omit that suffix.
    """
    candidates: List[str] = []
    seen = set()

    def _add(url: Optional[str]):
        if not url:
            return
        normalized = str(url).strip()
        if not normalized:
            return
        if normalized.startswith("https://letterboxd.com/film/") and not normalized.endswith("/"):
            normalized = f"{normalized}/"
        key = normalized.lower()
        if key in seen:
            return
        seen.add(key)
        candidates.append(normalized)

    if source_url:
        if "boxd.it" in source_url:
            _add(source_url)
        elif "/film/" in source_url:
            try:
                film_slug = source_url.split("/film/")[1].split("/")[0].strip()
                if film_slug:
                    _add(f"https://letterboxd.com/film/{film_slug}/")
            except Exception:
                pass

    if slug:
        _add(f"https://letterboxd.com/film/{slug}/")
        stripped_year_slug = re.sub(r"-\d{4}$", "", slug)
        if stripped_year_slug and stripped_year_slug != slug:
            _add(f"https://letterboxd.com/film/{stripped_year_slug}/")

    return candidates

def _parse_runtime_minutes(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        parsed = int(value)
        return parsed if parsed > 0 else None
    text = str(value)
    match = re.search(r'(\d{1,3})\s*(?:mins?|minutes?)?', text, re.I)
    if not match:
        return None
    parsed = int(match.group(1))
    return parsed if parsed > 0 else None

def _safe_rating_value(value: Any) -> float:
    if value is None:
        return 0.0
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    if parsed <= 0:
        return 0.0
    return parsed

def is_runtime_plausible(runtime: Any, genres: Optional[List[str]] = None) -> bool:
    minutes = _parse_runtime_minutes(runtime)
    if minutes is None:
        return False
    if minutes > 400:
        return False
    genres_norm = {str(g).strip().lower() for g in (genres or []) if g}
    if "short" in genres_norm:
        return 1 <= minutes <= 60
    # Non-shorts below 40min are usually parser mistakes for feature diaries.
    return minutes >= 40

def _extract_summary_hours_from_html(html: str, year_hint: Optional[int] = None) -> Tuple[Optional[int], Optional[str]]:
    if not html:
        return None, None

    soup = BeautifulSoup(html, 'lxml')
    max_hours = 24 * 366

    def _parse_candidate(raw: Any) -> Optional[int]:
        if raw is None:
            return None
        token = re.sub(r'[^\d]', '', str(raw))
        if not token:
            return None
        value = int(token)
        if value <= 0 or value > max_hours:
            return None
        if year_hint and value == int(year_hint):
            return None
        return value

    # Strategy 1: explicit table headers/cells for hours
    for table in soup.find_all('table'):
        headers = [th.get_text(" ", strip=True).lower() for th in table.find_all('th')]
        hour_indexes = [i for i, h in enumerate(headers) if re.search(r'\bhours?\b|\bhrs?\b', h)]
        if not hour_indexes:
            continue
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if not cells:
                continue
            for idx in hour_indexes:
                if idx >= len(cells):
                    continue
                candidate = _parse_candidate(cells[idx].get_text(" ", strip=True))
                if candidate is not None:
                    return candidate, "summary_table"

    patterns = [
        r'(\d+)\s*(?:hours?|hrs?)\s*watched',
        r'watched\s*(\d+)\s*(?:hours?|hrs?)',
        r'(?:hours?|hrs?)\s*[:\-]?\s*(\d+)',
        r'(\d+)\s*(?:hours?|hrs?)'
    ]

    # Strategy 2: label-adjacent parsing around nodes mentioning "hours"
    labels = soup.find_all(
        lambda tag: tag.name in ['p', 'span', 'h2', 'h3', 'h4', 'th', 'td', 'div']
        and re.search(r'\bhours?\b|\bhrs?\b', tag.get_text(" ", strip=True), re.I)
    )
    for label in labels:
        contexts = [
            label.get_text(" ", strip=True),
            (label.parent.get_text(" ", strip=True) if label.parent else ""),
            (label.previous_sibling.get_text(" ", strip=True) if getattr(label, "previous_sibling", None) and hasattr(label.previous_sibling, "get_text") else str(label.previous_sibling or "")),
            (label.next_sibling.get_text(" ", strip=True) if getattr(label, "next_sibling", None) and hasattr(label.next_sibling, "get_text") else str(label.next_sibling or "")),
        ]
        for text in contexts:
            if not text:
                continue
            for pattern in patterns:
                match = re.search(pattern, text, re.I)
                if not match:
                    continue
                candidate = _parse_candidate(match.group(1))
                if candidate is not None:
                    return candidate, "summary_label_context"

    # Strategy 3: global text fallback
    page_text = soup.get_text(" ", strip=True)
    for pattern in patterns:
        match = re.search(pattern, page_text, re.I)
        if not match:
            continue
        candidate = _parse_candidate(match.group(1))
        if candidate is not None:
            return candidate, "summary_regex"

    return None, None

def smart_fallback_runtime(genres=None, year=None):
    """
    Provide intelligent runtime fallback based on context.
    Returns (runtime_minutes, source_label)
    """
    genres = genres or []
    
    # Genre-based estimates (based on industry averages)
    if 'Documentary' in genres:
        return 85, "fallback_documentary"
    if 'Short' in genres:
        return 20, "fallback_short"

    # Default fallback for all non-short/non-documentary titles
    return 120, "fallback_modern"


def _title_query_variants(title: str) -> List[str]:
    """
    Build bounded title variants for indexed lookups.
    Bug-fix note: we deliberately keep this list small so lookups stay fast
    in serverless, while still handling common punctuation drift.
    """
    clean = _clean_text_for_matching(title)
    if not clean:
        return []

    variants: List[str] = []
    seen = set()

    def _add(candidate: Optional[str]):
        if not candidate:
            return
        normalized = " ".join(str(candidate).split()).strip()
        if not normalized:
            return
        key = normalized.lower()
        if key in seen:
            return
        seen.add(key)
        variants.append(normalized)

    canonical_punct = (
        clean
        .replace("–", "-")
        .replace("—", "-")
        .replace("’", "'")
        .replace("‘", "'")
    )
    _add(clean)
    _add(canonical_punct)
    _add(_strip_trailing_brackets(clean))
    _add(_strip_trailing_brackets(canonical_punct))
    _add(re.sub(r'^(the|a|an)\s+', '', canonical_punct, flags=re.I))
    return variants


def _choose_best_imdb_candidate(
    candidates: List[Tuple[Any, ...]],
    target_year: Optional[int],
    orig_title: str
) -> Optional[Tuple[Any, ...]]:
    if not candidates:
        return None

    orig_norm = normalize_title(orig_title)
    best = None
    best_score = None
    for row in candidates:
        db_title = row[0]
        db_year = row[1]
        norm_penalty = 0 if normalize_title(db_title) == orig_norm else 1
        if target_year and db_year:
            year_distance = abs(int(db_year) - int(target_year))
        elif target_year:
            year_distance = 99
        else:
            year_distance = 0
        # Shorter canonical titles are slightly preferred on ties to avoid noisy alternates.
        score = (norm_penalty, year_distance, len(str(db_title or "")))
        if best is None or score < best_score:
            best = row
            best_score = score
    return best


def batch_lookup_imdb_metadata(movie_list):
    """
    movie_list: list of tuples (title, year)
    Returns a dict mapping (title, year) -> metadata
    """
    if not ensure_db_available():
        return {}

    results = {}
    try:
        conn = get_db_connection()
        conn.execute("PRAGMA query_only = 1")
        conn.execute("PRAGMA temp_store = MEMORY")
        cursor = conn.cursor()

        # De-dupe requests first so rewatches don't amplify DB work.
        unique_requests: List[Tuple[str, Optional[int]]] = []
        seen_pairs = set()
        for title, year in movie_list:
            key = (title, year)
            if key in seen_pairs:
                continue
            seen_pairs.add(key)
            unique_requests.append((title, year))

        title_row_cache: Dict[str, List[Tuple[Any, ...]]] = {}
        scan_fallback_remaining = MAX_SCAN_FALLBACK_QUERIES

        def _query_rows_for_variant(variant: str) -> List[Tuple[Any, ...]]:
            cache_key = variant.lower()
            if cache_key in title_row_cache:
                return title_row_cache[cache_key]
            # Uses idx_title (primaryTitle) and avoids table scans from year-bucket strategy.
            cursor.execute(
                """
                SELECT primaryTitle, startYear, runtimeMinutes, genres, directors, actors
                FROM movie_metadata
                WHERE primaryTitle = ? COLLATE NOCASE
                """,
                (variant,)
            )
            rows = cursor.fetchall()
            title_row_cache[cache_key] = rows
            return rows

        for orig_title, target_year in unique_requests:
            clean_title = _clean_text_for_matching(orig_title)
            variants = _title_query_variants(clean_title)
            candidate_rows: List[Tuple[Any, ...]] = []
            seen_row_keys = set()

            for variant in variants:
                rows = _query_rows_for_variant(variant)
                for row in rows:
                    row_key = (row[0], row[1])
                    if row_key in seen_row_keys:
                        continue
                    seen_row_keys.add(row_key)
                    candidate_rows.append(row)

            # Bounded slow fallback for exceptional encoding/title-shape drift.
            # This is capped to protect serverless runtime from repeated scans.
            if not candidate_rows and scan_fallback_remaining > 0 and clean_title:
                scan_fallback_remaining -= 1
                cursor.execute(
                    """
                    SELECT primaryTitle, startYear, runtimeMinutes, genres, directors, actors
                    FROM movie_metadata
                    WHERE LOWER(primaryTitle) = LOWER(?)
                    """,
                    (clean_title,)
                )
                candidate_rows = cursor.fetchall()

            best = _choose_best_imdb_candidate(candidate_rows, target_year, clean_title)
            if not best:
                continue

            runtime_value = best[2] if best[2] else None
            results[(orig_title, target_year)] = {
                "runtime": runtime_value,
                "runtime_source": "imdb" if runtime_value else None,
                "genres": best[3].split(',') if best[3] else [],
                "director_ids": best[4].split(',') if best[4] else [],
                "actor_ids": best[5].split(',') if best[5] else [],
                "directors": [],
                "actors": []
            }

        # Batch director and actor names
        all_name_ids = set()
        for meta in results.values():
            all_name_ids.update(meta["director_ids"][:2])
            all_name_ids.update(meta["actor_ids"][:MAX_ACTOR_CREDITS])

        if all_name_ids:
            name_list = list(all_name_ids)
            name_lookup = {}
            for i in range(0, len(name_list), 50):
                n_batch = name_list[i:i+50]
                placeholders = ','.join(['?'] * len(n_batch))
                cursor.execute(f'SELECT nconst, primaryName FROM names WHERE nconst IN ({placeholders})', n_batch)
                name_lookup.update(dict(cursor.fetchall()))
            
            for res in results.values():
                res["directors"] = [name_lookup[id] for id in res["director_ids"][:2] if id in name_lookup]
                res["actors"] = [name_lookup[id] for id in res["actor_ids"][:MAX_ACTOR_CREDITS] if id in name_lookup]

        conn.close()
        logger.info(f"IMDb lookup returned {len(results)} results")

        # Log sample results only in verbose debug mode.
        if results:
            sample = list(results.items())[0]
            _debug_log(
                f"IMDb sample: {sample[0]} -> runtime={sample[1].get('runtime')} "
                f"directors={sample[1].get('directors')}"
            )
    except Exception as e:
        logger.exception(f"Batch DB lookup error: {e}")
    return results

def lookup_imdb_metadata(title, year):
    # This is now a wrapper for smaller lookups or fallbacks
    res = batch_lookup_imdb_metadata([(title, year)])
    return res.get((title, year))


async def scrape_letterboxd_summary_hours(username: str, year: int = 2025):
    """
    Scrape total runtime hours from Letterboxd summary page.
    Returns (hours, source) or (None, None) if failed.
    """
    try:
        summary_url = f"https://letterboxd.com/{username}/year/{year}/summary/"
        
        async with AsyncSession(impersonate="chrome") as session:
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            })
            
            _debug_log(f"[SUMMARY] Fetching {summary_url}")
            r = await session.get(summary_url, timeout=10, allow_redirects=True)
            
            if r.status_code != 200:
                _debug_log(f"[SUMMARY] Failed to fetch: HTTP {r.status_code}")
                return None, None

            hours, source = _extract_summary_hours_from_html(r.text, year_hint=year)
            if hours is not None:
                _debug_log(f"[SUMMARY] Found total hours: {hours} via {source}")
                return hours, "letterboxd_summary"

            _debug_log("[SUMMARY] Could not extract hours from summary page")
            return None, None
            
    except Exception as e:
        logger.warning(f"[SUMMARY] Error scraping summary: {e}")
        return None, None

def _entry_year(entry: dict) -> Optional[int]:
    date_str = entry.get("date")
    if not date_str:
        return None
    try:
        return int(date_str[:4])
    except Exception:
        return None

def _filter_entries_by_year(entries: List[dict], year: int) -> List[dict]:
    filtered = [e for e in entries if _entry_year(e) == year]
    return sorted(filtered, key=lambda x: x.get("date") or "")


def _rank_rewatch_keys(
    counts_by_key: Dict[Tuple[str, Optional[int]], int],
    ratings_by_key: Dict[Tuple[str, Optional[int]], float]
) -> List[Tuple[str, Optional[int]]]:
    return sorted(
        list(counts_by_key.keys()),
        key=lambda key: (
            -int(counts_by_key.get(key, 0)),
            -float(ratings_by_key.get(key, 0)),
            str(key[0]).lower(),
            str(key[1] or "")
        )
    )


def _cleanup_upload_sessions():
    now = time.time()
    stale_ids = [
        session_id
        for session_id, payload in upload_sessions.items()
        if (now - payload.get("created_at", now)) > UPLOAD_SESSION_TTL_SECONDS
    ]
    for session_id in stale_ids:
        upload_sessions.pop(session_id, None)

async def calculate_stats(
    username: str,
    real_name: str,
    all_entries: List[dict],
    target_year: int = 2025,
    request_id: Optional[str] = None
):
    """Shared logic to calculate stats from a list of diary entries"""
    if not all_entries:
        return {"username": username, "status": "no_films_in_year", "year": target_year}

    unique_years = sorted({y for y in (_entry_year(e) for e in all_entries) if y is not None})
    if unique_years != [target_year]:
        sample_dates = [e.get("date") for e in all_entries[:5]]
        raise HTTPException(
            status_code=400,
            detail=(
                f"Year scope mismatch for stats calculation. target_year={target_year}, "
                f"entry_years={unique_years}, sample_dates={sample_dates}"
            )
        )

    request_id = request_id or str(uuid.uuid4())
    logger.info(f"[req={request_id}] calculate_stats start user={username} year={target_year} entries={len(all_entries)}")

    import time
    t_start = time.time()
    movie_cache = get_movie_cache()
    _debug_log(
        f"[req={request_id}] runtime budget={REQUEST_SOFT_DEADLINE_SECONDS:.1f}s "
        f"vercel={IS_VERCEL}"
    )
    
    # A. Scrape authoritative total hours from Letterboxd summary (ground truth)
    total_hours_scraped = None
    # Skiping summary scraping as per user request to use calculated values with disclaimer
    # total_hours_scraped, hours_source = await scrape_letterboxd_summary_hours(username, target_year)
    
    # Keep deep diagnostics behind a flag to avoid log-volume overhead in production.
    if VERBOSE_DIAGNOSTICS:
        logger.info("[DEBUG] First 3 entries:")
        for e in all_entries[:3]:
            logger.info(f"  - {e.get('name')} ({e.get('release')}) | slug: {e.get('slug')}")
    
    # B. IMDb Batch Lookup (Local DB)
    tb = time.time()
    def _needs_imdb(slug):
        m = movie_cache.get(slug, {})
        if not m:
            return True
        # Trigger IMDb lookup if critical metadata is missing
        if not m.get("runtime"):
            return True
        if not m.get("genres"):
            return True
        if not m.get("directors"):
            return True
        actors = m.get("actors", []) or []
        if not actors or len(actors) < 6:
            return True
        actors_limit = int(m.get("actors_limit") or 0)
        # Refresh older cached records that were truncated at the previous actor cap.
        if len(actors) >= 12 and actors_limit < MAX_ACTOR_CREDITS:
            return True
        return False

    # Bug-fix: de-dupe by slug first so rewatches do not trigger repeated DB lookups.
    to_fetch_by_slug: Dict[str, dict] = {}
    for entry in all_entries:
        slug = entry["slug"]
        if not _needs_imdb(slug):
            continue
        existing = to_fetch_by_slug.get(slug)
        if existing is None or _safe_rating_value(entry.get("rating")) > _safe_rating_value(existing.get("rating")):
            # Keep the strongest-rated occurrence for prioritization if we need caps.
            to_fetch_by_slug[slug] = entry
    to_fetch = list(to_fetch_by_slug.values())
    to_fetch.sort(key=lambda e: _safe_rating_value(e.get("rating")), reverse=True)

    if len(to_fetch) > MAX_IMDB_LOOKUP_FILMS:
        logger.warning(
            f"[req={request_id}] IMDb lookup capped from {len(to_fetch)} to {MAX_IMDB_LOOKUP_FILMS} "
            f"to protect runtime"
        )
        to_fetch = to_fetch[:MAX_IMDB_LOOKUP_FILMS]

    logger.info(
        f"[req={request_id}] Need IMDb metadata for {len(to_fetch)} unique films "
        f"(cache size={len(movie_cache)})"
    )
    if to_fetch:
        imdb = batch_lookup_imdb_metadata([(e['name'], e['release']) for e in to_fetch])
        logger.info(f"[req={request_id}] IMDb lookup returned {len(imdb)} results")
        imdb_miss_count = 0
        for e in to_fetch:
            res = imdb.get((e['name'], e['release']))
            if res:
                movie_cache[e['slug']] = {
                    "title": e['name'], "runtime": res["runtime"], "genres": res["genres"],
                    "release": e['release'], "directors": res["directors"], "actors": res["actors"],
                    "poster": None, "rating": e['rating'], "source": "imdb",
                    "actors_limit": MAX_ACTOR_CREDITS
                }
            else:
                imdb_miss_count += 1
                _debug_log(f"[DEBUG] NOT FOUND in IMDb: {e['name']} ({e['release']})")
        if imdb_miss_count:
            logger.info(f"[req={request_id}] IMDb misses={imdb_miss_count}")
    logger.info(f"[req={request_id}] IMDb lookup took {time.time()-tb:.2f}s")
    
    # B2. Scrape hours from Letterboxd summary (robust multi-strategy)
    total_hours_scraped = 0
    try:
        scraped_hours, scraped_source = await scrape_letterboxd_summary_hours(username, target_year)
        if scraped_hours and scraped_hours > 0:
            total_hours_scraped = int(scraped_hours)
            logger.info(f"[{username}] Scraped hours from Letterboxd: {total_hours_scraped} [{scraped_source}]")
        else:
            # Retry once and parse with shared HTML extractor for transient page variants.
            async with AsyncSession(impersonate="chrome") as session:
                session.headers.update(HEADERS)
                url = f"https://letterboxd.com/{username}/year/{target_year}/summary/"
                r = await _fetch_with_retry(session, url, timeout=10, allow_redirects=True)
                if r.status_code == 200:
                    retry_hours, retry_source = _extract_summary_hours_from_html(r.text, year_hint=target_year)
                    if retry_hours and retry_hours > 0:
                        total_hours_scraped = int(retry_hours)
                        logger.info(f"[{username}] Scraped hours from Letterboxd: {total_hours_scraped} [{retry_source}_retry]")
    except Exception as e:
        logger.warning(f"[{username}] Failed to scrape hours: {e}")

    # C. Poster Scrape (Concurrency limited)
    unique_entries = sorted(
        {e["slug"]: e for e in all_entries}.values(),
        key=lambda x: _safe_rating_value(x.get('rating')),
        reverse=True
    )
    # Prioritize higher-impact titles first so top cards remain quality even if we
    # must truncate scraping near timeout.
    scrape_slugs = [e['slug'] for e in unique_entries]
    
    # Map slug to URI for more accurate scraping if provided in upload.
    slug_to_uri = {e['slug']: e.get('uri') for e in all_entries if e.get('uri')}
    
    needs_scrape = []
    for s in scrape_slugs:
        m = movie_cache.get(s, {})
        # Rescrape if critical metadata is missing
        if not m.get('poster') or len(m.get('actors', [])) < 12 or not m.get('genres') or not m.get('directors') or not m.get('release') or not m.get('runtime'):
            needs_scrape.append(s)

    # Bug-fix guardrail: bound enrichment work so serverless requests finish.
    remaining_before_scrape = _time_remaining_seconds(t_start)
    if remaining_before_scrape < MIN_SECONDS_FOR_POSTER_SCRAPE:
        logger.warning(
            f"[req={request_id}] Skipping poster scrape; remaining budget={remaining_before_scrape:.2f}s"
        )
        needs_scrape = []
    elif len(needs_scrape) > MAX_POSTER_SCRAPE_FILMS:
        logger.warning(
            f"[req={request_id}] Poster scrape capped from {len(needs_scrape)} to {MAX_POSTER_SCRAPE_FILMS} "
            f"to avoid timeout"
        )
        needs_scrape = needs_scrape[:MAX_POSTER_SCRAPE_FILMS]

    if needs_scrape:
        tp = time.time()
        scrape_deadline_ts = time.time() + max(2.0, remaining_before_scrape - 2.0)
        # Create a session just for poster scraping if needed
        async with AsyncSession(impersonate="chrome") as session:
            session.headers.update(HEADERS)
            sem = asyncio.Semaphore(15) 
            
            async def fetch_poster_data(slug):
                async with sem:
                    try:
                        if time.time() >= scrape_deadline_ts:
                            # Deadline guard: stop launching new network calls when
                            # we're close to the function timeout budget.
                            return slug, None

                        # Try resilient URL candidates so actor/director extraction does not
                        # fail just because one poster URL path is invalid.
                        url = None
                        r = None
                        url_candidates = _film_url_candidates(slug, slug_to_uri.get(slug))
                        for candidate_url in url_candidates:
                            if time.time() >= scrape_deadline_ts:
                                return slug, None
                            response = await _fetch_with_retry(session, candidate_url, timeout=6, allow_redirects=True)
                            if response.status_code == 200:
                                url = candidate_url
                                r = response
                                break
                            logger.warning(f"[SCRAPE] Non-200 for {slug} from {candidate_url}: HTTP {response.status_code}")

                        if not r:
                            _debug_log(f"[SCRAPE] Failed to fetch {slug} after {len(url_candidates)} URL attempts")
                            return slug, None
                        
                        text = r.text
                        _debug_log(f"[SCRAPE] Successfully fetched {slug} from {url}")
                        # If we somehow got a review/diary page, retry the actual film page
                        if 'letterboxd:review' in text or 'letterboxd:diary' in text:
                            final_url = str(getattr(r, "url", "")) or url
                            match = re.search(r'/film/([^/]+)/', final_url)
                            extracted_slug = match.group(1) if match else None

                            if not extracted_slug:
                                canonical_tag = re.search(r'<link rel="canonical" href="https://letterboxd.com/film/([^/]+)/"', text)
                                extracted_slug = canonical_tag.group(1) if canonical_tag else None

                            if extracted_slug:
                                fallback_url = f"https://letterboxd.com/film/{extracted_slug}/"
                            else:
                                fallback_url = f"https://letterboxd.com/film/{slug}/"

                            if fallback_url != url:
                                r = await _fetch_with_retry(session, fallback_url, timeout=6, allow_redirects=True)
                                if r.status_code == 200:
                                    url = fallback_url
                                    text = r.text
                                    _debug_log(f"[SCRAPE] Retried film page for {slug}: {url}")
                        # Debug: log a short HTML prefix to compare prod vs localhost
                        if SCRAPE_DETAIL_LOGS:
                            html_prefix = re.sub(r'\s+', ' ', text[:1000])
                            logger.info(f"[{slug}] HTML prefix: {html_prefix}")
                        
                        # Poster extraction (prefer true poster art over backdrops)
                        poster = None
                        s = BeautifulSoup(text, 'lxml')

                        def _is_placeholder_poster(url: str) -> bool:
                            return bool(url) and "empty-poster" in url

                        def _pick_poster_url(img_tag):
                            if not img_tag: return None
                            for attr in ["data-src", "data-original", "data-lazy-src", "data-srcset", "srcset", "src"]:
                                v = img_tag.get(attr)
                                if v and "data:image" not in v:
                                    if "srcset" in attr:
                                        return v.split(",")[0].strip().split(" ")[0]
                                    return v
                            return None

                        # 1) Prefer poster image from poster/film-poster containers
                        poster_img = s.select_one("div.poster img") or s.select_one("div.film-poster img") or s.select_one("img.image")
                        poster = _pick_poster_url(poster_img)
                        if poster and _is_placeholder_poster(poster):
                            poster = None
                        if SCRAPE_DETAIL_LOGS:
                            if poster and ("poster" in poster or "film-poster" in poster):
                                logger.info(f"[{slug}] Found poster via poster image: {poster}")
                            elif poster:
                                # Poster image found but URL doesn't include poster keywords
                                logger.info(f"[{slug}] Found poster via image tag: {poster}")

                        # 2) data-film-poster attribute fallback
                        if not poster:
                            dfp_match = re.search(r'data-film-poster=\"([^\"]+)\"', text)
                            if dfp_match:
                                poster = dfp_match.group(1)
                                if poster and _is_placeholder_poster(poster):
                                    poster = None
                                if poster and SCRAPE_DETAIL_LOGS:
                                    logger.info(f"[{slug}] Found poster via data-film-poster: {poster}")

                        # 3) JSON-LD image as fallback (often backdrop)
                        if not poster:
                            json_match = re.search(r'<script type="application/ld\+json">(.*?)</script>', text, re.DOTALL)
                            if json_match:
                                try: 
                                    ld = json.loads(json_match.group(1))
                                    if isinstance(ld, list): ld = ld[0]
                                    poster = ld.get('image')
                                    if poster and _is_placeholder_poster(poster):
                                        poster = None
                                    if poster and SCRAPE_DETAIL_LOGS:
                                        logger.info(f"[{slug}] Found poster via JSON-LD: {poster}")
                                except Exception as e:
                                    logger.warning(f"[{slug}] JSON-LD parse failed: {e}")

                        # 4) og:image / twitter:image fallback as last resort (usually backdrop)
                        if not poster and SCRAPE_DETAIL_LOGS:
                            logger.info(f"[{slug}] No poster image found, checking og:image / twitter:image")
                        if not poster:
                            og_match = re.search(r'property=\"og:image\" content=\"([^\"]+)\"', text)
                            tw_match = re.search(r'name=\"twitter:image\" content=\"([^\"]+)\"', text)
                            poster = (og_match.group(1) if og_match else None) or (tw_match.group(1) if tw_match else None)
                            if poster and _is_placeholder_poster(poster):
                                poster = None
                            if poster and SCRAPE_DETAIL_LOGS:
                                logger.info(f"[{slug}] Found poster via og/twitter image: {poster}")
                            elif SCRAPE_DETAIL_LOGS:
                                logger.warning(f"[{slug}] No poster found via og/twitter image")
                        
                        avg = 0
                        avg_match = re.search(r'name="twitter:data2" content="([\d\.]+)', text)
                        if avg_match: avg = float(avg_match.group(1)) * 2
                        
                        
                        # Actor extraction diagnostics are verbose; keep behind flag.
                        if SCRAPE_DETAIL_LOGS:
                            logger.info(f"[{slug}] Response status: {r.status_code}")
                            logger.info(f"[{slug}] HTML length: {len(text)}")
                            logger.info(f"[{slug}] Contains 'cast-list': {'cast-list' in text}")
                            logger.info(f"[{slug}] Contains 'tab-cast': {'tab-cast' in text}")
                        
                        actors = []
                        cast_list = s.find('div', class_='cast-list')
                        if SCRAPE_DETAIL_LOGS:
                            logger.info(f"[{slug}] cast_list found: {cast_list is not None}")
                        
                        if cast_list:
                            actors = [a.text.strip() for a in cast_list.find_all('a', href=re.compile(r'/actor/'))[:MAX_ACTOR_CREDITS]]
                            if SCRAPE_DETAIL_LOGS:
                                logger.info(f"[{slug}] Actors found via cast-list: {len(actors)}")
                        else:
                            if SCRAPE_DETAIL_LOGS:
                                logger.warning(f"[{slug}] No cast-list div, trying tab-cast")
                            tab_cast = s.find('div', id='tab-cast')
                            if tab_cast:
                                actors = [a.text.strip() for a in tab_cast.find_all('a', href=re.compile(r'/actor/'))[:MAX_ACTOR_CREDITS]]
                                if SCRAPE_DETAIL_LOGS:
                                    logger.info(f"[{slug}] Actors from tab-cast: {len(actors)}")
                            else:
                                if SCRAPE_DETAIL_LOGS:
                                    logger.error(f"[{slug}] No tab-cast div either!")
                        
                        # Director extraction (fallback)
                        d_links = s.find_all('a', href=re.compile(r'/director/'))
                        if not d_links:
                            d_label = s.find('span', string=re.compile(r'Director', re.I))
                            if d_label:
                                d_links = d_label.find_next_sibling('span').find_all('a')
                        directors = list(dict.fromkeys([d.text.strip() for d in d_links]))
                        
                        # Genre extraction (fallback)
                        g_links = s.find_all('a', href=re.compile(r'/films/genre/'))
                        genres = list(dict.fromkeys([g.text.strip() for g in g_links]))
 
                        # Release Year
                        release = None
                        y_match = re.search(r'/films/year/(\d{4})/', text)
                        if y_match: release = int(y_match.group(1))
 
                        countries = []
                        details = s.find('div', id='tab-details')
                        if details:
                            c_links = details.find_all('a', href=re.compile(r'/films/country/'))
                            countries = [c.text.strip() for c in c_links]
                        
                        # Runtime - Multiple extraction strategies
                        runtime = None
                        runtime_source = None
                        
                        # Strategy 1: Look for "text-link text-footer" class (most reliable)
                        footer_links = s.find_all('a', class_='text-link text-footer')
                        for link in footer_links:
                            rt_match = re.search(r'(\d+)\s*(?:mins?|minutes?)', link.text, re.I)
                            if rt_match:
                                runtime = int(rt_match.group(1))
                                runtime_source = "letterboxd_footer"
                                break
                        
                        # Strategy 2: Search near explicit Runtime label in details tab
                        if not runtime and details:
                            runtime_candidates = details.find_all(
                                lambda tag: tag.name in ['h3', 'h4', 'dt', 'th', 'span', 'p', 'strong']
                                and 'runtime' in tag.get_text(strip=True).lower()
                            )
                            for label in runtime_candidates:
                                scope = label.find_parent(['li', 'tr', 'section', 'div']) or label.parent
                                if not scope:
                                    continue
                                scope_text = scope.get_text(" ", strip=True)
                                rt_match = re.search(r'(\d{1,3})\s*(?:mins?|minutes?)', scope_text, re.I)
                                if rt_match:
                                    runtime = int(rt_match.group(1))
                                    runtime_source = "letterboxd_details"
                                    break
                        
                        # Strategy 3: Parse JSON-LD duration (PT123M) when available
                        if not runtime:
                            ld_scripts = s.find_all('script', type='application/ld+json')
                            for script in ld_scripts:
                                raw = (script.string or script.get_text() or '').strip()
                                if not raw:
                                    continue
                                try:
                                    payload = json.loads(raw)
                                except Exception:
                                    continue
                                entries = payload if isinstance(payload, list) else [payload]
                                for item in entries:
                                    if not isinstance(item, dict):
                                        continue
                                    duration = item.get('duration')
                                    if isinstance(duration, str):
                                        # ISO-8601 duration like PT123M
                                        d_match = re.search(r'PT(?:(\d+)H)?(?:(\d+)M)?', duration, re.I)
                                        if d_match:
                                            hours = int(d_match.group(1) or 0)
                                            minutes = int(d_match.group(2) or 0)
                                            parsed = (hours * 60) + minutes
                                            if parsed > 0:
                                                runtime = parsed
                                                runtime_source = "jsonld_duration"
                                                break
                                if runtime:
                                    break

                        # Strategy 4: conservative page-level fallback:
                        # only parse snippets that explicitly contain "Runtime"
                        if not runtime:
                            runtime_snippets = s.find_all(string=re.compile(r'runtime', re.I))
                            for snippet in runtime_snippets:
                                snippet_text = str(snippet)
                                parent = getattr(snippet, "parent", None)
                                if parent:
                                    snippet_text = parent.get_text(" ", strip=True)
                                rt_match = re.search(r'(\d{1,3})\s*(?:mins?|minutes?)', snippet_text, re.I)
                                if rt_match:
                                    runtime = int(rt_match.group(1))
                                    runtime_source = "runtime_snippet"
                                    break

                        # Guardrail: reject implausible extracted runtimes and fallback later.
                        if runtime and not is_runtime_plausible(runtime, genres):
                            logger.warning(f"[{slug}] Implausible runtime parsed ({runtime}min via {runtime_source}); fallback required")
                            runtime = None
                            runtime_source = None
                        
                        # Log if runtime not found
                        if not runtime:
                            _debug_log(f"[SCRAPE] WARNING: No runtime found for {slug}")
                        
                        return slug, {
                            "poster": poster, 
                            "avg_rating": avg, 
                            "actors": actors, 
                            "directors": directors, 
                            "genres": genres, 
                            "release": release, 
                            "countries": countries, 
                            "runtime": runtime,
                            "runtime_source": runtime_source
                        }
                    except Exception as e:
                        logger.warning(f"[SCRAPE] Error scraping {slug}: {e}")
                        return slug, None

            p_results = await asyncio.gather(*[fetch_poster_data(s) for s in needs_scrape], return_exceptions=True)
            actors_found = 0
            total_actors_count = 0
            scrape_exceptions = 0
            for res in p_results:
                if isinstance(res, Exception):
                    scrape_exceptions += 1
                    logger.warning(f"[req={request_id}] poster scrape task failed: {res}")
                    continue
                if res and res[1]:
                    slug, data = res
                    if data.get('actors'):
                        actors_found += 1
                        total_actors_count += len(data['actors'])
                    if slug in movie_cache:
                        # Prefer scraped runtime over IMDb if available
                        if data.get('runtime'):
                            movie_cache[slug]['runtime'] = data['runtime']
                            movie_cache[slug]['runtime_source'] = data.get('runtime_source', 'letterboxd')
                        
                        # Update other fields - but DON'T overwrite IMDb data with empty arrays
                        for key in ['poster', 'avg_rating', 'release', 'countries']:
                            if key in data:
                                movie_cache[slug][key] = data[key]
                        
                        # Merge scraped + IMDb lists instead of replacing outright.
                        # This avoids undercounts when one source is partial for a given title.
                        for key in ['actors', 'directors', 'genres']:
                            if key in data and data[key]:
                                existing = movie_cache[slug].get(key, []) or []
                                merged = []
                                seen = set()
                                for value in list(existing) + list(data[key]):
                                    norm = str(value or '').strip()
                                    if not norm:
                                        continue
                                    k_norm = norm.lower()
                                    if k_norm in seen:
                                        continue
                                    seen.add(k_norm)
                                    merged.append(norm)
                                movie_cache[slug][key] = merged
                        if data.get('actors'):
                            movie_cache[slug]['actors_limit'] = MAX_ACTOR_CREDITS
                    else:
                        movie_cache[slug] = {**data, "source": "scraped", "actors_limit": MAX_ACTOR_CREDITS}
            logger.info(f"Found actors in {actors_found}/{len(needs_scrape)} scraped films (total {total_actors_count} actors)")
            if scrape_exceptions:
                logger.warning(f"[req={request_id}] scrape exceptions count={scrape_exceptions}")
        logger.info(f"[req={request_id}] Poster scraping took {time.time()-tp:.2f}s")
    
    # 4. Final Processing & Stats
    total_mins = 0
    dirs, actors_count, genres, decades, activity = {}, {}, {}, {}, {}
    activity_movies = {}
    rating_dist = {str(r/2): 0 for r in range(1, 11)} 
    
    guilty_candidate = {"diff": -1, "title": None}
    diff_sum = 0
    diff_count = 0
    
    fallback_count = 0
    missing_runtime_films = []
    invalid_runtime_rejections = 0
    runtime_source_counts: Dict[str, int] = {}

    # Baseline fallback for entries with missing genres: use median plausible runtime from this upload.
    known_runtime_samples = []
    for e in all_entries:
        m = movie_cache.get(e['slug'], {})
        sample_runtime = _parse_runtime_minutes(m.get('runtime'))
        sample_genres = m.get('genres', [])
        if sample_runtime is not None and is_runtime_plausible(sample_runtime, sample_genres):
            known_runtime_samples.append(sample_runtime)
    fallback_profile_runtime = None
    if known_runtime_samples:
        fallback_profile_runtime = int(round(statistics.median(known_runtime_samples)))
        fallback_profile_runtime = max(70, min(210, fallback_profile_runtime))

    for e in all_entries:
        m = movie_cache.get(e['slug'], {})
        runtime = _parse_runtime_minutes(m.get('runtime'))
        runtime_source = m.get('runtime_source', 'unknown')
        genres_list = m.get('genres', [])
        year = m.get('release') or e.get('release')

        # Reject implausible runtimes from cache/scrape so they do not pollute totals.
        if runtime is not None and not is_runtime_plausible(runtime, genres_list):
            logger.warning(f"[{e['slug']}] Dropping implausible runtime {runtime} [{runtime_source}]")
            runtime = None
            invalid_runtime_rejections += 1
        
        # Use smart fallback if runtime is missing
        if runtime is None or runtime == 0:
            runtime, fallback_source = smart_fallback_runtime(genres_list, year)
            if (not genres_list) and fallback_profile_runtime:
                runtime = fallback_profile_runtime
                fallback_source = "fallback_profiled"
            runtime_source = fallback_source
            fallback_count += 1
            missing_runtime_films.append(f"{e['name']} ({year}) -> {runtime}min [{fallback_source}]")
        
        total_mins += runtime
        runtime_source_counts[runtime_source] = runtime_source_counts.get(runtime_source, 0) + 1
        
        # Track runtime source in cache for future reference
        if e['slug'] in movie_cache:
            movie_cache[e['slug']]['runtime'] = runtime
            movie_cache[e['slug']]['runtime_source'] = runtime_source
        for d in m.get('directors', []): dirs[d] = dirs.get(d, 0) + 1
        for a in m.get('actors', []): actors_count[a] = actors_count.get(a, 0) + 1
        for g in m.get('genres', []): genres[g] = genres.get(g, 0) + 1
        if m.get('release'):
            dec = f"{(m['release'] // 10) * 10}s"
            decades[dec] = decades.get(dec, 0) + 1
        if e.get('date'):
            activity[e['date']] = activity.get(e['date'], 0) + 1
            activity_movies.setdefault(e['date'], []).append(e['name'])
        
        rating_value = _safe_rating_value(e.get('rating'))

        if rating_value > 0:
            r_key = str(rating_value / 2)
            if r_key in rating_dist: rating_dist[r_key] += 1

        if rating_value > 0 and m.get('avg_rating') is not None and m.get('avg_rating') > 0:
            diff = rating_value - m['avg_rating']
            diff_sum += (diff / 2)
            diff_count += 1
            if rating_value >= 8:
                if diff > guilty_candidate['diff']:
                    guilty_candidate = {"diff": diff, "title": e['name'], "rating": rating_value / 2, "avgRating": m['avg_rating']/2}

    save_movie_cache(movie_cache)
    if VERBOSE_DIAGNOSTICS:
        logger.info(f"[DEBUG] Total runtime: {total_mins} minutes = {total_mins // 60} hours")
        logger.info("[DEBUG] Runtime breakdown (showing films with unusual runtimes):")
        for e in all_entries:
            m = movie_cache.get(e['slug'], {})
            runtime = m.get('runtime')
            source = m.get('runtime_source', m.get('source', 'unknown'))
            if runtime is not None and (str(source).startswith('fallback_') or runtime < 80 or runtime > 180):
                logger.info(f"  - {e['name']} ({e.get('release')}): {runtime}min [{source}]")
    
    # Calculate Watch Streaks
    dates_with_films = sorted(set(e['date'] for e in all_entries if e.get('date')))
    longest_streak = 0
    current_streak = 0
    streak_start = None
    longest_streak_start = None
    longest_streak_end = None
    
    for i, date_str in enumerate(dates_with_films):
        if i == 0:
            current_streak = 1
            streak_start = date_str
        else:
            prev_date = datetime.strptime(dates_with_films[i-1], '%Y-%m-%d')
            curr_date = datetime.strptime(date_str, '%Y-%m-%d')
            if (curr_date - prev_date).days == 1:
                current_streak += 1
            else:
                if current_streak > longest_streak:
                    longest_streak = current_streak
                    longest_streak_start = streak_start
                    longest_streak_end = dates_with_films[i-1]
                current_streak = 1
                streak_start = date_str
    
    if current_streak > longest_streak:
        longest_streak = current_streak
        longest_streak_start = streak_start
        longest_streak_end = dates_with_films[-1] if dates_with_films else None
    
    # Calculate Rewatch Stats
    # Count total entries marked as rewatch
    rewatches = sum(1 for e in all_entries if e.get('rewatch', False))
    rewatch_percentage = (rewatches / len(all_entries) * 100) if all_entries else 0
    
    # Count first-time watches (entries NOT marked as rewatch)
    first_time_watches = len(all_entries) - rewatches
    discovery_score = (first_time_watches / len(all_entries) * 100) if all_entries else 0
    
    # Find most rewatched film.
    # Primary method: use entries explicitly marked as rewatch within the selected year.
    # Fallback: films watched more than once in the selected year.
    film_watch_counts = {}
    film_ratings = {}  # Track highest rating for each film for tie-breakers
    rewatch_film_counts = {}
    for e in all_entries:
        key = (e['name'], e.get('release'))
        film_watch_counts[key] = film_watch_counts.get(key, 0) + 1
        rating_value = _safe_rating_value(e.get('rating'))
        if key not in film_ratings or rating_value > film_ratings[key]:
            film_ratings[key] = rating_value
        if e.get('rewatch', False):
            rewatch_film_counts[key] = rewatch_film_counts.get(key, 0) + 1

    rewatched_films = {film: count for film, count in film_watch_counts.items() if count > 1}
    most_rewatched = None
    most_rewatch_count = 0
    if rewatch_film_counts:
        top_film, top_count = max(
            rewatch_film_counts.items(),
            key=lambda item: (item[1], film_ratings.get(item[0], 0), item[0][0])
        )
        most_rewatched = top_film[0]
        most_rewatch_count = top_count
    elif rewatched_films:
        top_film, top_count = max(
            rewatched_films.items(),
            key=lambda item: (item[1], film_ratings.get(item[0], 0), item[0][0])
        )
        most_rewatched = top_film[0]
        most_rewatch_count = top_count

    # Safety guard: avoid contradictory UI where rewatches exist but no title is available.
    if rewatches > 0 and (not most_rewatched or not str(most_rewatched).strip()):
        fallback_entry = next(
            (e for e in all_entries if e.get('rewatch', False) and str(e.get('name', '')).strip()),
            None
        )
        if fallback_entry:
            most_rewatched = fallback_entry['name']
            most_rewatch_count = max(1, int(rewatch_film_counts.get((fallback_entry['name'], fallback_entry.get('release')), 1)))

    top_rewatch_highlights = []
    if rewatch_film_counts:
        top_keys = _rank_rewatch_keys(rewatch_film_counts, film_ratings)[:3]
        top_rewatch_highlights = [
            {"title": key[0], "count": int(rewatch_film_counts.get(key, 1))}
            for key in top_keys
        ]
    elif rewatched_films:
        top_keys = _rank_rewatch_keys(rewatched_films, film_ratings)[:3]
        top_rewatch_highlights = [
            {"title": key[0], "count": int(max(1, rewatched_films.get(key, 1) - 1))}
            for key in top_keys
        ]
    
    # Day of Week Breakdown
    day_counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}  # Monday=0, Sunday=6
    for e in all_entries:
        if e.get('date'):
            dt = datetime.strptime(e['date'], '%Y-%m-%d')
            day_counts[dt.weekday()] += 1
    
    favorite_day_num = max(day_counts, key=day_counts.get) if day_counts else 0
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    favorite_day = day_names[favorite_day_num]
    
    # Entries are sorted chronologically (oldest first)
    # So first entry [0] is the FIRST film of the year, last entry [-1] is the LAST film
    start_film = all_entries[0] if all_entries else None   # First film of year
    end_film = all_entries[-1] if all_entries else None    # Last film of year
    best_films = sorted(all_entries, key=lambda x: _safe_rating_value(x.get('rating')), reverse=True)
    best_film = best_films[0] if best_films else None
    
    month_counts = {}
    month_samples = {}
    first_film_slug = all_entries[0]['slug'] if all_entries else None
    last_film_slug = all_entries[-1]['slug'] if all_entries else None
    
    for e in all_entries:
        if e.get('date'):
            m_name = datetime.strptime(e['date'], '%Y-%m-%d').strftime('%B')
            month_counts[m_name] = month_counts.get(m_name, 0) + 1
            # Avoid using first or last film of the year as month sample
            if m_name not in month_samples or e['slug'] in [first_film_slug, last_film_slug]:
                # Only set if not already set, or if current sample is first/last film
                if m_name not in month_samples:
                    month_samples[m_name] = e['slug']
                elif month_samples[m_name] in [first_film_slug, last_film_slug] and e['slug'] not in [first_film_slug, last_film_slug]:
                    # Replace first/last film with a different film
                    month_samples[m_name] = e['slug']

    peak_month = max(month_counts.items(), key=lambda x: x[1])[0] if month_counts else "October"

    # Ensure peak month sample doesn't duplicate first/last or peak cinema film
    if peak_month in month_samples:
        avoid_slugs = {first_film_slug, last_film_slug}
        if best_film:
            avoid_slugs.add(best_film['slug'])
        if month_samples[peak_month] in avoid_slugs:
            for e in all_entries:
                if not e.get('date'):
                    continue
                m_name = datetime.strptime(e['date'], '%Y-%m-%d').strftime('%B')
                if m_name != peak_month:
                    continue
                if e['slug'] not in avoid_slugs:
                    month_samples[peak_month] = e['slug']
                    break

    # Quirky Stats
    qualified_stats = []
    
    max_binge = max(activity.values()) if activity else 0
    if max_binge > 2:
        binge_date_str = max(activity, key=activity.get)
        try:
            dt = datetime.strptime(binge_date_str, '%Y-%m-%d')
            day = dt.day
            suffix = 'th' if 11 <= day <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')
            formatted_date = dt.strftime(f"{day}{suffix} %B")
        except:
            formatted_date = binge_date_str

        qualified_stats.append({
            "id": "binge", "title": "Binge Champion", "score": max_binge * 10,
            "description": f"{formatted_date} was your biggest binge: {max_binge} films in one day!"
        })
        
    if genres:
        top_genre, tg_count = max(genres.items(), key=lambda x: x[1])
        g_pct = (tg_count / len(all_entries)) * 100
        if g_pct > 35:
            qualified_stats.append({
                "id": "loyalist", "title": f"{top_genre} Loyalist", "score": int(g_pct),
                "description": f"{round(g_pct)}% of your year was dedicated to {top_genre}."
            })

    if len(decades) >= 5:
        qualified_stats.append({
            "id": "hopper", "title": "Decade Hopper", "score": len(decades) * 15,
            "description": f"You traveled through {len(decades)} different decades of cinema this year."
        })

    avg_rt = total_mins / len(all_entries) if all_entries else 0
    if avg_rt < 95:
        qualified_stats.append({
            "id": "speed", "title": "Speed Demon", "score": int(100 - avg_rt),
            "description": f"Your average film was only {round(avg_rt)} min. You like them short and sweet!"
        })
    elif avg_rt > 130:
        qualified_stats.append({
            "id": "epic", "title": "Epic Seeker", "score": int(avg_rt - 100),
            "description": f"Your average film was {round(avg_rt)} min. You live for cinematic epics!"
        })

    if dirs:
        top_dir, td_count = max(dirs.items(), key=lambda x: x[1])
        if td_count >= 5:
            qualified_stats.append({
                "id": "auteur", "title": f"{top_dir} Stan", "score": td_count * 10,
                "description": f"You watched {td_count} films by {top_dir}. You're basically their unofficial biographer!"
            })

    qualified_stats.sort(key=lambda x: x['score'], reverse=True)
    fallback_stats = []
    if top_actors_final := sorted(
        [{"name": k, "count": v} for k, v in actors_count.items()],
        key=lambda x: (-x['count'], x['name'])
    )[:5]:
        fallback_stats.append({
            "id": "actor-era",
            "title": "Actor Era",
            "score": int(top_actors_final[0]['count'] * 9),
            "description": f"You kept coming back to {top_actors_final[0]['name']} all year."
        })
    if all_entries:
        fallback_stats.append({
            "id": "consistency",
            "title": "Cine Consistency",
            "score": int(len(all_entries) * 2),
            "description": f"You logged {len(all_entries)} films and stayed locked in throughout {target_year}."
        })
    if favorite_day:
        favorite_day_count = int(day_counts.get(favorite_day_num, 0))
        favorite_day_pct = (favorite_day_count / len(all_entries) * 100) if all_entries else 0

        if favorite_day_num in {5, 6}:
            fallback_stats.append({
                "id": "weekend-energy",
                "title": "Weekend Main Character",
                "score": int(favorite_day_count * 10 + favorite_day_pct),
                "description": f"You logged {favorite_day_count} films on {favorite_day}s ({round(favorite_day_pct)}% of your year). Weekend cinema was your thing."
            })
        else:
            fallback_stats.append({
                "id": "day-energy",
                "title": f"{favorite_day} Prime Energy",
                "score": int(favorite_day_count * 10 + favorite_day_pct),
                "description": f"You logged {favorite_day_count} films on {favorite_day}s ({round(favorite_day_pct)}% of your year). That was your power day."
            })

    existing_ids = {item["id"] for item in qualified_stats}
    for item in fallback_stats:
        if item["id"] not in existing_ids:
            qualified_stats.append(item)
            existing_ids.add(item["id"])
        if len(qualified_stats) >= 3:
            break

    final_quirky = sorted(qualified_stats, key=lambda x: x['score'], reverse=True)[:3]

    top_actors_final = sorted(
        [{"name": k, "count": v} for k, v in actors_count.items()],
        key=lambda x: (-x['count'], x['name'])
    )[:5]

    top_dirs_final = sorted(
        [{"name": k, "count": v} for k, v in dirs.items()],
        key=lambda x: (-x['count'], x['name'])
    )[:5]
    
    logger.info(f"Total unique actors found: {len(actors_count)}")
    logger.info(f"Total unique directors found: {len(dirs)}")
    logger.info(f"Top 5 Directors: {top_dirs_final}")
    logger.info(f"Top 5 Actors: {top_actors_final}")
    
    # Runtime statistics logging
    logger.info(f"{'='*60}")
    logger.info("RUNTIME STATISTICS")
    logger.info(f"{'='*60}")
    logger.info(f"Total films: {len(all_entries)}")
    logger.info(f"Films using fallback runtime: {fallback_count} ({fallback_count/len(all_entries)*100:.1f}%)")
    logger.info(f"Computed runtime: {total_mins} minutes ({total_mins/60:.1f} hours)")
    
    # Final determination of total_hours
    final_total_hours = total_hours_scraped if total_hours_scraped and total_hours_scraped > 0 else total_mins // 60
    
    if total_hours_scraped:
        logger.info(f"Using authoritative total: {total_hours_scraped} hours [letterboxd_summary]")
    else:
        logger.info(f"No summary found. Using computed total: {final_total_hours} hours [calculated from films]")
        
    if missing_runtime_films and VERBOSE_DIAGNOSTICS:
        logger.info("Films using fallback (first 10):")
        for film in missing_runtime_films[:10]:
            logger.info(f"  - {film}")
        if len(missing_runtime_films) > 10:
            logger.info(f"  ... and {len(missing_runtime_films) - 10} more")
    logger.info(f"{'='*60}")

    days_in_year = 366 if calendar.isleap(target_year) else 365

    genre_total = sum(genres.values()) if genres else 0
    mainstream_genres = {
        'Action', 'Adventure', 'Comedy', 'Animation', 'Family', 'Fantasy', 'Science Fiction',
        'Superhero', 'Thriller', 'Romance', 'Horror'
    }
    arthouse_genres = {
        'Documentary', 'Drama', 'Foreign', 'Independent', 'Experimental', 'Music', 'History', 'War'
    }
    light_genres = {'Comedy', 'Family', 'Animation', 'Romance', 'Fantasy'}
    slow_genres = {'Drama', 'Documentary', 'History', 'War', 'Experimental'}

    mainstream_score = 50
    arthouse_score = 50
    light_score = 50
    slow_score = 50

    if genre_total > 0:
        mainstream_share = sum(v for k, v in genres.items() if k in mainstream_genres) / genre_total
        arthouse_share = sum(v for k, v in genres.items() if k in arthouse_genres) / genre_total
        light_share = sum(v for k, v in genres.items() if k in light_genres) / genre_total
        slow_share = sum(v for k, v in genres.items() if k in slow_genres) / genre_total

        mainstream_score = int(max(0, min(100, mainstream_share * 130 + 20)))
        arthouse_score = int(max(0, min(100, arthouse_share * 140 + 15)))
        light_score = int(max(0, min(100, light_share * 130 + 20)))
        slow_score = int(max(0, min(100, slow_share * 130 + 20)))

    def _decade_year(decade_label: str) -> int:
        try:
            return int(str(decade_label).rstrip('s'))
        except Exception:
            return 2000

    modern_count = sum(v for k, v in decades.items() if _decade_year(k) >= 2000) if decades else 0
    classic_count = sum(v for k, v in decades.items() if _decade_year(k) < 2000) if decades else 0
    total_decade_count = modern_count + classic_count
    if total_decade_count > 0:
        modern_score = int(max(0, min(100, (modern_count / total_decade_count) * 100)))
    else:
        modern_score = 60

    if rewatch_percentage > 35:
        light_score = min(100, light_score + 8)
        slow_score = max(0, slow_score - 5)
    elif discovery_score > 75:
        arthouse_score = min(100, arthouse_score + 8)
        mainstream_score = max(0, mainstream_score - 4)

    flavor_profile_raw = {
        "mainstream": mainstream_score,
        "modern": modern_score,
        "light": light_score,
        "arthouse": arthouse_score,
        "slow": slow_score
    }
    flavor_profile, flavor_profile_meta = _normalize_flavor_profile(target_year, flavor_profile_raw)

    peak_month_slug = month_samples.get(peak_month) if month_samples else None
    peak_month_film = next((e for e in all_entries if e.get('slug') == peak_month_slug), None) if peak_month_slug else None

    rated_entries = [_safe_rating_value(e.get('rating')) for e in all_entries if _safe_rating_value(e.get('rating')) > 0]

    result = {
        "username": username, "real_name": real_name, "year": target_year,
        "stats": {
            "totalFilms": len(all_entries), "totalHours": final_total_hours,
            "averageRating": (sum(rated_entries) / (2 * len(rated_entries))) if rated_entries else 0,
            "percentile": 85,
            "ratingDifference": diff_sum / diff_count if diff_count > 0 else 0,
            "ratingDistribution": [{"rating": k, "count": v} for k, v in rating_dist.items()]
        },
        "runtimeDiagnostics": {
            "summaryHoursUsed": bool(total_hours_scraped and total_hours_scraped > 0),
            "summaryHoursValue": int(total_hours_scraped) if total_hours_scraped else 0,
            "computedHoursValue": int(total_mins // 60),
            "fallbackRuntimeCount": int(fallback_count),
            "fallbackRuntimePct": round((fallback_count / len(all_entries)) * 100, 1) if all_entries else 0,
            "invalidRuntimeRejections": int(invalid_runtime_rejections),
            "fallbackProfileRuntime": int(fallback_profile_runtime) if fallback_profile_runtime else None,
            "runtimeSourceBreakdown": sorted(
                [{"source": src, "count": cnt} for src, cnt in runtime_source_counts.items()],
                key=lambda x: (-x["count"], x["source"])
            )
        },
        "topFilms": [
            {"title": f["name"], "year": f["release"], "rating": _safe_rating_value(f.get("rating")) / 2,
                "posterUrl": movie_cache.get(f["slug"], {}).get("poster")}
            for f in sorted(
                {e["slug"]: e for e in all_entries}.values(),
                key=lambda x: _safe_rating_value(x.get("rating")),
                reverse=True
            )[:10]
        ],
        "topDirectors": top_dirs_final,
        "topActors": top_actors_final,
        "flavorProfile": flavor_profile,
        "flavorProfileMeta": flavor_profile_meta,
        "genres": sorted([{"name": k, "count": v, "percentage": round((v/len(all_entries))*100)} for k, v in genres.items()], key=lambda x: x['count'], reverse=True)[:7],
        "decades": sorted([{"decade": k, "count": v, "percentage": round((v/len(all_entries))*100)} for k, v in decades.items()], key=lambda x: x['count'], reverse=True),
        "activityData": [{"date": k, "count": v, "movies": activity_movies.get(k, [])} for k, v in activity.items()],
        "quirkyStats": final_quirky,
        "narrative": [
            {"month": "January", "title": "The First Frame", "description": f"You kicked off {target_year} with {start_film['name']}.", 
                "poster": movie_cache.get(start_film['slug'], {}).get('poster') if start_film else None,
                "movieTitle": start_film['name'] if start_film else None},
            {"month": peak_month, "title": "Binge Watching", "description": f"This was your busiest month for cinema.",
                "poster": movie_cache.get(peak_month_slug, {}).get('poster') if peak_month_slug else None,
                "movieTitle": peak_month_film['name'] if peak_month_film else None},
            {"month": "Peak Cinema", "title": "Masterpiece", "description": f"You were mesmerized by {best_film['name']}.",
                "poster": movie_cache.get(best_film['slug'], {}).get('poster') if best_film else None,
                "movieTitle": best_film['name'] if best_film else None},
            {"month": "December", "title": "The Final Cut", "description": f"You brought the year home with {end_film['name']}.",
                "poster": movie_cache.get(end_film['slug'], {}).get('poster') if end_film else None,
                "movieTitle": end_film['name'] if end_film else None}
        ],
        "watchStreaks": {
            "longestStreak": longest_streak,
            "streakStart": longest_streak_start,
            "streakEnd": longest_streak_end,
            "totalActiveDays": len(dates_with_films),
            "totalDaysInYear": days_in_year,
            "activePercentage": len(dates_with_films) / days_in_year * 100 if dates_with_films else 0
        },
        "rewatchData": {
            "totalRewatches": rewatches,
            "rewatchPercentage": rewatch_percentage,
            "discoveryScore": discovery_score,
            "mostRewatched": most_rewatched,
            "mostRewatchCount": most_rewatch_count,
            "rewatchHighlights": top_rewatch_highlights
        },
        "dayOfWeek": {
            "favoriteDay": favorite_day,
            "favoriteDayCount": day_counts[favorite_day_num],
            "breakdown": [
                {"day": day_names[i], "count": day_counts[i]} 
                for i in range(7)
            ]
        },
        "metadataStatus": get_db_metadata_context()[0],
        "metadataSource": get_db_metadata_context()[1]
    }

    # Diagnostics kept in logs only; do not leak detailed internals to user payload.
    top_films_missing_posters = sum(1 for film in result.get("topFilms", []) if not film.get("posterUrl"))
    poster_partial = top_films_missing_posters > 0
    logger.info(
        f"[req={request_id}] calculate_stats done user={username} year={target_year} "
        f"topPosterMissing={top_films_missing_posters}/{len(result.get('topFilms', []))} "
        f"fallbackRuntime={fallback_count}"
    )
    if poster_partial:
        result["warnings"] = [
            {
                "errorCode": "POSTER_FETCH_PARTIAL",
                "message": "Some poster images could not be fetched."
            }
        ]
    
    if not result["topActors"]: result["topActors"] = [{"name": "Several Performers", "count": "-"}]
    if not result["topDirectors"]: result["topDirectors"] = [{"name": "The Auteur", "count": "-"}]

    return result


@app.get("/api/user/{username}")
async def get_wrapped_data(username: str):
    logger.info(f"Request for {username} (v{DEPLOY_VERSION})")
    try:
        if not IS_VERCEL:
            user_cache_file = CACHE_DIR / f"user_{username}.json"
            if user_cache_file.exists():
                file_time = datetime.fromtimestamp(user_cache_file.stat().st_mtime)
                if datetime.now() - file_time < timedelta(hours=24):
                    with open(user_cache_file, 'r') as f: return json.load(f)
        
        # 2. Sequential/Parallel fetching with Session Reuse
        import time
        t_start = time.time()
        
        all_entries = []
        movie_cache = get_movie_cache()
        needs_scrape = []

        async with AsyncSession(impersonate="chrome") as session:
            session.headers.update(HEADERS)
            
            # A. Fetch Diary Pages & Real Name
            pages_tasks = [session.get(f"https://letterboxd.com/{username}/diary/for/2025/page/{p}/", timeout=10) for p in range(1, 11)]
            profile_task = session.get(f"https://letterboxd.com/{username}/", timeout=10)
            
            responses = await asyncio.gather(*pages_tasks, profile_task, return_exceptions=True)
            pages_responses = responses[:-1]
            profile_res = responses[-1]
            
            real_name = username
            if not isinstance(profile_res, Exception) and profile_res.status_code == 200:
                p_soup = BeautifulSoup(profile_res.text, 'lxml')
                name_tag = p_soup.find('h1', class_='title-3')
                if name_tag: real_name = name_tag.text.strip()

            for i, r in enumerate(pages_responses):
                if isinstance(r, Exception):
                    logger.warning(f"Page {i+1} failed: {r}")
                    continue
                if not hasattr(r, 'status_code'): continue
                
                _debug_log(f"Page {i+1} status: {r.status_code}")
                
                # Check for 403 blocking - return special response for client-side fallback
                if r.status_code == 403:
                    if i == 0:  # Only check first page
                        logger.warning("BLOCKED: Letterboxd returning 403 - triggering client-side fallback")
                        return {
                            "status": "blocked_by_letterboxd",
                            "message": "Server blocked by Letterboxd. Please enable client-side mode.",
                            "username": username,
                            "fallback_required": True
                        }
                    continue
                
                if r.status_code != 200: continue
                soup = BeautifulSoup(r.text, 'lxml')
                
                _debug_log(f"Page {i+1} HTML length: {len(r.text)}")
                if VERBOSE_DIAGNOSTICS:
                    _debug_log(f"Page {i+1} first 500 chars: {r.text[:500]}")
                
                rows = soup.find_all('tr', class_='diary-entry-row')
                _debug_log(f"Page {i+1} found {len(rows)} diary rows")
                
                if len(rows) == 0 and i == 0:
                    # Check if we're being blocked
                    if 'cloudflare' in r.text.lower() or 'challenge' in r.text.lower():
                        logger.warning("BLOCKED: Cloudflare challenge detected")
                    elif 'private' in r.text.lower():
                        logger.warning("BLOCKED: Profile appears private")
                    else:
                        logger.warning("No diary rows found on page 1 without obvious block signal")
                
                current_date = None
                for row in rows:
                    slug = None
                    p_div = row.find('div', {'data-film-slug': True})
                    if p_div: slug = p_div['data-film-slug']
                    if not slug:
                        for a in row.find_all('a', href=True):
                            if '/film/' in a['href']:
                                parts = [p for p in a['href'].split('/') if p]
                                if 'film' in parts:
                                    idx = parts.index('film')
                                    if len(parts) > idx + 1:
                                        slug = parts[idx + 1]
                                        break
                    if not slug: continue
                    
                    title_tag = row.find('h3', class_='headline-3')
                    title = title_tag.text.strip() if title_tag else slug.replace('-', ' ').title()
                    rel_td = row.find('td', class_='td-released')
                    rel = int(rel_td.text.strip()) if rel_td and rel_td.text.strip().isdigit() else None
                    rating = 0
                    r_span = row.find('span', class_='rating')
                    if r_span:
                        for c in r_span.get('class', []):
                            if c.startswith('rated-'): rating = int(c.split('-')[-1])
                    
                    # Date persistence logic
                    dt_td = row.find('td', class_='td-day') or row.find('td', class_='col-daydate')
                    if dt_td and dt_td.find('a'):
                        parts = [p for p in dt_td.find('a')['href'].split('/') if p]
                        # Standard diary link: /{user}/diary/films/for/2025/01/29/
                        if 'for' in parts:
                            idx = parts.index('for')
                            if len(parts) >= idx + 4:
                                current_date = f"{parts[idx+1]}-{parts[idx+2]}-{parts[idx+3]}"
                        elif 'diary' in parts:
                            # Fallback: /{user}/diary/2025/01/29/
                            idx = parts.index('diary')
                            if len(parts) >= idx + 4:
                                current_date = f"{parts[idx+1]}-{parts[idx+2]}-{parts[idx+3]}"
                    
                    all_entries.append({"slug": slug, "name": title, "release": rel, "rating": rating, "date": current_date})

            if not all_entries:
                if not isinstance(profile_res, Exception) and profile_res.status_code == 404: 
                    raise HTTPException(status_code=404, detail="User not found")
                return {"username": username, "status": "no_films_in_2025"}

            logger.info(f"[{username}] Diary fetch & parse took {time.time()-t_start:.2f}s")
        
        # 4. Final Processing & Stats
        # calculate_stats now handles IMDb lookup and scraping internally with better logic
        result = await calculate_stats(username, real_name, all_entries)
        
        if not IS_VERCEL:
            with open(user_cache_file, 'w') as f: json.dump(result, f)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback; print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/{username}/process")
async def process_uploaded_data(username: str, data: ScrapedData, request: Request):
    """
    Process uploaded Letterboxd data export.
    Converts the upload format to the internal format and calculates stats.
    """
    request_id = _request_id_from_request(request)
    logger.info(f"[req={request_id}] process upload start user={username} entries={len(data.entries)}")
    try:
        _cleanup_upload_sessions()

        # Convert upload format to internal format expected by calculate_stats
        entries_dicts = []
        
        # Helper function to convert film name to slug
        def name_to_slug(name, year):
            import re
            slug = name.lower()
            slug = re.sub(r'[^\w\s-]', '', slug)  # Remove special chars
            slug = re.sub(r'[\s_]+', '-', slug)   # Replace spaces with hyphens
            slug = slug.strip('-')                 # Remove leading/trailing hyphens

            # Keep cache keys disambiguated across remakes/reboots.
            if year and str(year).isdigit():
                slug = f"{slug}-{year}"

            return slug
        
        for entry in data.entries:
            # Extract slug from letterboxd_uri
            slug = None
            if entry.letterboxd_uri:
                if 'boxd.it' in entry.letterboxd_uri:
                    # For boxd.it short URLs, use film name as slug
                    slug = name_to_slug(entry.film_name, entry.film_year)
                elif '/film/' in entry.letterboxd_uri:
                    # Extract slug from full URL: https://letterboxd.com/film/marty-supreme-2025/
                    parts = entry.letterboxd_uri.split('/film/')
                    if len(parts) > 1:
                        slug = parts[1].split('/')[0].rstrip('/')
            
            # Fallback: generate slug from film name
            if not slug:
                slug = name_to_slug(entry.film_name, entry.film_year)
            
            # Convert year string to int
            try:
                release_year = int(entry.film_year) if entry.film_year else None
            except (ValueError, TypeError):
                release_year = None
            
            entries_dicts.append({
                'slug': slug,
                'name': entry.film_name,
                'release': release_year,
                'rating': entry.rating if entry.rating is not None else None,
                'date': entry.watched_date,
                'rewatch': entry.rewatch,
                'uri': entry.letterboxd_uri
            })
        
        available_years = sorted(
            {
                yr
                for yr in (_entry_year(entry) for entry in entries_dicts)
                if yr is not None and YEAR_RANGE_START <= yr <= YEAR_RANGE_END
            }
        )

        if not available_years:
            _raise_api_error(
                400,
                "NO_YEAR_DATA",
                f"No diary entries found between {YEAR_RANGE_START} and {YEAR_RANGE_END}"
            )

        default_year = 2025 if 2025 in available_years else available_years[-1]
        default_entries = _filter_entries_by_year(entries_dicts, default_year)
        wrapped = await calculate_stats(username, data.real_name, default_entries, default_year, request_id=request_id)

        session_id = str(uuid.uuid4())
        upload_sessions[session_id] = {
            "username": username,
            "real_name": data.real_name,
            "entries": entries_dicts,
            "available_years": available_years,
            "wrapped_cache": {default_year: wrapped},
            "created_at": time.time()
        }

        response_payload = {
            "sessionId": session_id,
            "availableYears": available_years,
            "defaultYear": default_year,
            "wrapped": wrapped
        }
        logger.info(
            f"[req={request_id}] process upload done user={username} defaultYear={default_year} "
            f"availableYears={available_years}"
        )
        return response_payload
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print("="*80)
        print("ERROR IN PROCESS_UPLOADED_DATA:")
        print(tb)
        print("="*80)
        # Return detailed error for debugging (only in dev)
        _raise_api_error(500, "PROCESSING_FAILED", "Failed to process uploaded data.")


@app.post("/api/user/{username}/process/year")
async def process_uploaded_data_for_year(username: str, data: YearRequest, request: Request):
    request_id = _request_id_from_request(request)
    logger.info(f"[req={request_id}] process year start user={username} year={data.year}")
    _cleanup_upload_sessions()
    session_payload = upload_sessions.get(data.sessionId)
    if not session_payload:
        _raise_api_error(404, "SESSION_EXPIRED", "Upload session expired. Please upload your ZIP again.")

    if session_payload.get("username") != username:
        _raise_api_error(403, "SESSION_MISMATCH", "Session does not match this username.")

    requested_year = int(data.year)
    if requested_year < YEAR_RANGE_START or requested_year > YEAR_RANGE_END:
        _raise_api_error(400, "INVALID_YEAR", f"Year must be between {YEAR_RANGE_START} and {YEAR_RANGE_END}.")

    if requested_year not in session_payload.get("available_years", []):
        _raise_api_error(404, "NO_YEAR_DATA", f"No logs found for {requested_year}.")

    wrapped_cache = session_payload.get("wrapped_cache", {})
    if requested_year in wrapped_cache:
        logger.info(f"[req={request_id}] process year cache-hit user={username} year={requested_year}")
        return {"year": requested_year, "wrapped": wrapped_cache[requested_year]}

    year_entries = _filter_entries_by_year(session_payload.get("entries", []), requested_year)
    if not year_entries:
        _raise_api_error(404, "NO_YEAR_DATA", f"No logs found for {requested_year}.")
    wrapped = await calculate_stats(
        username,
        session_payload.get("real_name", ""),
        year_entries,
        requested_year,
        request_id=request_id
    )
    wrapped_cache[requested_year] = wrapped
    session_payload["wrapped_cache"] = wrapped_cache
    logger.info(f"[req={request_id}] process year done user={username} year={requested_year}")
    return {"year": requested_year, "wrapped": wrapped}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
