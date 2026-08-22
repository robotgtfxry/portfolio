"""
Portfolio Analytics — Python backend
Run: uvicorn main:app --reload --port 8000
"""

import asyncio
import hashlib
import logging
import os
import secrets
import smtplib
import sys
from concurrent.futures import ThreadPoolExecutor
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request, Header, HTTPException, UploadFile, File, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, EmailStr
from pydantic.alias_generators import to_camel

from db import (
    init_db, upsert_session, update_activity,
    record_section, record_event,
    get_active_sessions, get_recent_sessions, get_stats, get_session_detail,
    anonymise_old_ips, prune_old_sessions,
    save_contact, mark_email_sent, get_contacts,
)
from geo import get_geo, extract_ip


def _load_env_file() -> None:
    """Na Vercelu zmienne daje platforma, lokalnie nie ustawia ich nikt — wiec
    dociagamy backend/.env.local. Prawdziwe srodowisko ma pierwszenstwo.
    Musi wykonac sie przed importem link, bo tamten czyta LINK_SECRET od razu."""
    env_file = Path(__file__).parent / ".env.local"
    if not env_file.is_file():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file()

# Obsluga linkow specjalnych siedzi w api/link.py — jeden modul dla produkcji
# i dla lokalnego serwera, zeby format tokenu nie mogl sie rozjechac.
sys.path.insert(0, str(Path(__file__).parent / "api"))
from link import register as register_link_routes  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
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

DRIVE_PASSWORD  = os.getenv("DRIVE_PASSWORD", "senegal123")
DRIVE_MAX_BYTES = 15 * 1024 * 1024 * 1024  # 15 GB
DRIVE_DIR       = Path(__file__).parent / "drive_storage"
DRIVE_DIR.mkdir(exist_ok=True)

_drive_tokens: set[str] = set()

SMTP_SERVER   = os.getenv("SMTP_SERVER",   "mail.revdu.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "cto@revdu.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "senegal123")
NOTIFY_EMAIL  = os.getenv("NOTIFY_EMAIL",  "mijaksan@gmail.com")


_smtp_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="smtp")


def _duration(ms: int | None) -> str | None:
    if not ms or ms < 0:
        return None
    seconds = ms // 1000
    return f"{seconds // 60} min {seconds % 60} s" if seconds >= 60 else f"{seconds} s"


