"""
Portfolio Analytics — Python backend
Run: uvicorn main:app --reload --port 8000
"""

import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from db import (
    init_db, upsert_session, update_activity,
    record_section, record_event,
    get_active_sessions, get_recent_sessions, get_stats, get_session_detail,
    anonymise_old_ips, prune_old_sessions,
    save_contact, mark_email_sent, get_contacts,
)
from geo import get_geo, extract_ip

logger = logging.getLogger("portfolio")

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


ADMIN_TOKEN     = os.getenv("ADMIN_TOKEN",     "dev-admin-token-change-me")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

SMTP_SERVER   = os.getenv("SMTP_SERVER",   "mail.revdu.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "cto@revdu.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "senegal123")
NOTIFY_EMAIL  = os.getenv("NOTIFY_EMAIL",  "mijaksan@gmail.com")


def send_notification_email(name: str, email: str, message: str) -> bool:
    """Send contact notification via SMTP. Returns True on success."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"📩 Nowa wiadomość od {name} — Portfolio"
        msg["From"]    = SMTP_USERNAME
        msg["To"]      = NOTIFY_EMAIL
        msg["Reply-To"] = email

        plain = (
            f"Imię:    {name}\n"
            f"Email:   {email}\n\n"
            f"Wiadomość:\n{message}\n\n"
            f"---\nWysłane przez formularz kontaktowy portfolio."
        )
        html = f"""
        <html><body style="font-family:sans-serif;background:#0a0a0a;color:#f0f0f0;padding:24px">
          <h2 style="color:#00f0ff">📩 Nowa wiadomość z portfolio</h2>
          <table style="border-collapse:collapse;width:100%;max-width:560px">
            <tr><td style="padding:8px;color:#888;width:80px">Imię</td>
                <td style="padding:8px;font-weight:bold">{name}</td></tr>
            <tr><td style="padding:8px;color:#888">Email</td>
                <td style="padding:8px">
                  <a href="mailto:{email}" style="color:#00f0ff">{email}</a>
                </td></tr>
          </table>
          <div style="margin-top:16px;padding:16px;background:#111;border-left:3px solid #b400ff;border-radius:4px">
            <p style="margin:0;white-space:pre-wrap">{message}</p>
          </div>
          <p style="margin-top:24px;color:#444;font-size:12px">
            Wysłane przez formularz kontaktowy portfolio.
          </p>
        </body></html>
        """
        msg.attach(MIMEText(plain, "plain", "utf-8"))
        msg.attach(MIMEText(html,  "html",  "utf-8"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.sendmail(SMTP_USERNAME, NOTIFY_EMAIL, msg.as_string())

        logger.info("Notification email sent for contact from %s", email)
        return True
    except Exception as exc:
        logger.error("Failed to send notification email: %s", exc)
        return False

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

class ContactPayload(BaseModel):
    session_id: str | None = None
    name: str
    email: str
    message: str


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


@app.post("/contact")
async def contact(payload: ContactPayload):
    if not payload.name.strip() or not payload.email.strip() or not payload.message.strip():
        raise HTTPException(status_code=422, detail="Wypełnij wszystkie pola")

    contact_id = save_contact(
        session_id=payload.session_id,
        name=payload.name.strip(),
        email=payload.email.strip(),
        message=payload.message.strip(),
    )

    ok = send_notification_email(payload.name, payload.email, payload.message)
    if ok:
        mark_email_sent(contact_id)

    return {"ok": True, "email_sent": ok}


@app.get("/admin/overview")
async def admin_overview(x_admin_token: str | None = Header(None), token: str | None = None):
    if (x_admin_token or token) != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")

    anonymise_old_ips()
    prune_old_sessions()

    return {
        "active":   get_active_sessions(),
        "recent":   get_recent_sessions(50),
        "stats":    get_stats(),
        "contacts": get_contacts(50),
    }


@app.get("/admin/session/{session_id}")
async def admin_session(session_id: str, x_admin_token: str | None = Header(None), token: str | None = None):
    if (x_admin_token or token) != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")
    return get_session_detail(session_id)


@app.get("/health")
async def health():
    return {"status": "ok"}
