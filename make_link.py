#!/usr/bin/env python3
"""
Generator linkow specjalnych — okno albo wiersz polecen.

Podpisuje i szyfruje token, ktory potem obsluguje backend/api/link.py. Chodzi
wylacznie na wlasnej maszynie: sekret nie ma jak wyciec, bo nigdzie go nie
wysylamy. Vercel jest bezserwerowy — nie ma tam czego uruchamiac ani gdzie sie
logowac; serwer sprawdza token dopiero wtedy, gdy ktos kliknie link.

    python make_link.py                        okno (tkinter)
    python make_link.py "Rekruter Nokia"       wiersz polecen
    python make_link.py --gen-secret           swiezy sekret i koniec

Sekret czytany jest z LINK_SECRET (srodowisko albo backend/.env.local). Ten sam
sekret musi siedziec w zmiennych projektu portfolio-api na Vercelu — inaczej
wystawione tu linki nie przejda weryfikacji po stronie serwera.
"""

import argparse
import os
import secrets
import sys
import time
from pathlib import Path

ROOT_DIR    = Path(__file__).parent
BACKEND_DIR = ROOT_DIR / "backend"
API_DIR     = BACKEND_DIR / "api"
ENV_FILE    = BACKEND_DIR / ".env.local"

DEFAULT_BASE = "https://xn--micha-jaksan-hcc.xyz"


# ── Sekret i token ────────────────────────────────────────────────────────────

def load_env_file() -> None:
    """Dociaga backend/.env.local, ale nigdy nie nadpisuje prawdziwego srodowiska."""
    if not ENV_FILE.is_file():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def get_secret() -> str | None:
    load_env_file()
    return os.getenv("LINK_SECRET") or None


def save_secret(secret: str) -> None:
    """Dopisuje swiezy sekret do backend/.env.local (plik jest w .gitignore)."""
    block = (
        "\n# Sekret do podpisywania linkow specjalnych (make_link.py + api/link.py).\n"
        "# Ten sam ciag musi byc ustawiony w zmiennych projektu portfolio-api na Vercelu.\n"
        f"LINK_SECRET={secret}\n"
    )
    with ENV_FILE.open("a", encoding="utf-8") as handle:
        handle.write(block)
    os.environ["LINK_SECRET"] = secret


def build_link(label: str, url: str | None, days: int | None,
               style: str, base: str, secret: str) -> str:
    """Sklada gotowy adres. Format tokenu zyje w backend/api/link.py — importujemy
    go zamiast kopiowac, zeby generator i weryfikacja nie mogly sie rozjechac."""
    if str(API_DIR) not in sys.path:
        sys.path.insert(0, str(API_DIR))
    from link import make_token  # noqa: E402

    base = base.rstrip("/")
    target = url or base
    expires_at = int(time.time() + days * 86_400) if days else None

    if style == "ref":
        # Cel siedzi w samym adresie, wiec nie musi ladowac do tokenu — link
        # wyglada wtedy jak zwykly adres strony z parametrem polecajacym.
        token = make_token(label, None, secret, expires_at)
        joiner = "&" if "?" in target else "?"
        return f"{target}{joiner}ref={token}"

    return f"{base}/l/{make_token(label, url, secret, expires_at)}"


# ── Window ──────────────────────────────────────────────────────────────────────