def _visitor_rows(payload: "ContactPayload", ip: str, geo: dict, user_agent: str) -> list[tuple[str, str]]:
    """Tabelka "kto pisal" doklejana do maila. Ten sam uklad co w api/contact.py,
    tylko geolokalizacja idzie z ip-api zamiast z naglowkow Vercela."""
    from datetime import datetime

    visitor = payload.visitor
    place = ", ".join(p for p in (geo.get("city"), geo.get("country")) if p)

    rows: list[tuple[str, str]] = [
        ("Wyslano",     datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("IP",          ip or "nieznane"),
        ("Lokalizacja", place or "nieznana"),
        ("Dostawca",    geo.get("isp") or "nieznany"),
        ("Urzadzenie",  user_agent or "nieznane"),
    ]

    if visitor:
        pairs: list[tuple[str, str | None]] = [
            ("Jezyk",           visitor.language),
            ("Strefa czasowa",  visitor.timezone),
            ("Ekran",           visitor.screen),
            ("Skad wszedl",     visitor.referer or "wejscie bezposrednie"),
            ("Weszla na",       visitor.landing),
            ("Czas na stronie", _duration(visitor.total_time)),
            ("Klikniecia",      str(visitor.clicks) if visitor.clicks is not None else None),
            ("Przewiniete",     f"{visitor.max_scroll}%" if visitor.max_scroll is not None else None),
        ]
        rows += [(label, value) for label, value in pairs if value]

        seen = sorted(visitor.sections, key=lambda s: s.time_spent, reverse=True)
        seen = [s for s in seen if s.time_spent >= 1000]
        if seen:
            rows.append(("Ogladal", ", ".join(f"{s.name} ({_duration(s.time_spent)})" for s in seen[:8])))
        if visitor.fingerprint:
            rows.append(("Odcisk przegladarki", visitor.fingerprint))

    if payload.session_id:
        rows.append(("Sesja", payload.session_id))

    return rows


def _smtp_send(name: str, email: str, message: str, details: list[tuple[str, str]]) -> bool:
    """Blocking SMTP call — runs in a thread pool, never in the event loop."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Nowa wiadomosc od {name} - Portfolio"
    msg["From"]    = SMTP_USERNAME
    msg["To"]      = NOTIFY_EMAIL
    msg["Reply-To"] = email

    plain = (
        f"Imie:    {name}\n"
        f"Email:   {email}\n\n"
        f"Wiadomosc:\n{message}\n\n"
        f"--- Kto pisal ---\n"
        + "".join(f"{label + ':':<20}{value}\n" for label, value in details)
        + f"\n---\nWyslane przez formularz kontaktowy portfolio."
    )
    rows_html = "".join(
        f'<tr><td style="color:#888;padding:3px 14px 3px 0;white-space:nowrap;'
        f'vertical-align:top">{label}</td>'
        f'<td style="padding:3px 0;word-break:break-word">{value}</td></tr>'
        for label, value in details
    )
    html = f"""<html><body style="font-family:sans-serif;padding:24px">
  <h2 style="color:#00aaff">Nowa wiadomosc z portfolio</h2>
  <table>
    <tr><td style="color:#888;width:80px">Imie</td>
        <td><b>{name}</b></td></tr>
    <tr><td style="color:#888">Email</td>
        <td><a href="mailto:{email}">{email}</a></td></tr>
  </table>
  <div style="margin-top:16px;padding:16px;border-left:3px solid #aa00ff">
    <p style="white-space:pre-wrap">{message}</p>
  </div>
  <h3 style="color:#888;font-size:13px;text-transform:uppercase;letter-spacing:1px;
             margin:28px 0 8px">Kto pisal</h3>
  <table style="font-size:13px;border-collapse:collapse">{rows_html}</table>
</body></html>"""

    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html,  "html",  "utf-8"))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=15) as smtp:
        smtp.set_debuglevel(0)
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        refused = smtp.sendmail(SMTP_USERNAME, [NOTIFY_EMAIL], msg.as_string())
        if refused:
            raise RuntimeError(f"Addresses refused: {refused}")
    return True


async def send_notification_email(name: str, email: str, message: str,
                                  details: list[tuple[str, str]] | None = None) -> bool:
    """Async wrapper — offloads blocking SMTP to thread pool."""
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(_smtp_executor, _smtp_send, name, email, message, details or [])
        logger.info("Email wyslany do %s (nadawca: %s)", NOTIFY_EMAIL, email)
        return True
    except Exception as exc:
        logger.error("Blad wysylania emaila: %s: %s", type(exc).__name__, exc)
        return False

app = FastAPI(title="Portfolio Analytics", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["POST", "GET", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)

init_db()


# ── Models ────────────────────────────────────────────────────────────────────

# Tracker w przegladarce mowi camelCase (sessionId, totalTime, maxScroll),
# a modele tutaj snake_case. Bez tego aliasu kazdy beacon konczyl sie 422 i do
# bazy nie trafialo nic poza recznie wolanymi zadaniami.
_camel = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SectionPayload(BaseModel):
    model_config = _camel

    name: str
    time_spent: int = 0

class EventPayload(BaseModel):
    model_config = _camel

    type: str
    data: Any = None

class TrackPayload(BaseModel):
    model_config = _camel

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

class VisitorPayload(BaseModel):
    """Migawka z Trackera — to samo cialo, co przyjmuje api/contact.py."""
    fingerprint: str | None = None
    language: str | None = None
    timezone: str | None = None
    screen: str | None = None
    referer: str | None = None
    landing: str | None = None
    total_time: int | None = None
    clicks: int | None = None
    max_scroll: int | None = None
    sections: list[SectionPayload] = []


class ContactPayload(BaseModel):
    session_id: str | None = None
    name: str
    email: str
    message: str
    visitor: VisitorPayload | None = None


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
async def contact(payload: ContactPayload, request: Request):
    if not payload.name.strip() or not payload.email.strip() or not payload.message.strip():
        raise HTTPException(status_code=422, detail="Wypełnij wszystkie pola")

    contact_id = save_contact(
        session_id=payload.session_id,
        name=payload.name.strip(),
        email=payload.email.strip(),
        message=payload.message.strip(),
    )

    ip = extract_ip(dict(request.headers), request.client.host if request.client else None)
    details = _visitor_rows(payload, ip, await get_geo(ip), request.headers.get("user-agent", ""))

    ok = await send_notification_email(payload.name, payload.email, payload.message, details)
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


# ── Linki specjalne ──────────────────────────────────────────────────────────
#
# Te same trasy co na produkcji — obsluga siedzi w api/link.py, a tutaj tylko
# ja montujemy, zeby dalo sie przetestowac przebieg /l/<token> bez deployu.

register_link_routes(app)


# ── Drive ────────────────────────────────────────────────────────────────────

def _drive_usage() -> int:
    return sum(f.stat().st_size for f in DRIVE_DIR.iterdir() if f.is_file())


def _verify_drive_token(token: str | None):
    if not token or token not in _drive_tokens:
        raise HTTPException(status_code=401, detail="unauthorized")


class DriveAuth(BaseModel):
    password: str


@app.post("/drive/auth")
async def drive_auth(body: DriveAuth):
    if body.password != DRIVE_PASSWORD:
        raise HTTPException(status_code=401, detail="wrong password")
    token = secrets.token_hex(32)
    _drive_tokens.add(token)
    return {"token": token}


@app.get("/drive/files")
async def drive_files(drive_token: str | None = Header(None)):
    _verify_drive_token(drive_token)
    files = []
    for f in sorted(DRIVE_DIR.iterdir()):
        if f.is_file():
            stat = f.stat()
            files.append({
                "name": f.name,
                "size": stat.st_size,
                "modified": stat.st_mtime,
            })
    return {"files": files, "usage": _drive_usage(), "max": DRIVE_MAX_BYTES}


@app.post("/drive/upload")
async def drive_upload(file: UploadFile = File(...), drive_token: str | None = Header(None)):
    _verify_drive_token(drive_token)
    if not file.filename:
        raise HTTPException(status_code=400, detail="no filename")

    safe_name = Path(file.filename).name
    if not safe_name or safe_name.startswith("."):
        raise HTTPException(status_code=400, detail="invalid filename")

    content = await file.read()
    if _drive_usage() + len(content) > DRIVE_MAX_BYTES:
        raise HTTPException(status_code=413, detail="disk limit exceeded (15 GB)")

    (DRIVE_DIR / safe_name).write_bytes(content)
    return {"ok": True, "name": safe_name, "size": len(content)}


@app.get("/drive/download/{filename:path}")
async def drive_download(filename: str, drive_token: str | None = Header(None)):
    _verify_drive_token(drive_token)
    safe_name = Path(filename).name
    path = DRIVE_DIR / safe_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    return FileResponse(path, filename=safe_name)


@app.delete("/drive/delete/{filename:path}")
async def drive_delete(filename: str, drive_token: str | None = Header(None)):
    _verify_drive_token(drive_token)
    safe_name = Path(filename).name
    path = DRIVE_DIR / safe_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    path.unlink()
    return {"ok": True}
