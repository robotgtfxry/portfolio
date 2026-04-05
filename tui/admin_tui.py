#!/usr/bin/env python3
"""
Portfolio Analytics — Admin TUI
Run: python admin_tui.py [--token TOKEN] [--url http://localhost:8000]

Dependencies: pip install textual httpx
"""

import argparse
import asyncio
import math
import sys
import time
from datetime import datetime
from typing import Any

import httpx
from textual import on, work
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, ScrollableContainer, Vertical
from textual.reactive import reactive
from textual.widgets import (
    DataTable, Footer, Header, Label, Static, TabbedContent, TabPane
)

# ── CLI args ──────────────────────────────────────────────────────────────────

parser = argparse.ArgumentParser(description="Portfolio Analytics TUI")
parser.add_argument("--token", default="dev-admin-token-change-me")
parser.add_argument("--url",   default="http://localhost:8000")
parser.add_argument("--refresh", type=int, default=10, help="refresh interval in seconds")
args = parser.parse_args()

BACKEND   = args.url.rstrip("/")
TOKEN     = args.token
REFRESH_S = args.refresh


# ── Helpers ───────────────────────────────────────────────────────────────────

def fmt_ms(ms: int | None) -> str:
    if not ms:
        return "—"
    s = ms // 1000
    if s < 60:
        return f"{s}s"
    m = s // 60
    if m < 60:
        return f"{m}m {s % 60}s"
    return f"{m // 60}h {m % 60}m"


def fmt_time(ts: int | None) -> str:
    if not ts:
        return "—"
    return datetime.fromtimestamp(ts / 1000).strftime("%H:%M:%S")


def fmt_datetime(ts: int | None) -> str:
    if not ts:
        return "—"
    return datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M")


def trunc(s: str | None, n: int) -> str:
    if not s:
        return "—"
    return s if len(s) <= n else s[: n - 1] + "…"


def bar(value: int, max_val: int, width: int = 10) -> str:
    if max_val == 0:
        return " " * width
    filled = math.ceil(value / max_val * width)
    return "█" * filled + "░" * (width - filled)


async def fetch_overview() -> dict:
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(
            f"{BACKEND}/admin/overview",
            headers={"x-admin-token": TOKEN},
        )
        r.raise_for_status()
        return r.json()


async def fetch_session(session_id: str) -> dict:
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(
            f"{BACKEND}/admin/session/{session_id}",
            headers={"x-admin-token": TOKEN},
        )
        r.raise_for_status()
        return r.json()


# ── Widgets ───────────────────────────────────────────────────────────────────

class StatsPanel(Static):
    """Left stats overview."""

    DEFAULT_CSS = """
    StatsPanel {
        border: round $accent;
        padding: 1 2;
        height: auto;
    }
    """

    def update_stats(self, stats: dict) -> None:
        total   = stats.get("total", 0)
        unique  = stats.get("unique", 0)
        today   = stats.get("today", 0)
        active  = stats.get("active", 0)
        self.update(
            f"[bold cyan]Łącznie:[/]    {total}\n"
            f"[bold cyan]Unikalni:[/]   {unique}\n"
            f"[bold cyan]Dzisiaj:[/]    {today}\n"
            f"[bold green]● Aktywni:[/]  {active}"
        )


class SectionChart(Static):
    """ASCII bar chart for section views."""

    DEFAULT_CSS = """
    SectionChart {
        border: round $accent;
        padding: 1 2;
        height: auto;
    }
    """

    def update_sections(self, sections: list[dict]) -> None:
        if not sections:
            self.update("[dim]brak danych[/]")
            return
        max_views = max((s["views"] for s in sections), default=1)
        lines = []
        for s in sections[:8]:
            b = bar(s["views"], max_views, 12)
            name = trunc(s["section"], 10).ljust(10)
            lines.append(f"[cyan]{name}[/] [green]{b}[/] {s['views']}")
        self.update("\n".join(lines))


