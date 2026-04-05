"""
Portfolio Analytics — Python backend
Run: uvicorn main:app --reload --port 8000
"""

import os
from typing import Any

from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db import (
    init_db, upsert_session, update_activity,
    record_section, record_event,
    get_active_sessions, get_recent_sessions, get_stats, get_session_detail,
    anonymise_old_ips, prune_old_sessions,
)
from geo import get_geo, extract_ip

# ua-parser (pip: ua-parser)
try:
    from ua_parser import user_agent_parser
    def parse_ua(ua: str) -> dict:
        r = user_agent_parser.Parse(ua)
        browser = r["user_agent"]
        os_info = r["os"]
        device  = r["device"]
        return {
            "browser":         browser.get("family"),
            "browser_version": browser.get("major"),
            "os":              f"{os_info.get('family','')} {os_info.get('major','')}".strip() or None,
            "device_type":     device.get("family", "Other").lower()
                               if device.get("family") not in ("Other", None) else "desktop",
        }
except ImportError:
    def parse_ua(ua: str) -> dict:  # type: ignore[misc]
        return {"browser": None, "browser_version": None, "os": None, "device_type": "desktop"}


ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "dev-admin-token-change-me")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

app = FastAPI(title="Portfolio Analytics", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

init_db()


# ── Models ────────────────────────────────────────────────────────────────────

class SectionPayload(BaseModel):
    name: str
    time_spent: int = 0

class EventPayload(BaseModel):
    type: str
    data: Any = None

class TrackPayload(BaseModel):
    type: str                          # init | activity | leave
    session_id: str
    # init fields
    fingerprint: str | None = None
    language: str | None = None
    timezone: str | None = None
    screen_width: int | None = None
    screen_height: int | None = None
    referer: str | None = None
    # activity / leave fields
    total_time: int | None = None
    clicks: int | None = None
    max_scroll: int | None = None
    sections: list[SectionPayload] = []
    events: list[EventPayload] = []


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/track")
async def track(payload: TrackPayload, request: Request):
    if payload.type == "init":
        ip = extract_ip(dict(request.headers), request.client.host if request.client else None)
        ua = request.headers.get("user-agent", "")
        ua_data = parse_ua(ua)
        geo = await get_geo(ip)

        upsert_session({
            "session_id":      payload.session_id,
            "fingerprint":     payload.fingerprint,
            "ip":              ip,
            "country":         geo["country"],
            "city":            geo["city"],
            "isp":             geo["isp"],
            "user_agent":      ua,
            "browser":         ua_data["browser"],
            "browser_version": ua_data["browser_version"],
            "os":              ua_data["os"],
            "device_type":     ua_data["device_type"],
            "language":        payload.language,
            "timezone":        payload.timezone,
            "screen_width":    payload.screen_width,
            "screen_height":   payload.screen_height,
            "referer":         payload.referer,
        })

    elif payload.type in ("activity", "leave"):
        update_activity(
            session_id=payload.session_id,
            total_time=payload.total_time,
            clicks=payload.clicks,
            max_scroll=payload.max_scroll,
            is_active=(payload.type == "activity"),
        )
        for s in payload.sections:
            record_section(payload.session_id, s.name, s.time_spent)
        for e in payload.events:
            record_event(payload.session_id, e.type, e.data)

    else:
        raise HTTPException(status_code=400, detail="unknown type")

    return {"ok": True}


@app.get("/admin/overview")
async def admin_overview(x_admin_token: str | None = Header(None), token: str | None = None):
    if (x_admin_token or token) != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")

    anonymise_old_ips()
    prune_old_sessions()

    return {
        "active": get_active_sessions(),
        "recent": get_recent_sessions(50),
        "stats":  get_stats(),
    }


@app.get("/admin/session/{session_id}")
async def admin_session(session_id: str, x_admin_token: str | None = Header(None), token: str | None = None):
    if (x_admin_token or token) != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")
    return get_session_detail(session_id)


@app.get("/health")
async def health():
    return {"status": "ok"}
