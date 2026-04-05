"""Server-side IP geolocation via ip-api.com (free, 45 req/min)."""

import re
import time
import httpx

_cache: dict[str, tuple[dict, float]] = {}
_CACHE_TTL = 86_400  # 24 h

_PRIVATE = re.compile(
    r"^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd)", re.I
)


def _is_private(ip: str) -> bool:
    return bool(_PRIVATE.match(ip))


async def get_geo(ip: str) -> dict:
    empty = {"country": None, "city": None, "isp": None}
    if not ip or _is_private(ip):
        return empty

    cached, ts = _cache.get(ip, ({}, 0.0))
    if cached and time.time() - ts < _CACHE_TTL:
        return cached

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(
                f"http://ip-api.com/json/{ip}",
                params={"fields": "status,country,city,isp"},
            )
        data = r.json()
        if data.get("status") != "success":
            return empty
        result = {
            "country": data.get("country"),
            "city": data.get("city"),
            "isp": data.get("isp"),
        }
        _cache[ip] = (result, time.time())
        return result
    except Exception:
        return empty


def extract_ip(request_headers: dict, client_host: str | None) -> str:
    for header in ("x-real-ip", "x-forwarded-for", "cf-connecting-ip", "true-client-ip"):
        val = request_headers.get(header)
        if val:
            return val.split(",")[0].strip()
    return client_host or "127.0.0.1"
