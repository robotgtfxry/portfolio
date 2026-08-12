"""
Useme.com - zbieranie ofert (zlecen) z dwoch kategorii + GUI w Tkinter.

Kategorie:
  - https://useme.com/pl/jobs/category/serwisy-internetowe,34/
  - https://useme.com/pl/jobs/category/programowanie-i-it,35/

Dla kazdego ogloszenia zbierane sa:
  - tytul
  - opis (skrocony, taki jaki jest na liscie)
  - liczba zlozonych ofert (ile osob sie zglosilo)
  - cena / budzet
  - czy cena jest "Do negocjacji"
  - ile zostalo do konca ogloszenia
  - zleceniodawca, podkategoria, link

Lista obserwowanych (watchlist):
  Zaznaczasz ogloszenie i wciskasz spacje (albo Ctrl+D / przycisk pod tabela).
  Zapisuje sie do pliku useme_watchlist.json obok skryptu razem z migawka stanu.
  Przy kazdym starcie program pobiera oferty, porownuje je z migawka i pokazuje
  okno z tym, co sie zmienilo (liczba ofert, cena, zakonczenie zlecenia, tytul).
  Wyroznione dostaja swieze dane zawsze: te, ktorych nie ma na pobranych
  stronach kategorii, sa dociagane pojedynczo z ich wlasnych stron ogloszen.
  Widok jest podwojny i rowny: po lewej "Wszystkie ogloszenia", po prawej panel
  "Wyroznione", miedzy nimi ruchomy suwak ustawiony na srodku. Wyroznione
  ogloszenie od razu znika z lewej tabeli i siedzi wylacznie w prawym panelu -
  na zawsze, zaden filtr go tam nie wciagnie z powrotem. Spacja (albo Ctrl+D)
  w panelu zdejmuje wyroznienie i dopiero wtedy ogloszenie wraca do tabeli,
  Delete odrzuca. Panel chowa sie przyciskiem "Ukryj" albo checkboxem "Panel
  wyroznionych" w pasku pobierania - schowanie chowa razem z nim wyroznione
  ogloszenia, w tabeli sie nie pojawia (pasek stanu pisze, ile ich czeka).

Odrzucanie ogloszen:
  Klikasz "x" w kolumnie X (albo Delete / przycisk pod tabela) i ogloszenie
  laduje w useme_odrzucone.json - przy wlaczonym filtrze "Ukryj odrzucone"
  nie pokaze sie juz nigdy wiecej, tez po restarcie programu.
  Odznaczenie filtra pokazuje je na szaro ze znakiem "+" do przywrocenia.
  Odrzucenie zdejmuje ogloszenie z obserwowanych i odwrotnie.

  Uwaga na "Wazne przez N dni" na stronie ogloszenia: to dlugosc waznosci
  liczona od publikacji (stala), a nie ile zostalo. Date wygasniecia bierzemy
  z JSON-LD (validThrough) i dopiero z niej liczymy "znika za X dni" - tak samo
  jak robi to listing kategorii. Gdy strony nie da sie pobrac (404, blad sieci),
  program napisze o tym wprost i pokaze ostatnia migawke zamiast zgadywac.

Oznaczenie "odpowiedziano" (Alt+O):
  Alt+O na zaznaczonym ogloszeniu (w tabeli albo w panelu wyroznionych) albo
  przycisk pod tabela oznacza ogloszenie na zielono - to znaczy, ze juz sie
  zglosilismy/napisalismy do zleceniodawcy. Zapisuje sie do pliku
  useme_odpowiedziane.json obok skryptu i przezywa restart programu.
  Niezalezne od wyroznionych i odrzuconych - nie zdejmuje ani nie zaklada
  tamtych oznaczen, dziala rownolegle z nimi.

Uruchomienie:
    python useme_scraper.py

Wymagane: requests, beautifulsoup4
    pip install requests beautifulsoup4
"""

import csv
import json
import os
import re
import threading
import webbrowser
import tkinter as tk
from datetime import date, datetime
from tkinter import ttk, filedialog, messagebox

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:  # czytelny komunikat zamiast tracebacka
    raise SystemExit(
        "Brakuje bibliotek. Zainstaluj je poleceniem:\n"
        "    pip install requests beautifulsoup4"
    )


BASE = "https://useme.com"

CATEGORIES = {
    "Serwisy internetowe": "/pl/jobs/category/serwisy-internetowe,34/",
    "Programowanie i IT": "/pl/jobs/category/programowanie-i-it,35/",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "pl-PL,pl;q=0.9",
}

NEGOTIABLE_WORDS = ("negocjacji", "negotiable", "uzgodnienia")

# tekst w polu z terminem, ktory oznacza ze ogloszenie juz nie zbiera ofert
FINISHED_WORDS = ("zakonczone", "zakończone", "zakonczony", "zakończony",
                  "finished", "ended", "expired", "wygaslo", "wygasło")

# co wycina checkbox "Bez WordPressa"
WORDPRESS_WORDS = ("wordpress", "word press", "woocommerce", "woo commerce",
                   "elementor", "wp-", "divi")

# lista obserwowanych - plik obok skryptu
WATCHLIST_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              "useme_watchlist.json")

# odrzucone ogloszenia - drugi plik obok skryptu
REJECTED_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             "useme_odrzucone.json")

# oferty, na ktore juz odpowiedzielismy - trzeci plik obok skryptu
APPLIED_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "useme_odpowiedziane.json")


# ---------------------------------------------------------------- model


class Job:
    """Pojedyncze ogloszenie."""

    __slots__ = (
        "category", "title", "description", "url", "client",
        "subcategory", "offers", "price", "price_raw", "negotiable",
        "deadline_raw", "days_left", "finished", "stale", "changes",
    )

    # pola zapisywane na liste obserwowanych
    SNAPSHOT_FIELDS = (
        "category", "title", "description", "url", "client", "subcategory",
        "offers", "price", "price_raw", "negotiable", "deadline_raw",
        "days_left", "finished",
    )

    def __init__(self, **kw):
        for name in self.__slots__:
            setattr(self, name, kw.get(name))
        self.stale = bool(kw.get("stale"))
        self.changes = list(kw.get("changes") or [])

    def as_row(self):
        return (
            self.category,
            self.title,
            self.offers,
            self.price_raw,
            "tak" if self.negotiable else "nie",
            self.deadline_raw,
            self.client,
            self.subcategory,
            self.url,
        )

    def snapshot(self):
        return {name: getattr(self, name) for name in self.SNAPSHOT_FIELDS}


def job_from_snapshot(data):
    """Odtwarza ogloszenie z zapisanej migawki (gdy nie ma go juz na liscie)."""
    job = Job(**{name: data.get(name) for name in Job.SNAPSHOT_FIELDS})
    job.stale = True
    return job


