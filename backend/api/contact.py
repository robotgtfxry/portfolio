"""
Serverless entry point dla Vercela — WYLACZNIE formularz kontaktowy.

Swiadomie nie importuje main.py ani db.py: tamten kod przy imporcie wola
init_db(), ktore pisze do SQLite, a system plikow funkcji jest tylko do
odczytu. Analytics i /drive zostaja na lokalnym backendzie.

Routing: Vercel z presetem FastAPI serwuje TA JEDNA aplikacje pod wszystkimi
sciezkami — kolejne pliki w api/ nie staja sie osobnymi funkcjami. Dlatego
wszystkie trasy (takze linkow specjalnych z link.py) musza wisiec na obiekcie
app z tego pliku, a kazda jest zarejestrowana pod wersja z prefiksem /api i bez.

Sekrety czytane sa wylacznie ze zmiennych srodowiskowych. Brak fallbacku
na wartosci wpisane w kod — bez SMTP_PASSWORD endpoint zwraca 503.
"""

import html
import logging
import os
import smtplib
import sys
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Vercel z presetem FastAPI serwuje JEDNA aplikacje pod wszystkimi sciezkami —
# api/link.py nie staje sie osobna funkcja, wiec jego trasy trzeba podpiac pod
# ten sam obiekt app (na dole pliku). Bez tego /api/link odpowiada 404.
sys.path.insert(0, str(Path(__file__).parent))
from link import register as register_link_routes  # noqa: E402

logger = logging.getLogger("contact-api")

SMTP_SERVER   = os.getenv("SMTP_SERVER", "mail.revdu.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "cto@revdu.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")          # bez wartosci domyslnej
NOTIFY_EMAIL  = os.getenv("NOTIFY_EMAIL", "mijaksan@gmail.com")

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "https://xn--micha-jaksan-hcc.xyz")

ALLOWED_ORIGINS = [
    FRONTEND_ORIGIN,
    "https://xn--micha-jaksan-hcc.xyz",
    "https://www.xn--micha-jaksan-hcc.xyz",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app = FastAPI(title="Portfolio Contact", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


class SectionTime(BaseModel):
    name: str
    time_spent: int = 0


class VisitorPayload(BaseModel):
    """Migawka z Trackera — wszystko, co przegladarka wie o sobie sama.
    Pole opcjonalne: formularz ma dzialac takze przy zablokowanym trackerze."""
    fingerprint: str | None = None
    language: str | None = None
    timezone: str | None = None
    screen: str | None = None
    referer: str | None = None
    landing: str | None = None
    total_time: int | None = None       # ms od wejscia na strone
    clicks: int | None = None
    max_scroll: int | None = None
    sections: list[SectionTime] = []


class ContactPayload(BaseModel):
    session_id: str | None = None
    name: str
    email: str
    message: str
    visitor: VisitorPayload | None = None


# ── Dane odwiedzajacego ───────────────────────────────────────────────────────

def _now_local() -> str:
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("Europe/Warsaw")).strftime("%Y-%m-%d %H:%M:%S") + " (Warszawa)"
    except Exception:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S") + " (UTC)"


def _duration(ms: int | None) -> str | None:
    if not ms or ms < 0:
        return None
    seconds = ms // 1000
    return f"{seconds // 60} min {seconds % 60} s" if seconds >= 60 else f"{seconds} s"


def _visitor_rows(payload: ContactPayload, request: Request) -> list[tuple[str, str]]:
    """Sklada tabelke do maila. Zrodla sa dwa: naglowki, ktore widzi serwer
    (IP, geolokalizacja Vercela, user-agent), i migawka z przegladarki."""
    headers = request.headers
    visitor = payload.visitor

    ip = "nieznane"
    for name in ("x-real-ip", "x-forwarded-for", "cf-connecting-ip"):
        value = headers.get(name)
        if value:
            ip = value.split(",")[0].strip()
            break

    city    = headers.get("x-vercel-ip-city")
    country = headers.get("x-vercel-ip-country")
    place   = ", ".join(p for p in (unquote(city) if city else None, country) if p)

    rows: list[tuple[str, str]] = [
        ("Wysłano",     _now_local()),
        ("IP",          ip),
        ("Lokalizacja", place or "nieznana"),
        ("Urządzenie",  headers.get("user-agent") or "nieznane"),
    ]

    if visitor:
        pairs: list[tuple[str, str | None]] = [
            ("Język",          visitor.language),
            ("Strefa czasowa", visitor.timezone),
            ("Ekran",          visitor.screen),
            ("Skąd wszedł",    visitor.referer or "wejście bezpośrednie"),
            ("Weszła na",      visitor.landing),
            ("Czas na stronie", _duration(visitor.total_time)),
            ("Kliknięcia",     str(visitor.clicks) if visitor.clicks is not None else None),
            ("Przewinięte",    f"{visitor.max_scroll}%" if visitor.max_scroll is not None else None),
        ]
        rows += [(label, value) for label, value in pairs if value]

        # Sekcje po czasie — od razu widac, co ogladal najdluzej.
        seen = sorted(visitor.sections, key=lambda s: s.time_spent, reverse=True)
        seen = [s for s in seen if s.time_spent >= 1000]
        if seen:
            rows.append((
                "Oglądał",
                ", ".join(f"{s.name} ({_duration(s.time_spent)})" for s in seen[:8]),
            ))
        if visitor.fingerprint:
            rows.append(("Odcisk przeglądarki", visitor.fingerprint))

    if payload.session_id:
        rows.append(("Sesja", payload.session_id))

    return rows


def _send(name: str, email: str, message: str, details: list[tuple[str, str]]) -> None:
    """Blokujaca wysylka SMTP. Wywolywana synchronicznie — na serverless nie ma
    sensu odsylac odpowiedzi wczesniej, bo funkcja zamarza po odpowiedzi."""
    msg = MIMEMultipart("alternative")
    msg["Subject"]  = f"Nowa wiadomosc od {name} - Portfolio"
    msg["From"]     = SMTP_USERNAME
    msg["To"]       = NOTIFY_EMAIL
    msg["Reply-To"] = email

    plain = (
        f"Imie:    {name}\n"
        f"Email:   {email}\n\n"
        f"Wiadomosc:\n{message}\n\n"
        f"--- Kto pisal ---\n"
        + "".join(f"{label + ':':<20}{value}\n" for label, value in details)
        + f"\n---\nWyslane przez formularz kontaktowy portfolio."
    )
    # Escapowanie — tresc pochodzi od obcej osoby i nie moze wstrzykiwac HTML-a.
    e_name, e_email, e_message = (html.escape(v) for v in (name, email, message))
    e_details = "".join(
        f'<tr><td style="color:#888;padding:3px 14px 3px 0;white-space:nowrap;'
        f'vertical-align:top">{html.escape(label)}</td>'
        f'<td style="padding:3px 0;word-break:break-word">{html.escape(value)}</td></tr>'
        for label, value in details
    )
    body = f"""<html><body style="font-family:sans-serif;padding:24px">
  <h2 style="color:#00aaff">Nowa wiadomosc z portfolio</h2>
  <table>
    <tr><td style="color:#888;width:80px">Imie</td>
        <td><b>{e_name}</b></td></tr>
    <tr><td style="color:#888">Email</td>
        <td><a href="mailto:{e_email}">{e_email}</a></td></tr>
  </table>
  <div style="margin-top:16px;padding:16px;border-left:3px solid #aa00ff">
    <p style="white-space:pre-wrap">{e_message}</p>
  </div>
  <h3 style="color:#888;font-size:13px;text-transform:uppercase;letter-spacing:1px;
             margin:28px 0 8px">Kto pisal</h3>
  <table style="font-size:13px;border-collapse:collapse">{e_details}</table>
</body></html>"""

    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(body,  "html",  "utf-8"))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        refused = smtp.sendmail(SMTP_USERNAME, [NOTIFY_EMAIL], msg.as_string())
    if refused:
        raise RuntimeError(f"Adresy odrzucone: {refused}")