class CountryChart(Static):
    DEFAULT_CSS = """
    CountryChart {
        border: round $accent;
        padding: 1 2;
        height: auto;
    }
    """

    def update_countries(self, countries: list[dict]) -> None:
        if not countries:
            self.update("[dim]brak danych (localhost?)[/]")
            return
        max_c = max((c["c"] for c in countries), default=1)
        lines = []
        for c in countries[:8]:
            b = bar(c["c"], max_c, 10)
            name = trunc(c["country"], 14).ljust(14)
            lines.append(f"[yellow]{name}[/] [magenta]{b}[/] {c['c']}")
        self.update("\n".join(lines))


class BrowserPanel(Static):
    DEFAULT_CSS = """
    BrowserPanel {
        border: round $accent;
        padding: 1 2;
        height: auto;
    }
    """

    def update_data(self, browsers: list[dict], os_list: list[dict], devices: list[dict]) -> None:
        b_lines = "\n".join(
            f"  [magenta]{trunc(b['browser'], 14).ljust(14)}[/] {b['c']}"
            for b in browsers[:5]
        ) or "  [dim]—[/]"
        o_lines = "\n".join(
            f"  [blue]{trunc(o['os'], 14).ljust(14)}[/] {o['c']}"
            for o in os_list[:5]
        ) or "  [dim]—[/]"
        d_lines = "\n".join(
            f"  [green]{trunc(d['device_type'], 10).ljust(10)}[/] {d['c']}"
            for d in devices
        ) or "  [dim]—[/]"
        self.update(
            f"[bold]Przeglądarki:[/]\n{b_lines}\n\n"
            f"[bold]Systemy:[/]\n{o_lines}\n\n"
            f"[bold]Urządzenia:[/]\n{d_lines}"
        )


class DetailPanel(ScrollableContainer):
    DEFAULT_CSS = """
    DetailPanel {
        border: round $warning;
        padding: 1 2;
        height: 100%;
    }
    """

    _label: reactive[str] = reactive("Wybierz wiersz…")

    def compose(self) -> ComposeResult:
        yield Static(self._label, id="detail-content")

    def show_session(self, session: dict, sections: list[dict],
                     contacts: list[dict] | None = None) -> None:
        lines = [
            f"[bold yellow]ID:[/]        {session.get('session_id','—')[:16]}…",
            f"[bold yellow]IP:[/]        {session.get('ip','—')}",
            f"[bold yellow]Kraj:[/]      {session.get('country','—')}",
            f"[bold yellow]Miasto:[/]    {session.get('city','—')}",
            f"[bold yellow]ISP:[/]       {trunc(session.get('isp'), 22)}",
            f"[bold yellow]Browser:[/]   {session.get('browser','—')} {session.get('browser_version','')}",
            f"[bold yellow]OS:[/]        {session.get('os','—')}",
            f"[bold yellow]Urządzenie:[/]{session.get('device_type','—')}",
            f"[bold yellow]Język:[/]     {session.get('language','—')}",
            f"[bold yellow]Strefa:[/]    {session.get('timezone','—')}",
            f"[bold yellow]Ekran:[/]     {session.get('screen_width','?')}×{session.get('screen_height','?')}",
            f"[bold yellow]Czas:[/]      {fmt_ms(session.get('total_time'))}",
            f"[bold yellow]Scroll:[/]    {session.get('max_scroll',0)}%",
            f"[bold yellow]Kliknięcia:[/]{session.get('page_clicks',0)}",
            f"[bold yellow]Referer:[/]   {trunc(session.get('referer'), 22)}",
            f"[bold yellow]Pierwsza:[/]  {fmt_datetime(session.get('created_at'))}",
            f"[bold yellow]Ostatnia:[/]  {fmt_datetime(session.get('last_seen'))}",
            f"[bold yellow]Aktywny:[/]   {'[green]tak[/]' if session.get('is_active') else '[dim]nie[/]'}",
        ]
        if sections:
            lines.append("\n[bold]Sekcje:[/]")
            for s in sections:
                lines.append(f"  [cyan]{s['section'].ljust(12)}[/] {fmt_ms(s.get('time_spent'))}")
        if contacts:
            lines.append("\n[bold cyan]✉ Wiadomości kontaktowe:[/]")
            for c in contacts:
                sent = "[green]✓[/]" if c.get("email_sent") else "[red]✗[/]"
                lines.append(f"  {sent} [yellow]{fmt_datetime(c.get('sent_at'))}[/]")
                lines.append(f"     [bold]{c.get('name','—')}[/]  [cyan]{c.get('email','—')}[/]")
                lines.append(f"     {trunc(c.get('message'), 50)}")
        self.query_one("#detail-content", Static).update("\n".join(lines))