class JsonStore:
    """Slownik url -> dane, trzymany w pliku JSON obok skryptu."""

    def __init__(self, path):
        self.path = path
        self.data = {}
        self.error = None
        self.load()

    def load(self):
        try:
            with open(self.path, encoding="utf-8") as handle:
                raw = json.load(handle)
            jobs = raw.get("jobs") if isinstance(raw, dict) else None
            self.data = jobs if isinstance(jobs, dict) else {}
        except FileNotFoundError:
            self.data = {}
        except (OSError, ValueError) as exc:
            self.data = {}
            self.error = f"Nie udalo sie wczytac {self.path}: {exc}"

    def save(self):
        payload = {"saved": datetime.now().isoformat(timespec="seconds"),
                   "jobs": self.data}
        try:
            with open(self.path, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, ensure_ascii=False, indent=1)
            self.error = None
        except OSError as exc:
            self.error = f"Nie udalo sie zapisac {self.path}: {exc}"
        return self.error

    def __contains__(self, url):
        return url in self.data

    def __len__(self):
        return len(self.data)

    def remove(self, url):
        self.data.pop(url, None)

    def clear(self):
        self.data = {}


class Watchlist(JsonStore):
    """Obserwowane ogloszenia + migawka ich stanu z poprzedniego uruchomienia."""

    def __init__(self, path=WATCHLIST_FILE):
        super().__init__(path)

    def add(self, job):
        entry = job.snapshot()
        entry["added"] = datetime.now().isoformat(timespec="seconds")
        entry["last_seen"] = entry["added"]
        self.data[job.url] = entry

    def update(self, job):
        """Nadpisuje migawke swiezymi danymi (po pokazaniu zmian)."""
        entry = self.data.get(job.url)
        if entry is None:
            return
        added = entry.get("added")
        entry.update(job.snapshot())
        entry["added"] = added
        entry["last_seen"] = datetime.now().isoformat(timespec="seconds")

    def diff(self, job):
        """Lista zmian wzgledem zapisanej migawki.

        Swiadomie pomijamy sam licznik dni - on zmienia sie codziennie i
        zalalby raport szumem. Liczy sie zakonczenie zlecenia.
        """
        old = self.data.get(job.url)
        if not old:
            return []

        changes = []
        old_offers = old.get("offers")
        if isinstance(old_offers, int) and old_offers != job.offers:
            delta = job.offers - old_offers
            changes.append(f"oferty: {old_offers} -> {job.offers} "
                           f"({'+' if delta > 0 else ''}{delta})")

        if old.get("price_raw") and old["price_raw"] != job.price_raw:
            changes.append(f"cena: {old['price_raw']} -> {job.price_raw}")

        if job.finished and not old.get("finished"):
            changes.append(f"zlecenie zakonczone ({job.deadline_raw})")

        if old.get("title") and old["title"] != job.title:
            changes.append("zmieniony tytul")

        return changes


class RejectList(JsonStore):
    """Odrzucone ogloszenia - te, ktorych nie chcemy wiecej ogladac."""

    def __init__(self, path=REJECTED_FILE):
        super().__init__(path)

    def add(self, job):
        self.data[job.url] = {
            "title": job.title,
            "rejected": datetime.now().isoformat(timespec="seconds"),
        }


class AppliedList(JsonStore):
    """Oferty, na ktore juz odpowiedzielismy/zglosilismy sie.

    Niezalezne od Watchlist/RejectList - to trzeci, rownolegly znacznik.
    """

    def __init__(self, path=APPLIED_FILE):
        super().__init__(path)

    def add(self, job):
        self.data[job.url] = {
            "title": job.title,
            "applied": datetime.now().isoformat(timespec="seconds"),
        }


# ---------------------------------------------------------------- parsery


def _text(node):
    return re.sub(r"\s+", " ", node.get_text(" ", strip=True)) if node else ""


def parse_price(raw):
    """'1 500,00 PLN' -> 1500.0 ; 'Do negocjacji' -> None"""
    cleaned = raw.replace("\xa0", " ")
    match = re.search(r"(\d[\d \.]*(?:,\d+)?)", cleaned)
    if not match:
        return None
    number = match.group(1).replace(" ", "").replace(".", "").replace(",", ".")
    try:
        return float(number)
    except ValueError:
        return None


def parse_deadline(raw):
    """'Znika za 29 dni' -> 29.0 ; 'Znika za 5 godzin' -> ~0.21"""
    match = re.search(r"(\d+)\s*(dni|dzien|dzień|godzin|godz|minut)", raw, re.I)
    if not match:
        return None
    value = float(match.group(1))
    unit = match.group(2).lower()
    if unit.startswith("godz"):
        return value / 24.0
    if unit.startswith("minut"):
        return value / 1440.0
    return value


def parse_published(raw):
    """'wczoraj' / '3 dni temu' / '2026-05-08' -> ile dni temu opublikowano."""
    low = raw.lower()
    if "wczoraj" in low:
        return 1.0
    if "dzis" in low or "dziś" in low or "godzin" in low or "minut" in low:
        return 0.0

    match = re.search(r"(\d+)\s*(dni|dzien|dzień|tyg|miesi)", low)
    if match:
        value = float(match.group(1))
        unit = match.group(2)
        if unit.startswith("tyg"):
            return value * 7.0
        if unit.startswith("miesi"):
            return value * 30.0
        return value

    match = re.search(r"(\d{4})-(\d{2})-(\d{2})", raw)
    if match:
        published = datetime(*(int(part) for part in match.groups()))
        return float((datetime.now() - published).days)

    return None


def format_days_left(left):
    """Termin w stylu listingu useme: 'Znika za 6 dni' / 'Znika za 1 dzien'."""
    if left <= 0:
        return "Zakonczone"
    days = int(left)
    return f"Znika za {days} dzien" if days == 1 else f"Znika za {days} dni"


def parse_iso_date(raw):
    """'2026-08-09' albo '2026-08-09T12:00:00+02:00' -> date."""
    match = re.match(r"\s*(\d{4})-(\d{2})-(\d{2})", raw or "")
    if not match:
        return None
    try:
        return date(*(int(part) for part in match.groups()))
    except ValueError:
        return None


def parse_job_ld(soup):
    """JobPosting z <script type="application/ld+json">.

    Siedzi tam twarda data wygasniecia (validThrough), wiec nie musimy liczyc
    niczego z tekstu "Wazne przez N dni" - ten podaje dlugosc waznosci liczona
    od publikacji, a nie ile zostalo.
    """
    for tag in soup.select('script[type="application/ld+json"]'):
        try:
            data = json.loads(tag.string or "")
        except (ValueError, TypeError):
            continue
        for item in (data if isinstance(data, list) else [data]):
            if isinstance(item, dict) and item.get("@type") == "JobPosting":
                return item
    return {}


