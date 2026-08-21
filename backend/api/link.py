"""
Serverless entry point dla Vercela — linki specjalne z powiadomieniem na maila.

Link jest podpisany HMAC-em i nie potrzebuje bazy: cala tresc (etykieta, adres
docelowy, data wystawienia, opcjonalna waznosc) siedzi w samym tokenie, a
podpis pilnuje, zeby nikt jej nie podmienil ani nie wystawil wlasnego linku.
Dzieki temu dziala na funkcji serverless z systemem plikow tylko do odczytu —
tak samo jak contact.py.

Routing: plik api/link.py odpowiada URL-owi /api/link (routing plikowy
Vercela). Trasy sa zarejestrowane pod obiema sciezkami, zeby nie zalezec od
tego, czy platforma poda funkcji sciezke z prefiksem /api czy bez.

  GET  /api/link?t=<token>   bezposrednie otwarcie  → mail + przekierowanie
  POST /api/link             wolane przez /l/<token> we froncie (ladny adres)

Tokeny generuje backend/make_link.py — tym samym sekretem LINK_SECRET.
"""

import base64
import hashlib
import hmac
import html
import json
import logging
import os
import re
import smtplib
import time
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

logger = logging.getLogger("link-api")

SMTP_SERVER   = os.getenv("SMTP_SERVER", "mail.revdu.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "cto@revdu.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")          # bez wartosci domyslnej
NOTIFY_EMAIL  = os.getenv("NOTIFY_EMAIL", "mijaksan@gmail.com")

LINK_SECRET     = os.getenv("LINK_SECRET")          # bez sekretu trasa jest martwa
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "https://xn--micha-jaksan-hcc.xyz")

app = FastAPI(title="Portfolio Links", docs_url=None, redoc_url=None)


# ── Token ─────────────────────────────────────────────────────────────────────
#
# Token jest ZASZYFROWANY, nie tylko podpisany. Sam podpis wystarczylby, zeby
# nikt go nie podrobil, ale odbiorca po wklejeniu tresci w dowolny dekoder
# base64 przeczytalby etykiete — czyli dowiedzialby sie, ze dostal link
# znaczony, i pod jaka nazwa go zapisales. Dlatego tresc idzie przez szyfr,
# a token wyglada jak przypadkowy ciag znakow.
#
# Uklad bajtow:  nonce(6) || szyfrogram || tag(12), calosc w base64url.
# Szyfr: XOR ze strumieniem HMAC-SHA256 w trybie licznikowym (biblioteka
# standardowa, zero zaleznosci). Najpierw szyfrujemy, potem liczymy tag —
# tag obejmuje nonce i szyfrogram, wiec podmiana czegokolwiek konczy sie 404.
# Klucze do szyfrowania i do tagu sa wyprowadzone osobno z LINK_SECRET.

_NONCE_LEN = 6
_TAG_LEN   = 12


def b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _subkey(secret: str, purpose: bytes) -> bytes:
    return hmac.new(secret.encode(), purpose, hashlib.sha256).digest()


def _keystream(key: bytes, nonce: bytes, length: int) -> bytes:
    out = bytearray()
    counter = 0
    while len(out) < length:
        out += hmac.new(key, nonce + counter.to_bytes(4, "big"), hashlib.sha256).digest()
        counter += 1
    return bytes(out[:length])


def _tag(key: bytes, nonce: bytes, cipher: bytes) -> bytes:
    return hmac.new(key, nonce + cipher, hashlib.sha256).digest()[:_TAG_LEN]


def make_token(label: str, url: str | None, secret: str, expires_at: int | None = None) -> str:
    """Uzywane przez make_link.py — format tokenu zyje w jednym pliku."""
    data: dict = {"l": label, "c": int(time.time())}
    if url:
        data["u"] = url
    if expires_at:
        data["e"] = int(expires_at)

    plain  = json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode()
    nonce  = os.urandom(_NONCE_LEN)
    cipher = bytes(a ^ b for a, b in zip(plain, _keystream(_subkey(secret, b"enc"), nonce, len(plain))))
    return b64e(nonce + cipher + _tag(_subkey(secret, b"mac"), nonce, cipher))


