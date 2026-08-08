"""
Serverless entry point dla Vercela — WYLACZNIE formularz kontaktowy.

Swiadomie nie importuje main.py ani db.py: tamten kod przy imporcie wola
init_db(), ktore pisze do SQLite, a system plikow funkcji jest tylko do
odczytu. Analytics i /drive zostaja na lokalnym backendzie.

Routing: plik api/contact.py odpowiada URL-owi /api/contact (routing plikowy
Vercela). Trasy sa zarejestrowane pod obiema sciezkami, zeby nie zalezec od
tego, czy platforma poda funkcji sciezke z prefiksem /api czy bez.

Sekrety czytane sa wylacznie ze zmiennych srodowiskowych. Brak fallbacku
na wartosci wpisane w kod — bez SMTP_PASSWORD endpoint zwraca 503.
"""

import html
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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


class ContactPayload(BaseModel):
    session_id: str | None = None
    name: str
    email: str
    message: str


def _send(name: str, email: str, message: str) -> None:
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
        f"---\nWyslane przez formularz kontaktowy portfolio."
    )
    # Escapowanie — tresc pochodzi od obcej osoby i nie moze wstrzykiwac HTML-a.
    e_name, e_email, e_message = (html.escape(v) for v in (name, email, message))
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


async def _contact(payload: ContactPayload):
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
        _send(name, email, message)
    except Exception as exc:
        logger.error("Blad wysylki: %s: %s", type(exc).__name__, exc)
        raise HTTPException(status_code=502, detail="Nie udało się wysłać wiadomości")

    # Kontakty nie sa tu zapisywane — baza zyje tylko na lokalnym backendzie.
    return {"ok": True, "email_sent": True}


app.get("/health")(_health)

for _path in ("/contact", "/api/contact"):
    app.get(_path)(_health)
    app.post(_path)(_contact)