def parse_job_page(html):
    """Swieze dane wprost ze strony ogloszenia - dla wyroznionych.

    Termin bierzemy z validThrough w JSON-LD; gdyby go zabraklo, liczymy go
    z daty publikacji i dlugosci waznosci ("Wazne przez N dni").
    Zwraca slownik pol do nadpisania migawki albo pusty, gdy nic nie rozpoznano.
    """
    soup = BeautifulSoup(html, "html.parser")
    data = {}

    title = _text(soup.select_one("h1"))
    if title:
        data["title"] = title

    summary = {}
    for item in soup.select(".jobs-summary__item"):
        label = _text(item.select_one(".jobs-summary__item-label")).lower()
        value = _text(item.select_one(".jobs-summary__item-value"))
        if label and value and label not in summary:
            summary[label] = value

    # etykiety maja polskie znaki (Budzet/Wazne), wiec dopasowujemy fragmentami
    published_raw = valid_raw = ""
    for label, value in summary.items():
        if "bud" in label:
            data["price_raw"] = value
        elif "zlecenio" in label:
            data["client"] = value
        elif "kategoria" in label:
            data["subcategory"] = value
        elif "opublik" in label:
            published_raw = value
        elif "przez" in label:
            valid_raw = value

    if "price_raw" in data:
        negotiable = any(word in data["price_raw"].lower()
                         for word in NEGOTIABLE_WORDS)
        data["negotiable"] = negotiable
        data["price"] = None if negotiable else parse_price(data["price_raw"])

    for head in soup.select("h2"):
        match = re.search(r"\((\d+)\)", _text(head)) if "ofert" in _text(head).lower() else None
        if match:
            data["offers"] = int(match.group(1))
            break

    # 1. twarda data z JSON-LD, 2. dopiero potem liczenie z tekstu
    left = None
    valid_through = parse_iso_date(parse_job_ld(soup).get("validThrough"))
    if valid_through is not None:
        left = float((valid_through - date.today()).days)
    else:
        valid_days = parse_deadline(valid_raw)
        days_ago = parse_published(published_raw)
        if valid_days is not None and days_ago is not None:
            left = valid_days - days_ago

    if left is not None:
        data["days_left"] = left
        data["finished"] = left <= 0
        data["deadline_raw"] = format_days_left(left)

    # sam tytul to za malo, zeby uznac strone za odczytana
    return data if "offers" in data or "price_raw" in data else {}


def parse_page(html, category):
    """Wyciaga liste Job z HTML-a strony kategorii."""
    soup = BeautifulSoup(html, "html.parser")
    jobs = []

    for art in soup.select("article.job"):
        link = art.select_one("a.job__title")
        if not link:
            continue

        title = _text(link)
        url = link.get("href", "")
        if url.startswith("/"):
            url = BASE + url

        client_node = art.select_one(".job__headline strong")
        desc_node = art.select_one(".job__content p")
        offers_node = art.select_one(".job__header-details--offers span:last-of-type")
        date_node = art.select_one(".job__header-details--date")
        budget_node = art.select_one(".job__budget-value")
        subcat_node = art.select_one(".job__category p")

        offers_text = _text(offers_node)
        offers_match = re.search(r"\d+", offers_text)
        offers = int(offers_match.group()) if offers_match else 0

        price_raw = _text(budget_node) or "brak danych"
        negotiable = any(word in price_raw.lower() for word in NEGOTIABLE_WORDS)
        price = None if negotiable else parse_price(price_raw)

        deadline_raw = _text(date_node) or "brak danych"
        finished = any(word in deadline_raw.lower() for word in FINISHED_WORDS)

        jobs.append(Job(
            category=category,
            title=title,
            description=_text(desc_node),
            url=url,
            client=_text(client_node) or "-",
            subcategory=_text(subcat_node) or "-",
            offers=offers,
            price=price,
            price_raw=price_raw,
            negotiable=negotiable,
            deadline_raw=deadline_raw,
            days_left=parse_deadline(deadline_raw),
            finished=finished,
        ))

    return jobs


def fetch_jobs(categories, pages=1, progress=None, stop_flag=None):
    """Pobiera ogloszenia z wybranych kategorii; `progress(tekst)` to callback."""
    session = requests.Session()
    session.headers.update(HEADERS)
    collected = []
    seen = set()

    for name in categories:
        path = CATEGORIES[name]
        for page in range(1, pages + 1):
            if stop_flag is not None and stop_flag.is_set():
                return collected

            url = f"{BASE}{path}" + (f"?page={page}" if page > 1 else "")
            if progress:
                progress(f"Pobieram: {name} - strona {page}...")

            try:
                response = session.get(url, timeout=25)
                response.raise_for_status()
            except requests.RequestException as exc:
                if progress:
                    progress(f"Blad pobierania ({name}, strona {page}): {exc}")
                break

            response.encoding = response.apparent_encoding or "utf-8"
            page_jobs = parse_page(response.text, name)
            if not page_jobs:
                break

            for job in page_jobs:
                if job.url in seen:
                    continue
                seen.add(job.url)
                collected.append(job)

    return collected


def fetch_watched_jobs(urls, snapshots, progress=None, stop_flag=None):
    """Dociaga swieze dane wprost ze stron wyroznionych ogloszen.

    Uzywane dla tych, ktore wypadly poza pobrane strony kategorii - zamiast
    pokazywac migawke sprzed tygodnia, pytamy o nie osobno. Czego nie da sie
    odczytac ze strony (opis, kategoria), zostaje z migawki.
    """
    session = requests.Session()
    session.headers.update(HEADERS)
    jobs = []

    for index, url in enumerate(urls, 1):
        if stop_flag is not None and stop_flag.is_set():
            break
        if progress:
            progress(f"Odswiezam wyroznione: {index}/{len(urls)}...")

        try:
            response = session.get(url, timeout=25)
            response.raise_for_status()
        except requests.RequestException as exc:
            if progress:
                progress(f"Nie udalo sie odswiezyc wyroznionego: {exc}")
            continue

        response.encoding = response.apparent_encoding or "utf-8"
        fresh = parse_job_page(response.text)
        if not fresh:
            continue

        data = dict(snapshots.get(url) or {})
        data.update(fresh)
        data["url"] = url
        jobs.append(Job(**{name: data.get(name) for name in Job.SNAPSHOT_FIELDS}))

    return jobs


# ---------------------------------------------------------------- GUI


def panel_deadline(job):
    """Krotki tekst do waskiej kolumny 'Do konca' w panelu wyroznionych."""
    if job.finished:
        return "koniec"
    if job.days_left is None:
        return job.deadline_raw or "-"
    if job.days_left < 1:
        return f"{max(1, int(job.days_left * 24))} godz"
    days = int(job.days_left)
    return "1 dzien" if days == 1 else f"{days} dni"


COLUMNS = (
    ("watch", "Wyr.", 45, "center"),
    ("reject", "X", 34, "center"),
    ("category", "Kategoria", 150, "w"),
    ("title", "Tytul", 430, "w"),
    ("offers", "Ofert", 55, "center"),
    ("price", "Cena", 110, "e"),
    ("negotiable", "Negocjacja", 85, "center"),
    ("deadline", "Do konca", 120, "w"),
    ("client", "Zleceniodawca", 140, "w"),
    ("subcategory", "Podkategoria", 150, "w"),
)