def run_gui() -> int:
    try:
        import tkinter as tk
        from tkinter import messagebox, ttk
    except ImportError:
        print("Brak tkinter w tej instalacji Pythona — uzyj wiersza polecen:\n"
              '  python make_link.py "Etykieta"', file=sys.stderr)
        return 1

    PAD = {"padx": 10, "pady": 5}

    root = tk.Tk()
    root.title("Generator linków")
    root.resizable(False, False)

    label_var  = tk.StringVar()
    url_var    = tk.StringVar()
    days_var   = tk.StringVar()
    base_var   = tk.StringVar(value=os.getenv("LINK_BASE", DEFAULT_BASE))
    style_var  = tk.StringVar(value="ref")
    result_var = tk.StringVar()
    status_var = tk.StringVar()

    frame = ttk.Frame(root, padding=14)
    frame.grid(sticky="nsew")

    row = 0
    ttk.Label(frame, text="Etykieta", width=16, anchor="w").grid(row=row, column=0, sticky="w", **PAD)
    entry_label = ttk.Entry(frame, textvariable=label_var, width=52)
    entry_label.grid(row=row, column=1, sticky="we", **PAD)

    row += 1
    ttk.Label(frame, text="kto dostaje link — ten tekst trafia do maila",
              foreground="#888").grid(row=row, column=1, sticky="w", padx=10)

    row += 1
    ttk.Label(frame, text="Adres docelowy", anchor="w").grid(row=row, column=0, sticky="w", **PAD)
    ttk.Entry(frame, textvariable=url_var, width=52).grid(row=row, column=1, sticky="we", **PAD)

    row += 1
    ttk.Label(frame, text="puste = strona główna", foreground="#888").grid(
        row=row, column=1, sticky="w", padx=10)

    row += 1
    ttk.Label(frame, text="Wygasa po (dni)", anchor="w").grid(row=row, column=0, sticky="w", **PAD)
    ttk.Entry(frame, textvariable=days_var, width=10).grid(row=row, column=1, sticky="w", **PAD)

    row += 1
    ttk.Label(frame, text="puste = link działa bezterminowo", foreground="#888").grid(
        row=row, column=1, sticky="w", padx=10)

    row += 1
    ttk.Label(frame, text="Domena", anchor="w").grid(row=row, column=0, sticky="w", **PAD)
    ttk.Entry(frame, textvariable=base_var, width=52).grid(row=row, column=1, sticky="we", **PAD)

    row += 1
    ttk.Label(frame, text="Format", anchor="w").grid(row=row, column=0, sticky="nw", **PAD)
    styles = ttk.Frame(frame)
    styles.grid(row=row, column=1, sticky="w", **PAD)
    ttk.Radiobutton(styles, text="dyskretny — zwykły adres z ?ref=…",
                    variable=style_var, value="ref").grid(row=0, column=0, sticky="w")
    ttk.Radiobutton(styles, text="jawny /l/<token> — gdy cel jest poza Twoją domeną",
                    variable=style_var, value="path").grid(row=1, column=0, sticky="w")

    row += 1
    ttk.Separator(frame, orient="horizontal").grid(row=row, column=0, columnspan=2,
                                                   sticky="we", pady=10)

    row += 1
    buttons = ttk.Frame(frame)
    buttons.grid(row=row, column=0, columnspan=2, sticky="we", **PAD)

    row += 1
    ttk.Label(frame, text="Gotowy link", anchor="w").grid(row=row, column=0, sticky="w", **PAD)
    result_entry = ttk.Entry(frame, textvariable=result_var, width=52, state="readonly")
    result_entry.grid(row=row, column=1, sticky="we", **PAD)

    row += 1
    status = ttk.Label(frame, textvariable=status_var, foreground="#888")
    status.grid(row=row, column=1, sticky="w", padx=10, pady=(0, 6))

    def set_status(text: str, error: bool = False) -> None:
        status_var.set(text)
        status.configure(foreground="#c0392b" if error else "#888")

    def copy_result() -> None:
        link = result_var.get()
        if not link:
            return
        root.clipboard_clear()
        root.clipboard_append(link)
        root.update()          # bez tego schowek gubi tresc po zamknieciu okna
        set_status("Skopiowano do schowka.")

    def generate() -> None:
        label = label_var.get().strip()
        if not label:
            set_status("Podaj etykietę — bez niej mail nie powie Ci, czyj link się otworzył.", error=True)
            entry_label.focus_set()
            return

        url = url_var.get().strip() or None
        if url and not url.startswith(("http://", "https://")):
            set_status("Adres docelowy musi zaczynać się od http:// albo https://", error=True)
            return

        days_text = days_var.get().strip()
        days = None
        if days_text:
            if not days_text.isdigit() or int(days_text) < 1:
                set_status("Liczba dni musi być dodatnią liczbą całkowitą.", error=True)
                return
            days = int(days_text)

        secret = get_secret()
        if not secret:
            set_status("Brak sekretu — kliknij „Utwórz sekret”.", error=True)
            return

        try:
            link = build_link(label, url, days, style_var.get(), base_var.get().strip(), secret)
        except Exception as exc:                       # noqa: BLE001 — komunikat trafia do okna
            set_status(f"Nie udało się wygenerować: {exc}", error=True)
            return

        result_var.set(link)
        copy_result()
        set_status(f"Gotowe — skopiowano. Etykieta: {label}")

    def create_secret() -> None:
        if get_secret():
            messagebox.showinfo(
                "Sekret już istnieje",
                "LINK_SECRET jest ustawiony i linki się nim podpisują.\n\n"
                "Nie zmieniaj go bez potrzeby — po zmianie wszystkie wcześniej "
                "wystawione linki przestaną działać.")
            return
        secret = secrets.token_hex(32)
        save_secret(secret)
        root.clipboard_clear()
        root.clipboard_append(secret)
        root.update()
        refresh_secret_state()
        messagebox.showinfo(
            "Sekret utworzony",
            f"Zapisano w {ENV_FILE} i skopiowano do schowka.\n\n"
            "Wklej ten sam ciąg jako LINK_SECRET w zmiennych projektu "
            "portfolio-api na Vercelu — bez tego linki nie przejdą weryfikacji.")

    def show_secret() -> None:
        secret = get_secret()
        if not secret:
            set_status("Brak sekretu — kliknij „Utwórz sekret”.", error=True)
            return
        root.clipboard_clear()
        root.clipboard_append(secret)
        root.update()
        messagebox.showinfo(
            "Sekret do Vercela",
            f"{secret}\n\nSkopiowano do schowka. Wklej jako LINK_SECRET "
            "w zmiennych projektu portfolio-api.")

    ttk.Button(buttons, text="Generuj link", command=generate).grid(row=0, column=0, padx=(0, 8))
    ttk.Button(buttons, text="Kopiuj", command=copy_result).grid(row=0, column=1, padx=(0, 8))
    button_create = ttk.Button(buttons, text="Utwórz sekret", command=create_secret)
    button_create.grid(row=0, column=2, padx=(0, 8))
    button_show = ttk.Button(buttons, text="Sekret do Vercela", command=show_secret)
    button_show.grid(row=0, column=3)

    def refresh_secret_state() -> None:
        if get_secret():
            button_create.state(["disabled"])
            button_show.state(["!disabled"])
            set_status(f"Sekret wczytany z {ENV_FILE.name}.")
        else:
            button_create.state(["!disabled"])
            button_show.state(["disabled"])
            set_status("Brak sekretu — zacznij od „Utwórz sekret”.", error=True)

    refresh_secret_state()
    root.bind("<Return>", lambda _event: generate())
    entry_label.focus_set()
    root.mainloop()
    return 0