def read_token(token: str) -> dict:
    """Sprawdza tag i waznosc, potem odszyfrowuje. Kazdy blad daje ten sam
    komunikat — odpowiedz nie ma prawa zdradzac, na czym token polegl."""
    if not LINK_SECRET:
        logger.error("Brak LINK_SECRET — linki specjalne sa wylaczone.")
        raise HTTPException(status_code=503, detail="Linki chwilowo niedostępne")

    bad = HTTPException(status_code=404, detail="Nieprawidłowy link")

    try:
        raw = b64d(token)
    except Exception:
        raise bad
    if len(raw) <= _NONCE_LEN + _TAG_LEN:
        raise bad

    nonce  = raw[:_NONCE_LEN]
    cipher = raw[_NONCE_LEN:-_TAG_LEN]
    tag    = raw[-_TAG_LEN:]

    # Tag sprawdzany przed odszyfrowaniem — nie tykamy tresci, ktorej nie
    # uwierzytelnilismy.
    if not hmac.compare_digest(tag, _tag(_subkey(LINK_SECRET, b"mac"), nonce, cipher)):
        raise bad

    plain = bytes(a ^ b for a, b in
                  zip(cipher, _keystream(_subkey(LINK_SECRET, b"enc"), nonce, len(cipher))))
    try:
        data = json.loads(plain)
    except Exception:
        raise bad
    if not isinstance(data, dict) or not data.get("l"):
        raise bad

    expires_at = data.get("e")
    if expires_at and time.time() > float(expires_at):
        raise HTTPException(status_code=410, detail="Link wygasł")

    return data


def target_of(data: dict) -> str:
    """Cel przekierowania. Schemat sprawdzany mimo podpisu — podpisany
    javascript: nadal bylby dziura, a sprawdzenie kosztuje jedna linijke."""
    url = str(data.get("u") or "").strip()
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return FRONTEND_ORIGIN


# ── Rozpoznanie odwiedzajacego ────────────────────────────────────────────────

# Podglady linkow (Gmail, Slack, WhatsApp, LinkedIn) same pobieraja adres, zanim
# czlowiek w niego kliknie. Bez tego filtra kazdy wyslany link dawalby
# natychmiastowe "otwarto" od bota, a prawdziwe otwarcie ginelo by w szumie.
_BOT_UA = re.compile(
    r"bot\b|crawler|spider|slurp|preview|fetch|monitor|scan|"
    r"curl|wget|python-requests|httpx|okhttp|java/|go-http|libwww|"
    r"headless|googlebot|googleimageproxy|bingbot|yandex|duckduck|baidu|"
    r"slackbot|whatsapp|telegram|discord|facebookexternalhit|twitterbot|"
    r"linkedin|skypeuripreview|applebot|mail\.ru|proofpoint|barracuda",
    re.I,
)


def is_bot(user_agent: str) -> bool:
    return bool(user_agent) and bool(_BOT_UA.search(user_agent))


def client_ip(headers, fallback: str | None = None) -> str:
    for name in ("x-visitor-ip", "x-real-ip", "x-forwarded-for", "cf-connecting-ip"):
        value = headers.get(name)
        if value:
            return value.split(",")[0].strip()
    return fallback or "nieznane"


def geo_from_headers(headers) -> tuple[str | None, str | None]:
    """Vercel wklada geolokalizacje do naglowkow — miasto jest procentowane."""
    country = headers.get("x-vercel-ip-country")
    city    = headers.get("x-vercel-ip-city")
    return country, unquote(city) if city else None


def _tz():
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo("Europe/Warsaw"), "Warszawa"
    except Exception:
        return timezone.utc, "UTC"


def now_local() -> str:
    tz, name = _tz()
    return datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S") + f" ({name})"


def stamp(seconds: float | int | None) -> str | None:
    if not seconds:
        return None
    tz, _ = _tz()
    return datetime.fromtimestamp(float(seconds), tz).strftime("%Y-%m-%d %H:%M")


# ── Mail ──────────────────────────────────────────────────────────────────────