async def _health():
    return {
        "ok": True,
        "service": "contact",
        "smtp_configured": bool(SMTP_PASSWORD),
    }


async def _contact(payload: ContactPayload, request: Request):
    name    = payload.name.strip()
    email   = payload.email.strip()
    message = payload.message.strip()

    if not name or not email or not message:
        raise HTTPException(status_code=422, detail="Wypełnij wszystkie pola")
    if "@" not in email or len(email) > 254:
        raise HTTPException(status_code=422, detail="Nieprawidłowy adres e-mail")
    if len(message) > 5000:
        raise HTTPException(status_code=422, detail="Wiadomość jest za długa")

    if not SMTP_PASSWORD:
        logger.error("Brak SMTP_PASSWORD — wysylka niemozliwa.")
        raise HTTPException(status_code=503, detail="Wysyłka chwilowo niedostępna")

    try:
        _send(name, email, message, _visitor_rows(payload, request))
    except Exception as exc:
        logger.error("Blad wysylki: %s: %s", type(exc).__name__, exc)
        raise HTTPException(status_code=502, detail="Nie udało się wysłać wiadomości")

    # Kontakty nie sa tu zapisywane — baza zyje tylko na lokalnym backendzie.
    return {"ok": True, "email_sent": True}


@app.post("/track")
async def track() -> Response:
    """Zaslepka. Analytics zyja wylacznie na lokalnym backendzie, ale frontend
    na produkcji i tak wola /track przy kazdym wejsciu. Bez tej trasy kazdy
    odwiedzajacy dostawal 404 w konsoli. Tresc zadania jest odrzucana —
    nic nie jest zapisywane."""
    return Response(status_code=204)


app.get("/health")(_health)

for _path in ("/contact", "/api/contact"):
    app.get(_path)(_health)
    app.post(_path)(_contact)

register_link_routes(app)