# ── Wiersz polecen ────────────────────────────────────────────────────────────

def run_cli(args: argparse.Namespace) -> int:
    secret = args.secret or get_secret()
    if not secret:
        print("Brak LINK_SECRET. Wygeneruj go:  python make_link.py --gen-secret",
              file=sys.stderr)
        return 1

    if args.url and not args.url.startswith(("http://", "https://")):
        print("--url musi zaczynac sie od http:// albo https://", file=sys.stderr)
        return 1

    print(build_link(args.label, args.url, args.days, args.style, args.base, secret))

    if args.days:
        print(f"\nWygasa za {args.days} dni.", file=sys.stderr)
    print(f"Etykieta: {args.label}", file=sys.stderr)
    print(f"Cel:      {args.url or args.base.rstrip('/')}", file=sys.stderr)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Generator linkow z powiadomieniem")
    parser.add_argument("label", nargs="?", help='etykieta widoczna w mailu, np. "Rekruter Nokia"')
    parser.add_argument("--url", help="dokad ma trafic klikajacy (domyslnie strona glowna)")
    parser.add_argument("--days", type=int, help="po ilu dniach link ma przestac dzialac")
    parser.add_argument("--base", default=os.getenv("LINK_BASE", DEFAULT_BASE),
                        help="domena, na ktorej stoi front")
    parser.add_argument("--style", choices=("ref", "path"), default="ref",
                        help="ref: zwykly adres z parametrem (domyslnie, nie rzuca sie w oczy); "
                             "path: /l/<token>, gdy cel jest poza wlasna domena")
    parser.add_argument("--secret", help="sekret HMAC (domyslnie z LINK_SECRET)")
    parser.add_argument("--gen-secret", action="store_true",
                        help="wypisz swiezy sekret i zakoncz")
    args = parser.parse_args()

    if args.gen_secret:
        print(secrets.token_hex(32))
        print("\nWklej to jako LINK_SECRET w zmiennych projektu portfolio-api "
              "na Vercelu oraz w backend/.env.local.", file=sys.stderr)
        return 0

    # Bez etykiety nie ma czego generowac z wiersza polecen — otwieramy okno.
    return run_cli(args) if args.label else run_gui()


if __name__ == "__main__":
    raise SystemExit(main())