def send_mail(subject: str, heading: str, rows: list[tuple[str, str]]) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = SMTP_USERNAME
    msg["To"]      = NOTIFY_EMAIL

    lines = "\n".join(f"{label + ':':<18}{value}" for label, value in rows)
    plain = f"{heading}\n\n{lines}\n\n---\nPowiadomienie z portfolio.\n"

    cells = "".join(
        f'<tr><td style="color:#888;padding:3px 14px 3px 0;white-space:nowrap;'
        f'vertical-align:top">{html.escape(label)}</td>'
        f'<td style="padding:3px 0;word-break:break-word">'
        f'<b>{html.escape(value)}</b></td></tr>'
        for label, value in rows
    )
    body = f"""<html><body style="font-family:sans-serif;padding:24px">
  <h2 style="color:#aa00ff;margin:0 0 16px">{html.escape(heading)}</h2>
  <table style="font-size:14px;border-collapse:collapse">{cells}</table>
  <p style="color:#aaa;font-size:12px;margin-top:20px">Powiadomienie z portfolio.</p>
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


def notify(data: dict, visitor: dict) -> None:
    """Powiadomienie o otwarciu. Blad wysylki nie moze wywrocic przekierowania —
    odwiedzajacy ma trafic na strone niezaleznie od humoru serwera SMTP."""
    if is_bot(visitor.get("user_agent") or ""):
        logger.info("Pominieto podglad bota dla linku %r", data.get("l"))
        return
    if not SMTP_PASSWORD:
        logger.error("Brak SMTP_PASSWORD — powiadomienie o otwarciu nie poszlo.")
        return

    country, city = visitor.get("country"), visitor.get("city")
    place = ", ".join(part for part in (city, country) if part)

    rows = [
        ("Etykieta",    str(data.get("l"))),
        ("Otwarto",     now_local()),
        ("IP",          visitor.get("ip") or "nieznane"),
        ("Lokalizacja", place or "nieznana"),
        ("Urządzenie",  visitor.get("user_agent") or "nieznane"),
    ]
    if visitor.get("language"):
        rows.append(("Język", visitor["language"]))
    if visitor.get("referer"):
        rows.append(("Skąd wszedł", visitor["referer"]))
    if stamp(data.get("c")):
        rows.append(("Link wystawiony", stamp(data.get("c"))))
    if stamp(data.get("e")):
        rows.append(("Wygasa", stamp(data.get("e"))))
    rows.append(("Cel", target_of(data)))

    try:
        send_mail(f"Otwarto link: {data.get('l')}", "Ktoś otworzył Twój link", rows)
        logger.info("Powiadomienie o otwarciu linku %r wyslane", data.get("l"))
    except Exception as exc:
        logger.error("Blad wysylki powiadomienia: %s: %s", type(exc).__name__, exc)


# ── Trasy ─────────────────────────────────────────────────────────────────────

class OpenPayload(BaseModel):
    """Cialo od proxy /l/<token>. Dane odwiedzajacego przychodza z Nexta, bo to
    on rozmawia z przegladarka — tutaj trafia juz przepisany adres IP."""
    token: str
    ip: str | None = None
    user_agent: str | None = None
    referer: str | None = None
    language: str | None = None
    country: str | None = None
    city: str | None = None


async def _health():
    return {
        "ok": True,
        "service": "link",
        "smtp_configured": bool(SMTP_PASSWORD),
        "secret_configured": bool(LINK_SECRET),
    }


async def _open_get(request: Request, t: str | None = None):
    """Bezposrednie wejscie w /api/link?t=... — dziala takze bez frontu."""
    if not t:
        raise HTTPException(status_code=404, detail="Nieprawidłowy link")

    data = read_token(t)
    country, city = geo_from_headers(request.headers)
    notify(data, {
        "ip":         client_ip(request.headers, request.client.host if request.client else None),
        "user_agent": request.headers.get("user-agent"),
        "referer":    request.headers.get("referer"),
        "language":   request.headers.get("accept-language"),
        "country":    country,
        "city":       city,
    })
    return RedirectResponse(url=target_of(data), status_code=302)


async def _open_post(payload: OpenPayload, request: Request):
    """Wolane przez /l/<token>. Mail leci przed odpowiedzia — na serverless
    funkcja zamarza zaraz po jej oddaniu, wiec odkladanie wysylki nic nie da."""
    data = read_token(payload.token)
    country, city = geo_from_headers(request.headers)
    notify(data, {
        "ip":         payload.ip or client_ip(request.headers, None),
        "user_agent": payload.user_agent or request.headers.get("user-agent"),
        "referer":    payload.referer,
        "language":   payload.language or request.headers.get("accept-language"),
        "country":    payload.country or country,
        "city":       payload.city or city,
    })
    return {"ok": True, "url": target_of(data)}


app.get("/link/health")(_health)
app.get("/api/link/health")(_health)

for _path in ("/link", "/api/link"):
    app.get(_path)(_open_get)
    app.post(_path)(_open_post)