# ── Main App ──────────────────────────────────────────────────────────────────

class AnalyticsApp(App):
    """Portfolio Analytics Terminal UI"""

    TITLE = "Portfolio Analytics"
    SUB_TITLE = f"{BACKEND}  •  refresh {REFRESH_S}s"

    CSS = """
    Screen {
        background: #0a0a0a;
    }
    Header {
        background: #111;
        color: cyan;
    }
    Footer {
        background: #111;
    }
    .panel-row {
        height: auto;
        margin-bottom: 1;
    }
    .left-col {
        width: 2fr;
    }
    .right-col {
        width: 1fr;
    }
    DataTable {
        border: round $accent;
        height: 18;
    }
    DataTable > .datatable--header {
        color: cyan;
        text-style: bold;
    }
    DataTable > .datatable--cursor {
        background: #1a1a2e;
        color: white;
    }
    #status {
        dock: bottom;
        height: 1;
        background: #111;
        color: #555;
        padding: 0 2;
    }
    TabbedContent {
        height: 100%;
    }
    TabPane {
        padding: 1;
    }
    """

    BINDINGS = [
        Binding("q", "quit", "Wyjście"),
        Binding("r", "refresh", "Odśwież"),
        Binding("escape", "clear_detail", "Wyczyść"),
    ]

    _data: reactive[dict | None] = reactive(None)
    _status: reactive[str] = reactive("Łączenie…")

    def compose(self) -> ComposeResult:
        yield Header()
        with TabbedContent():
            # ── Tab 1: Live ───────────────────────────────────────────────
            with TabPane("Na żywo", id="tab-live"):
                with Horizontal(classes="panel-row"):
                    with Vertical(classes="left-col"):
                        yield DataTable(id="active-table")
                    with Vertical(classes="right-col"):
                        yield StatsPanel("Ładowanie…", id="stats-panel")
                        yield CountryChart("Ładowanie…", id="country-chart")

            # ── Tab 2: Historia ───────────────────────────────────────────
            with TabPane("Historia", id="tab-history"):
                with Horizontal():
                    with Vertical(classes="left-col"):
                        yield DataTable(id="recent-table")
                    with Vertical(classes="right-col"):
                        yield DetailPanel(id="detail-panel")

            # ── Tab 3: Kontakty ───────────────────────────────────────────
            with TabPane("✉ Kontakty", id="tab-contacts"):
                with Horizontal():
                    with Vertical(classes="left-col"):
                        yield DataTable(id="contacts-table")
                    with Vertical(classes="right-col"):
                        yield Static("[dim]Wybierz wiadomość…[/]", id="contact-detail")

            # ── Tab 4: Statystyki ─────────────────────────────────────────
            with TabPane("Statystyki", id="tab-stats"):
                with Horizontal():
                    with Vertical(classes="left-col"):
                        yield SectionChart("Ładowanie…", id="section-chart")
                    with Vertical(classes="right-col"):
                        yield BrowserPanel("Ładowanie…", id="browser-panel")

        yield Static("", id="status")
        yield Footer()

    def on_mount(self) -> None:
        active = self.query_one("#active-table", DataTable)
        active.add_columns("Dev", "Kraj/IP", "Browser", "OS", "Czas", "Klik", "✉")
        active.cursor_type = "row"

        recent = self.query_one("#recent-table", DataTable)
        recent.add_columns("Godz.", "Kraj", "Miasto", "Browser", "OS", "Czas", "Scroll", "●", "✉")
        recent.cursor_type = "row"

        contacts = self.query_one("#contacts-table", DataTable)
        contacts.add_columns("Kiedy", "Imię", "Email", "Fragment wiad.", "📧")
        contacts.cursor_type = "row"

        self.load_data()
        self.set_interval(REFRESH_S, self.load_data)

    @work(exclusive=True, thread=False)
    async def load_data(self) -> None:
        self.query_one("#status", Static).update(
            f"[yellow]⟳ Pobieranie danych…[/]  {BACKEND}"
        )
        try:
            data = await fetch_overview()
            self._data = data
            self._render(data)
            now = datetime.now().strftime("%H:%M:%S")
            self.query_one("#status", Static).update(
                f"[green]✓ Odświeżono {now}[/]  •  "
                f"aktywni: {data['stats'].get('active', 0)}  •  {BACKEND}"
            )
        except Exception as exc:
            self.query_one("#status", Static).update(f"[red]✗ Błąd: {exc}[/]")

    def _render(self, data: dict) -> None:
        stats = data.get("stats", {})

        # Stats panel
        self.query_one("#stats-panel", StatsPanel).update_stats(stats)

        # Country chart
        self.query_one("#country-chart", CountryChart).update_countries(
            stats.get("top_countries", [])
        )

        # Section chart
        self.query_one("#section-chart", SectionChart).update_sections(
            stats.get("top_sections", [])
        )

        # Browser / OS panel
        self.query_one("#browser-panel", BrowserPanel).update_data(
            stats.get("top_browsers", []),
            stats.get("top_os", []),
            stats.get("device_types", []),
        )

        # Active sessions table
        active_tbl = self.query_one("#active-table", DataTable)
        active_tbl.clear()
        for s in data.get("active", []):
            icon    = {"mobile": "📱", "tablet": "📋"}.get(s.get("device_type", ""), "🖥 ")
            mail_mk = "[cyan]✉[/]" if s.get("has_contacted") else ""
            active_tbl.add_row(
                icon,
                trunc(s.get("country") or s.get("ip"), 14),
                trunc(s.get("browser"), 12),
                trunc(s.get("os"), 12),
                fmt_ms(s.get("total_time")),
                str(s.get("page_clicks", 0)),
                mail_mk,
                key=s["session_id"],
            )
        if not data.get("active"):
            active_tbl.add_row("—", "Brak aktywnych sesji", "", "", "", "", "")

        # Recent sessions table
        recent_tbl = self.query_one("#recent-table", DataTable)
        recent_tbl.clear()
        for s in data.get("recent", []):
            dot     = "[green]●[/]" if s.get("is_active") else "[dim]○[/]"
            mail_mk = "[cyan]✉[/]" if s.get("has_contacted") else ""
            recent_tbl.add_row(
                fmt_time(s.get("created_at")),
                trunc(s.get("country"), 10),
                trunc(s.get("city"), 12),
                trunc(s.get("browser"), 12),
                trunc(s.get("os"), 10),
                fmt_ms(s.get("total_time")),
                f"{s.get('max_scroll', 0)}%",
                dot,
                mail_mk,
                key=s["session_id"],
            )

        # Contacts table
        contacts_tbl = self.query_one("#contacts-table", DataTable)
        contacts_tbl.clear()
        for c in data.get("contacts", []):
            sent = "[green]✓[/]" if c.get("email_sent") else "[red]✗[/]"
            contacts_tbl.add_row(
                fmt_datetime(c.get("sent_at")),
                trunc(c.get("name"), 16),
                trunc(c.get("email"), 22),
                trunc(c.get("message"), 30),
                sent,
                key=str(c["id"]),
            )
        if not data.get("contacts"):
            contacts_tbl.add_row("—", "Brak wiadomości", "", "", "")

    @on(DataTable.RowSelected, "#recent-table")
    async def on_recent_selected(self, event: DataTable.RowSelected) -> None:
        session_id = str(event.row_key.value)
        await self._load_detail(session_id)

    @on(DataTable.RowSelected, "#contacts-table")
    def on_contact_selected(self, event: DataTable.RowSelected) -> None:
        if not self._data:
            return
        contact_id = str(event.row_key.value)
        contact = next(
            (c for c in self._data.get("contacts", []) if str(c["id"]) == contact_id), None
        )
        if not contact:
            return

        sent = "[green]✓ Email wysłany[/]" if contact.get("email_sent") else "[red]✗ Email NIE wysłany[/]"
        lines = [
            f"[bold yellow]Data:[/]      {fmt_datetime(contact.get('sent_at'))}",
            f"[bold yellow]Imię:[/]      [bold]{contact.get('name','—')}[/]",
            f"[bold yellow]Email:[/]     [cyan]{contact.get('email','—')}[/]",
            f"[bold yellow]Email ok:[/]  {sent}",
            f"\n[bold]Wiadomość:[/]\n{contact.get('message','—')}",
        ]

        # Linked session
        session_id = contact.get("session_id")
        if session_id:
            session = next(
                (s for s in self._data.get("recent", []) if s["session_id"] == session_id), None
            )
            if session:
                lines += [
                    "\n[bold cyan]━━ Sesja nadawcy ━━[/]",
                    f"[bold yellow]Kraj:[/]     {session.get('country','—')}",
                    f"[bold yellow]Miasto:[/]   {session.get('city','—')}",
                    f"[bold yellow]Browser:[/]  {session.get('browser','—')} {session.get('browser_version','')}",
                    f"[bold yellow]OS:[/]       {session.get('os','—')}",
                    f"[bold yellow]Urządzenie:[/]{session.get('device_type','—')}",
                    f"[bold yellow]IP:[/]       {session.get('ip','—')}",
                    f"[bold yellow]Czas:[/]     {fmt_ms(session.get('total_time'))}",
                    f"[bold yellow]Scroll:[/]   {session.get('max_scroll',0)}%",
                    f"[bold yellow]Sekcje:[/]   odwiedzone podczas tej wizyty",
                ]
            else:
                lines.append(f"\n[dim]Sesja {session_id[:12]}… (poza ostatnimi 50)[/]")
        else:
            lines.append("\n[dim]Brak powiązanej sesji (wysłano bez śledzenia)[/]")

        self.query_one("#contact-detail", Static).update("\n".join(lines))

        # Również załaduj pełne szczegóły sesji jeśli jest powiązana
        if session_id:
            self._load_contact_session(session_id)

    @work(exclusive=True, thread=False)
    async def _load_detail(self, session_id: str) -> None:
        try:
            detail = await fetch_session(session_id)
            if detail.get("session"):
                self.query_one("#detail-panel", DetailPanel).show_session(
                    detail["session"],
                    detail.get("sections", []),
                    detail.get("contacts", []),
                )
        except Exception as exc:
            self.query_one("#detail-panel", DetailPanel).query_one(
                "#detail-content", Static
            ).update(f"[red]Błąd: {exc}[/]")

    @work(exclusive=True, thread=False)
    async def _load_contact_session(self, session_id: str) -> None:
        try:
            detail = await fetch_session(session_id)
            sections = detail.get("sections", [])
            if not sections:
                return
            panel = self.query_one("#contact-detail", Static)
            current = panel.renderable if hasattr(panel, "renderable") else ""
            section_lines = "\n[bold cyan]Sekcje odwiedzone:[/]"
            for s in sections:
                section_lines += f"\n  [cyan]{s['section'].ljust(12)}[/] {fmt_ms(s.get('time_spent'))}"
            panel.update(str(current) + section_lines)
        except Exception:
            pass

    def action_refresh(self) -> None:
        self.load_data()

    def action_clear_detail(self) -> None:
        self.query_one("#detail-panel", DetailPanel).query_one(
            "#detail-content", Static
        ).update("[dim]Wybierz wiersz…[/]")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app = AnalyticsApp()
    app.run()