class App(ttk.Frame):
    def __init__(self, master):
        super().__init__(master, padding=8)
        self.grid(row=0, column=0, sticky="nsew")
        master.rowconfigure(0, weight=1)
        master.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)
        self.columnconfigure(0, weight=1)

        self.all_jobs = []       # wszystko co pobrane
        self.shown_jobs = []     # po filtrach, w kolejnosci jak w tabeli
        self.panel_jobs = []     # wyroznione, w kolejnosci jak w prawym panelu
        self.sort_state = {}
        self.stop_flag = threading.Event()
        self.worker = None
        self.watch = Watchlist()
        self.rejected = RejectList()
        self.applied = AppliedList()
        self.watch_note = ""     # podsumowanie zmian do paska stanu
        self.active_job = None   # to, co widac w szczegolach (tabela albo panel)
        # widoczny panel = wyroznione siedza tylko w nim, nie w glownej tabeli
        self.show_watch_panel = tk.BooleanVar(value=True)

        self._build_toolbar()
        self._build_filters()
        self._build_table()
        self._build_details()
        self._build_status()
        self.refresh_watch_panel()

        if self.watch.error or self.rejected.error or self.applied.error:
            self.set_status(self.watch.error or self.rejected.error or self.applied.error)

    # ------------------------------------------------------ budowa GUI

    def _build_watch_panel(self, parent):
        """Prawy panel splitu - wyroznione (obserwowane) ogloszenia."""
        self.watch_panel = ttk.LabelFrame(parent, text="Wyroznione", padding=6)
        self.watch_panel.rowconfigure(0, weight=1)
        self.watch_panel.columnconfigure(0, weight=1)

        self.watch_tree = ttk.Treeview(
            self.watch_panel, columns=("title", "offers", "deadline"),
            show="headings", selectmode="browse", height=12)
        self.watch_tree.heading("title", text="Tytul")
        self.watch_tree.heading("offers", text="Of.")
        self.watch_tree.heading("deadline", text="Do konca")
        self.watch_tree.column("title", width=190, anchor="w", stretch=True)
        self.watch_tree.column("offers", width=38, anchor="center", stretch=False)
        self.watch_tree.column("deadline", width=80, anchor="e", stretch=False)
        self.watch_tree.grid(row=0, column=0, sticky="nsew")

        scroll = ttk.Scrollbar(self.watch_panel, orient="vertical",
                               command=self.watch_tree.yview)
        scroll.grid(row=0, column=1, sticky="ns")
        self.watch_tree.configure(yscrollcommand=scroll.set)

        self.watch_tree.tag_configure("changed", background="#fff3bf")
        self.watch_tree.tag_configure("finished", foreground="#c0392b")
        self.watch_tree.tag_configure("stale", foreground="#8a8a8a")
        self.watch_tree.tag_configure("applied", background="#c8f0cc")

        self.watch_tree.bind("<<TreeviewSelect>>", self.on_panel_select)
        self.watch_tree.bind("<Double-1>", self.open_panel_job)
        # te same skroty co w glownej tabeli - spacja zdejmuje z wyroznionych
        self.watch_tree.bind("<space>", self.unwatch_panel_job)
        self.watch_tree.bind("<Control-d>", self.unwatch_panel_job)
        self.watch_tree.bind("<Delete>", self.reject_panel_job)
        self.watch_tree.bind("<Alt-o>", self.toggle_applied_panel)
        self.watch_tree.bind("<Alt-O>", self.toggle_applied_panel)

        buttons = ttk.Frame(self.watch_panel)
        buttons.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(6, 0))
        ttk.Button(buttons, text="Otworz", width=9,
                   command=self.open_panel_job).grid(row=0, column=0)
        ttk.Button(buttons, text="Usun (spacja)", width=13,
                   command=self.unwatch_panel_job).grid(row=0, column=1, padx=(4, 0))
        ttk.Button(buttons, text="Odpowiedziano (Alt+O)", width=19,
                   command=self.toggle_applied_panel).grid(row=0, column=2, padx=(4, 0))
        ttk.Button(buttons, text="Ukryj", width=7,
                   command=lambda: self.show_watch_panel.set(False)).grid(
            row=0, column=3, padx=(4, 0))

        self.show_watch_panel.trace_add("write", self._toggle_watch_panel)

    def _toggle_watch_panel(self, *_args):
        """Pokazuje/chowa prawy panel; wyroznione wracaja wtedy do glownej tabeli."""
        # panes() zwraca sciezki widgetow, stad porownanie przez str()
        visible = str(self.watch_panel) in self.split.panes()
        if self.show_watch_panel.get():
            if not visible:
                self.split.add(self.watch_panel, weight=1)  # wraca na prawa strone
                self.after_idle(self.center_sash)           # znowu po polowie
            self.refresh_watch_panel()
        elif visible:
            self.split.forget(self.watch_panel)
        # tabela sie nie zmienia - wyroznionych i tak w niej nie ma - ale pasek
        # stanu ma powiedziec, czy sa teraz widoczne, czy schowane razem z panelem
        self.refresh_status()

    def center_sash(self):
        """Suwak na srodku - oba kontenery maja byc rowne."""
        if len(self.split.panes()) < 2:
            return
        # najpierw niech Tk ulozy panele, dopiero potem ustawiamy suwak
        self.split.update_idletasks()
        width = self.split.winfo_width()
        if width > 200:
            self.split.sashpos(0, width // 2)
            self._sash_centered = True

    def _on_split_configure(self, _event=None):
        # pierwsze ulozenie okna: dopiero teraz znamy prawdziwa szerokosc
        if not self._sash_centered:
            self.center_sash()

    def _build_toolbar(self):
        bar = ttk.LabelFrame(self, text="Pobieranie", padding=6)
        bar.grid(row=0, column=0, sticky="ew")

        self.cat_vars = {}
        for i, name in enumerate(CATEGORIES):
            var = tk.BooleanVar(value=True)
            self.cat_vars[name] = var
            ttk.Checkbutton(bar, text=name, variable=var).grid(
                row=0, column=i, padx=(0, 12))

        ttk.Label(bar, text="Stron na kategorie:").grid(row=0, column=2, padx=(12, 4))
        self.pages_var = tk.IntVar(value=2)
        ttk.Spinbox(bar, from_=1, to=25, width=4,
                    textvariable=self.pages_var).grid(row=0, column=3)

        self.fetch_btn = ttk.Button(bar, text="Pobierz oferty", command=self.start_fetch)
        self.fetch_btn.grid(row=0, column=4, padx=(16, 4))

        self.stop_btn = ttk.Button(bar, text="Stop", command=self.stop_fetch,
                                   state="disabled")
        self.stop_btn.grid(row=0, column=5)

        ttk.Button(bar, text="Eksport CSV", command=self.export_csv).grid(
            row=0, column=6, padx=(16, 0))

        ttk.Checkbutton(bar, text="Panel wyroznionych",
                        variable=self.show_watch_panel).grid(
            row=0, column=7, padx=(16, 0))

    def _build_filters(self):
        box = ttk.LabelFrame(self, text="Filtry", padding=6)
        box.grid(row=1, column=0, sticky="ew", pady=(8, 8))
        box.columnconfigure(1, weight=1)

        self.search_var = tk.StringVar()
        ttk.Label(box, text="Szukaj (tytul/opis):").grid(row=0, column=0, sticky="w")
        entry = ttk.Entry(box, textvariable=self.search_var)
        entry.grid(row=0, column=1, sticky="ew", padx=(4, 12))
        entry.bind("<KeyRelease>", lambda _e: self.apply_filters())

        self.price_mode = tk.StringVar(value="Wszystkie")
        ttk.Label(box, text="Cena:").grid(row=0, column=2, sticky="e")
        combo = ttk.Combobox(
            box, textvariable=self.price_mode, width=16, state="readonly",
            values=("Wszystkie", "Tylko z kwota", "Tylko do negocjacji"))
        combo.grid(row=0, column=3, padx=(4, 12))
        combo.bind("<<ComboboxSelected>>", lambda _e: self.apply_filters())

        self.max_offers_var = tk.StringVar()
        ttk.Label(box, text="Max ofert:").grid(row=0, column=4, sticky="e")
        self._num_entry(box, self.max_offers_var, 6).grid(row=0, column=5, padx=(4, 0))

        self.min_price_var = tk.StringVar()
        self.max_price_var = tk.StringVar()
        ttk.Label(box, text="Cena od:").grid(row=1, column=0, sticky="w", pady=(6, 0))
        holder = ttk.Frame(box)
        holder.grid(row=1, column=1, sticky="w", padx=(4, 12), pady=(6, 0))
        self._num_entry(holder, self.min_price_var, 9).grid(row=0, column=0)
        ttk.Label(holder, text="do").grid(row=0, column=1, padx=6)
        self._num_entry(holder, self.max_price_var, 9).grid(row=0, column=2)

        self.min_days_var = tk.StringVar()
        self.max_days_var = tk.StringVar()
        ttk.Label(box, text="Dni do konca:").grid(row=1, column=2, sticky="e",
                                                  pady=(6, 0))
        days_holder = ttk.Frame(box)
        days_holder.grid(row=1, column=3, sticky="w", padx=(4, 12), pady=(6, 0))
        ttk.Label(days_holder, text="od").grid(row=0, column=0, padx=(0, 4))
        self._num_entry(days_holder, self.min_days_var, 6).grid(row=0, column=1)
        ttk.Label(days_holder, text="do").grid(row=0, column=2, padx=4)
        self._num_entry(days_holder, self.max_days_var, 6).grid(row=0, column=3)

        self.exclude_var = tk.StringVar()
        ttk.Label(box, text="Wyklucz slowa (po przecinku):").grid(
            row=2, column=0, sticky="w", pady=(6, 0))
        exclude_entry = ttk.Entry(box, textvariable=self.exclude_var)
        exclude_entry.grid(row=2, column=1, sticky="ew", padx=(4, 12), pady=(6, 0))
        exclude_entry.bind("<KeyRelease>", lambda _e: self.apply_filters())

        self.no_wordpress = tk.BooleanVar(value=False)
        ttk.Checkbutton(box, text="Bez WordPressa", variable=self.no_wordpress,
                        command=self.apply_filters).grid(
            row=2, column=2, columnspan=2, sticky="w", pady=(6, 0))

        self.hide_finished = tk.BooleanVar(value=True)
        ttk.Checkbutton(box, text="Ukryj zakonczone", variable=self.hide_finished,
                        command=self.apply_filters).grid(
            row=1, column=4, columnspan=2, sticky="w", pady=(6, 0))

        # filtra "Tylko wyroznione" tu nie ma - wyroznione i tak nigdy nie sa
        # w tej tabeli, ich widok to prawy panel

        self.hide_rejected = tk.BooleanVar(value=True)
        ttk.Checkbutton(box, text="Ukryj odrzucone (X)", variable=self.hide_rejected,
                        command=self.apply_filters).grid(
            row=3, column=4, sticky="w", pady=(6, 0))

        self.clear_rejected_btn = ttk.Button(
            box, text="Wyczysc odrzucone", command=self.clear_rejected)
        self.clear_rejected_btn.grid(row=3, column=5, sticky="w", pady=(6, 0))

        ttk.Button(box, text="Wyczysc filtry", command=self.reset_filters).grid(
            row=2, column=5, sticky="w", pady=(6, 0))

    def _num_entry(self, parent, var, width):
        entry = ttk.Entry(parent, textvariable=var, width=width)
        entry.bind("<KeyRelease>", lambda _e: self.apply_filters())
        return entry

    def _build_table(self):
        # podwojny widok: po lewej glowna tabela, po prawej wyroznione
        self.split = ttk.PanedWindow(self, orient="horizontal")
        self.split.grid(row=2, column=0, sticky="nsew")

        wrap = ttk.LabelFrame(self.split, text="Wszystkie ogloszenia", padding=6)
        wrap.rowconfigure(0, weight=1)
        wrap.columnconfigure(0, weight=1)
        self.split.add(wrap, weight=1)

        self._build_watch_panel(self.split)
        self.split.add(self.watch_panel, weight=1)

        # rowne polowki - suwak na srodku, gdy tylko znamy szerokosc okna
        self._sash_centered = False
        self.split.bind("<Configure>", self._on_split_configure)

        self.tree = ttk.Treeview(
            wrap, columns=[c[0] for c in COLUMNS], show="headings", selectmode="browse")
        for key, label, width, anchor in COLUMNS:
            self.tree.heading(key, text=label,
                              command=lambda k=key: self.sort_by(k))
            self.tree.column(key, width=width, anchor=anchor, stretch=(key == "title"))
        self.tree.grid(row=0, column=0, sticky="nsew")

        yscroll = ttk.Scrollbar(wrap, orient="vertical", command=self.tree.yview)
        yscroll.grid(row=0, column=1, sticky="ns")
        self.tree.configure(yscrollcommand=yscroll.set)

        # polowa okna to za malo na wszystkie kolumny - stad suwak poziomy
        xscroll = ttk.Scrollbar(wrap, orient="horizontal", command=self.tree.xview)
        xscroll.grid(row=1, column=0, sticky="ew")
        self.tree.configure(xscrollcommand=xscroll.set)

        self.tree.tag_configure("hot", foreground="#1a7f37")   # malo ofert
        self.tree.tag_configure("crowded", foreground="#8a8a8a")  # duzo ofert
        self.tree.tag_configure("finished", foreground="#c0392b")  # zakonczone
        self.tree.tag_configure("changed", background="#fff3bf")   # cos sie zmienilo
        self.tree.tag_configure("stale", foreground="#8a8a8a")     # brak w wynikach
        self.tree.tag_configure("rejected", foreground="#b0b0b0")  # odrzucone
        self.tree.tag_configure("applied", background="#c8f0cc")   # odpowiedziano

        self.tree.bind("<<TreeviewSelect>>", self.show_details)
        self.tree.bind("<Button-1>", self.on_click)
        self.tree.bind("<Double-1>", self.open_selected)
        self.tree.bind("<space>", self.toggle_watch)
        self.tree.bind("<Control-d>", self.toggle_watch)
        self.tree.bind("<Delete>", self.toggle_reject)
        self.tree.bind("<Alt-o>", self.toggle_applied)
        self.tree.bind("<Alt-O>", self.toggle_applied)

    def _build_details(self):
        box = ttk.LabelFrame(self,
                             text="Szczegoly (dwuklik w tabeli otwiera w przegladarce)",
                             padding=6)
        box.grid(row=3, column=0, sticky="ew", pady=(8, 0))
        box.columnconfigure(0, weight=1)

        self.details = tk.Text(box, height=7, wrap="word")
        self.details.grid(row=0, column=0, sticky="ew")
        self.details.configure(state="disabled")

        scroll = ttk.Scrollbar(box, orient="vertical", command=self.details.yview)
        scroll.grid(row=0, column=1, sticky="ns")
        self.details.configure(yscrollcommand=scroll.set)

        buttons = ttk.Frame(box)
        buttons.grid(row=1, column=0, sticky="w", pady=(6, 0))
        # przyciski dzialaja na tym, co widac wyzej - a to moze byc wiersz
        # z tabeli albo pozycja z prawego panelu wyroznionych
        ttk.Button(buttons, text="Otworz ogloszenie",
                   command=self.open_active).grid(row=0, column=0)
        self.watch_btn = ttk.Button(buttons, text="Wyroznij / cofnij (spacja)",
                                    command=self.toggle_active_watch)
        self.watch_btn.grid(row=0, column=1, padx=(8, 0))
        self.reject_btn = ttk.Button(buttons, text="Odrzuc / przywroc (Delete)",
                                     command=self.toggle_active_reject)
        self.reject_btn.grid(row=0, column=2, padx=(8, 0))
        self.applied_btn = ttk.Button(buttons, text="Odpowiedziano (Alt+O)",
                                      command=self.toggle_active_applied)
        self.applied_btn.grid(row=0, column=3, padx=(8, 0))

    def _build_status(self):
        self.status = tk.StringVar(value="Gotowe. Kliknij 'Pobierz oferty'.")
        ttk.Label(self, textvariable=self.status, anchor="w").grid(
            row=4, column=0, sticky="ew", pady=(6, 0))

    # ------------------------------------------------------ pobieranie

    def start_fetch(self):
        if self.worker and self.worker.is_alive():
            return

        chosen = [name for name, var in self.cat_vars.items() if var.get()]
        if not chosen:
            messagebox.showinfo("Useme", "Zaznacz przynajmniej jedna kategorie.")
            return

        pages = max(1, int(self.pages_var.get() or 1))
        self.stop_flag.clear()
        self.fetch_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")

        # migawki kopiujemy przed startem watku - GUI moze je w tym czasie zmienic
        snapshots = {url: dict(entry) for url, entry in self.watch.data.items()}

        def job():
            result = fetch_jobs(chosen, pages, progress=self.set_status_async,
                                stop_flag=self.stop_flag)
            # wyroznione musza miec swieze dane nawet wtedy, gdy wypadly poza
            # pobrane strony kategorii - te dociagamy z ich wlasnych stron
            seen = {item.url for item in result}
            missing = [url for url in snapshots if url not in seen]
            if missing and not self.stop_flag.is_set():
                result.extend(fetch_watched_jobs(
                    missing, snapshots, progress=self.set_status_async,
                    stop_flag=self.stop_flag))
            self.after(0, self.on_fetched, result)

        self.worker = threading.Thread(target=job, daemon=True)
        self.worker.start()

    def stop_fetch(self):
        self.stop_flag.set()
        self.set_status("Przerywam...")

    def on_fetched(self, jobs):
        self.fetch_btn.configure(state="normal")
        self.stop_btn.configure(state="disabled")
        self.all_jobs = jobs
        report = self.check_watchlist(jobs)
        self.apply_filters()  # status ustawia refresh_table (z liczba ukrytych)
        if report:
            self.show_report(report)

    def check_watchlist(self, jobs):
        """Porownuje obserwowane z migawka; zwraca liste linii raportu."""
        self.watch_note = ""
        if not len(self.watch):
            return []

        fresh = {job.url: job for job in jobs}
        changed, missing = [], []

        for url in list(self.watch.data):
            job = fresh.get(url)
            if job is None:
                snapshot = job_from_snapshot(self.watch.data[url])
                jobs.append(snapshot)          # zeby panel mial co pokazac
                missing.append(snapshot)
                continue
            job.changes = self.watch.diff(job)
            if job.changes:
                changed.append(job)
            self.watch.update(job)

        error = self.watch.save()

        lines = []
        if changed:
            lines.append(f"ZMIANY W WYROZNIONYCH ({len(changed)}):")
            for job in changed:
                lines.append("")
                lines.append(f"* {job.title}")
                for change in job.changes:
                    lines.append(f"    - {change}")
                lines.append(f"    {job.url}")
        if missing:
            if lines:
                lines.append("")
            lines.append(f"NIE UDALO SIE ODSWIEZYC ({len(missing)}):")
            lines.append("(nie bylo ich na pobranych stronach, a ich wlasne "
                         "strony nie odpowiedzialy - dane ponizej sa z ostatniego "
                         "zapisu)")
            for job in missing:
                lines.append(f"* {job.title}")
                lines.append(f"    {job.url}")
        if error:
            lines.append("")
            lines.append(error)

        notes = []
        if changed:
            notes.append(f"zmian: {len(changed)}")
        if missing:
            notes.append(f"nie odswiezono: {len(missing)}")
        self.watch_note = ", ".join(notes) if notes else "bez zmian"

        return lines

    def show_report(self, lines):
        window = tk.Toplevel(self)
        window.title("Useme - co sie zmienilo")
        window.geometry("760x420")
        window.transient(self.winfo_toplevel())

        frame = ttk.Frame(window, padding=8)
        frame.pack(fill="both", expand=True)

        text = tk.Text(frame, wrap="word")
        text.pack(side="left", fill="both", expand=True)
        scroll = ttk.Scrollbar(frame, orient="vertical", command=text.yview)
        scroll.pack(side="left", fill="y")
        text.configure(yscrollcommand=scroll.set)
        text.insert("end", "\n".join(lines))
        text.configure(state="disabled")

        ttk.Button(window, text="OK", command=window.destroy).pack(pady=(0, 8))
        window.lift()

    def set_status(self, text):
        self.status.set(text)

    def set_status_async(self, text):
        self.after(0, self.set_status, text)

    # ------------------------------------------------------ filtry

    @staticmethod
    def _to_float(text):
        text = (text or "").strip().replace(",", ".")
        try:
            return float(text)
        except ValueError:
            return None

    def reset_filters(self):
        for var in (self.search_var, self.max_offers_var, self.min_price_var,
                    self.max_price_var, self.min_days_var, self.max_days_var,
                    self.exclude_var):
            var.set("")
        self.price_mode.set("Wszystkie")
        self.hide_finished.set(True)
        self.no_wordpress.set(False)
        self.apply_filters()

    def apply_filters(self):
        needle = self.search_var.get().strip().lower()
        hide_finished = self.hide_finished.get()

        banned = [word.strip().lower()
                  for word in re.split(r"[,;\n]", self.exclude_var.get())
                  if word.strip()]
        if self.no_wordpress.get():
            banned.extend(WORDPRESS_WORDS)
        mode = self.price_mode.get()
        max_offers = self._to_float(self.max_offers_var.get())
        min_price = self._to_float(self.min_price_var.get())
        max_price = self._to_float(self.max_price_var.get())
        min_days = self._to_float(self.min_days_var.get())
        max_days = self._to_float(self.max_days_var.get())

        hide_rejected = self.hide_rejected.get()

        result = []
        for job in self.all_jobs:
            if hide_rejected and job.url in self.rejected:
                continue

            # wyroznione nigdy nie siedza w glownej tabeli - maja swoj panel,
            # a schowanie panelu ich nie przywraca, tylko chowa razem z nim
            if job.url in self.watch:
                continue

            haystack = " ".join(
                (job.title, job.description or "", job.subcategory or "")).lower()

            if hide_finished and job.finished:
                continue
            if needle and needle not in haystack:
                continue
            if banned and any(word in haystack for word in banned):
                continue
            if mode == "Tylko z kwota" and job.price is None:
                continue
            if mode == "Tylko do negocjacji" and not job.negotiable:
                continue
            if max_offers is not None and job.offers > max_offers:
                continue
            if min_price is not None and (job.price is None or job.price < min_price):
                continue
            if max_price is not None and (job.price is None or job.price > max_price):
                continue
            if min_days is not None and (job.days_left is None
                                         or job.days_left < min_days):
                continue
            if max_days is not None and (job.days_left is None
                                         or job.days_left > max_days):
                continue
            result.append(job)

        self.shown_jobs = result
        self.refresh_table()

    def refresh_table(self, select_url=None):
        self.tree.delete(*self.tree.get_children())
        for index, job in enumerate(self.shown_jobs):
            is_rejected = job.url in self.rejected
            if is_rejected:
                tag = "rejected"
            elif job.changes:
                tag = "changed"
            elif job.stale:
                tag = "stale"
            elif job.finished:
                tag = "finished"
            elif job.offers <= 3:
                tag = "hot"
            elif job.offers >= 15:
                tag = "crowded"
            else:
                tag = ""

            # "applied" idzie na koncu krotki, zeby jego zielone tlo wygralo
            # z ewentualnym zoltym tlem "changed", gdy oba pasuja naraz
            tags = tuple(t for t in (tag, "applied" if job.url in self.applied
                                     else None) if t)

            # kolumna "Obs." jest tu tylko przyciskiem: klik wyroznia i wiersz
            # znika do panelu, wiec zadne ogloszenie w tabeli nie ma gwiazdki
            self.tree.insert("", "end", iid=str(index),
                             values=("+", "+" if is_rejected else "x")
                                    + job.as_row()[:8],
                             tags=tags)

        if select_url:
            for index, job in enumerate(self.shown_jobs):
                if job.url == select_url:
                    self.tree.selection_set(str(index))
                    self.tree.see(str(index))
                    break

        self.refresh_status()
        self.refresh_watch_panel()

    def refresh_status(self):
        finished_total = sum(1 for job in self.all_jobs if job.finished)
        extra = (f" (ukryto {finished_total} zakonczonych)"
                 if self.hide_finished.get() and finished_total else "")
        watched_note = ""
        if len(self.watch):
            where = ("w prawym panelu" if self.show_watch_panel.get()
                     else "panel schowany")
            watched_note = f" | wyroznione: {len(self.watch)} ({where}"
            watched_note += f", {self.watch_note})" if self.watch_note else ")"
        if len(self.rejected):
            watched_note += f" | odrzucone: {len(self.rejected)}"
        self.set_status(
            f"Wyswietlono {len(self.shown_jobs)} z {len(self.all_jobs)} "
            f"ogloszen{extra}{watched_note}.")

    # ------------------------------------------------------ panel wyroznionych

    def watched_jobs(self):
        """Wyroznione ogloszenia - swieze z pobrania, reszta z migawki."""
        by_url = {job.url: job for job in self.all_jobs if job.url in self.watch}
        jobs = []
        for url, entry in self.watch.data.items():
            job = by_url.get(url)
            jobs.append(job if job is not None else job_from_snapshot(entry))
        # najpierw te ze zmianami, potem reszta w kolejnosci dodania
        jobs.sort(key=lambda job: not job.changes)
        return jobs

    def refresh_watch_panel(self):
        if not self.show_watch_panel.get():
            return

        self.panel_jobs = self.watched_jobs()
        self.watch_tree.delete(*self.watch_tree.get_children())
        for index, job in enumerate(self.panel_jobs):
            if job.changes:
                tag = "changed"
            elif job.stale:
                tag = "stale"
            elif job.finished:
                tag = "finished"
            else:
                tag = ""
            tags = tuple(t for t in (tag, "applied" if job.url in self.applied
                                     else None) if t)
            title = job.title or job.url
            if job.changes:
                title = "! " + title
            self.watch_tree.insert(
                "", "end", iid=str(index),
                values=(title, job.offers if job.offers is not None else "-",
                        panel_deadline(job)),
                tags=tags)

        self.watch_panel.configure(text=f"Wyroznione ({len(self.panel_jobs)})")

    def panel_job(self):
        selection = self.watch_tree.selection()
        if not selection:
            return None
        index = int(selection[0])
        return self.panel_jobs[index] if index < len(self.panel_jobs) else None

    def on_panel_select(self, _event=None):
        """Klik w panelu pokazuje szczegoly na dole - wiersza w tabeli juz nie ma."""
        job = self.panel_job()
        if job:
            self.render_details(job)

    def open_panel_job(self, _event=None):
        job = self.panel_job()
        if job and job.url:
            webbrowser.open(job.url)
        return "break"

    def unwatch_panel_job(self, _event=None):
        """Spacja / Ctrl+D / przycisk - zdejmuje wyroznienie i wraca do tabeli."""
        job = self.panel_job()
        if job:
            self.toggle_watch(job=job)
        return "break"

    def reject_panel_job(self, _event=None):
        job = self.panel_job()
        if job:
            self.toggle_reject(job=job)
        return "break"

    def sort_by(self, key):
        reverse = not self.sort_state.get(key, False)
        self.sort_state = {key: reverse}

        def sort_key(job):
            if key == "watch":
                return int(job.url in self.watch)
            if key == "offers":
                return job.offers
            if key == "price":
                return job.price if job.price is not None else -1.0
            if key == "deadline":
                return job.days_left if job.days_left is not None else -1.0
            if key == "negotiable":
                return int(bool(job.negotiable))
            return (getattr(job, key, "") or "").lower()

        self.shown_jobs.sort(key=sort_key, reverse=reverse)
        self.refresh_table()

    # ------------------------------------------------------ szczegoly

    def selected_job(self):
        selection = self.tree.selection()
        if not selection:
            return None
        index = int(selection[0])
        if 0 <= index < len(self.shown_jobs):
            return self.shown_jobs[index]
        return None

    def job_at(self, event):
        """Ogloszenie w klikniętym wierszu (selekcja moze byc jeszcze stara)."""
        row = self.tree.identify_row(event.y)
        if not row:
            return None
        index = int(row)
        return self.shown_jobs[index] if index < len(self.shown_jobs) else None

    def on_click(self, event):
        """Klik w kolumne 'Obs.' obserwuje, klik w 'X' odrzuca ogloszenie."""
        if self.tree.identify_region(event.x, event.y) != "cell":
            return None
        job = self.job_at(event)
        if not job:
            return None

        column = self.tree.identify_column(event.x)
        if column == "#1":
            return self.toggle_watch(job=job)
        if column == "#2":
            return self.toggle_reject(job=job)
        return None

    def toggle_watch(self, _event=None, job=None):
        job = job or self.selected_job() or self.active_job
        if not job:
            return "break"

        if job.url in self.watch:
            self.watch.remove(job.url)
            job.changes = []
        else:
            self.watch.add(job)
            self.rejected.remove(job.url)  # obserwowane i odrzucone sie wykluczaja
            self.rejected.save()

        error = self.watch.save()
        self.after_change(job.url)
        if error:
            messagebox.showwarning("Useme", error)
        return "break"

    def toggle_reject(self, _event=None, job=None):
        job = job or self.selected_job() or self.active_job
        if not job:
            return "break"

        if job.url in self.rejected:
            self.rejected.remove(job.url)
            keep = job.url
        else:
            self.rejected.add(job)
            self.watch.remove(job.url)     # odrzucone przestaje byc obserwowane
            self.watch.save()
            # przy wlaczonym filtrze wiersz zniknie, wiec nie ma czego zaznaczac
            keep = None if self.hide_rejected.get() else job.url

        error = self.rejected.save()
        self.after_change(keep)
        if error:
            messagebox.showwarning("Useme", error)
        return "break"

    def toggle_applied(self, _event=None, job=None):
        """Alt+O - oznacza/odznacza 'odpowiedziano' na zielono.

        Niezalezne od wyroznionych i odrzuconych - nie rusza tamtych list.
        """
        job = job or self.selected_job() or self.active_job
        if not job:
            return "break"

        if job.url in self.applied:
            self.applied.remove(job.url)
        else:
            self.applied.add(job)

        error = self.applied.save()
        self.after_change(job.url)
        if error:
            messagebox.showwarning("Useme", error)
        return "break"

    def toggle_applied_panel(self, _event=None):
        job = self.panel_job()
        if job:
            self.toggle_applied(job=job)
        return "break"

    def after_change(self, select_url=None):
        job = self.active_job
        self.apply_filters()
        self.refresh_table(select_url=select_url)
        # wiersz mogl przeniesc sie do panelu wyroznionych - szczegoly maja zostac
        self.render_details(job if job is not None else self.selected_job())

    def clear_rejected(self):
        if not len(self.rejected):
            messagebox.showinfo("Useme", "Lista odrzuconych jest pusta.")
            return
        if not messagebox.askyesno(
                "Useme", f"Wyczyscic liste odrzuconych ({len(self.rejected)})?"):
            return
        self.rejected.clear()
        error = self.rejected.save()
        self.after_change()
        if error:
            messagebox.showwarning("Useme", error)

    def show_details(self, _event=None):
        self.render_details(self.selected_job())

    def render_details(self, job):
        """Wypelnia panel szczegolow - zrodlem jest tabela albo panel wyroznionych."""
        self.active_job = job
        self.details.configure(state="normal")
        self.details.delete("1.0", "end")
        if job:
            if job.url in self.watch:
                self.details.insert("end", "[WYROZNIONE] ")
            if job.url in self.rejected:
                self.details.insert("end", "[ODRZUCONE] ")
            if job.url in self.applied:
                self.details.insert("end", "[ODPOWIEDZIANO] ")
            self.details.insert("end", f"{job.title}\n\n")
            if job.changes:
                self.details.insert("end", "Zmiany od ostatniego sprawdzenia:\n")
                for change in job.changes:
                    self.details.insert("end", f"  - {change}\n")
                self.details.insert("end", "\n")
            if job.stale:
                self.details.insert(
                    "end", "Nie udalo sie odswiezyc tego ogloszenia (nie ma go "
                           "na pobranych stronach, jego wlasna strona tez nie "
                           "odpowiedziala) - dane ponizej sa z ostatniego "
                           "zapisu.\n\n")
            self.details.insert("end", f"Zleceniodawca: {job.client}\n")
            self.details.insert("end", f"Kategoria: {job.category} / {job.subcategory}\n")
            self.details.insert(
                "end",
                f"Ofert: {job.offers}   |   Cena: {job.price_raw}   |   "
                f"Do negocjacji: {'tak' if job.negotiable else 'nie'}   |   "
                f"{job.deadline_raw}"
                f"{'   |   ZAKONCZONE' if job.finished else ''}\n")
            self.details.insert("end", f"{job.url}\n\n")
            self.details.insert("end", job.description or "")
        self.details.configure(state="disabled")

    def open_selected(self, event=None):
        # dwuklik w kolumny akcji ma tylko przelaczac, nie otwierac przegladarki
        if event is not None and self.tree.identify_column(event.x) in ("#1", "#2"):
            return "break"
        job = self.selected_job()
        if job and job.url:
            webbrowser.open(job.url)
        return None

    def open_active(self):
        if self.active_job and self.active_job.url:
            webbrowser.open(self.active_job.url)

    def toggle_active_watch(self):
        if self.active_job:
            self.toggle_watch(job=self.active_job)

    def toggle_active_reject(self):
        if self.active_job:
            self.toggle_reject(job=self.active_job)

    def toggle_active_applied(self):
        if self.active_job:
            self.toggle_applied(job=self.active_job)

    # ------------------------------------------------------ eksport

    def export_csv(self):
        # wyroznionych nie ma w tabeli, wiec doklejamy je z panelu - inaczej
        # eksport gubilby akurat te ogloszenia, na ktorych zalezy najbardziej
        rows = self.watched_jobs() + self.shown_jobs
        if not rows:
            messagebox.showinfo("Useme", "Brak danych do zapisania.")
            return

        path = filedialog.asksaveasfilename(
            defaultextension=".csv", filetypes=[("CSV", "*.csv")],
            initialfile="useme_oferty.csv")
        if not path:
            return

        with open(path, "w", newline="", encoding="utf-8-sig") as handle:
            writer = csv.writer(handle, delimiter=";")
            writer.writerow(["Kategoria", "Tytul", "Ofert", "Cena", "Negocjacja",
                             "Do konca", "Zleceniodawca", "Podkategoria", "Link",
                             "Zakonczone", "Wyroznione", "Odrzucone", "Odpowiedziano",
                             "Zmiany", "Opis"])
            for job in rows:
                writer.writerow(list(job.as_row()) + [
                    "tak" if job.finished else "nie",
                    "tak" if job.url in self.watch else "nie",
                    "tak" if job.url in self.rejected else "nie",
                    "tak" if job.url in self.applied else "nie",
                    "; ".join(job.changes),
                    job.description,
                ])

        self.set_status(f"Zapisano {len(rows)} wierszy do {path}")


def main():
    root = tk.Tk()
    root.title("Useme - oferty (serwisy internetowe + programowanie i IT)")
    root.geometry("1320x780")
    root.minsize(980, 620)
    app = App(root)
    # po starcie od razu pobieramy i sprawdzamy, czy cos sie zmienilo
    root.after(200, app.start_fetch)
    root.mainloop()


if __name__ == "__main__":
    main()
