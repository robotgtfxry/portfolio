"""SQLite persistence layer — uses only the stdlib sqlite3 module."""

import sqlite3
import time
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).parent / "analytics.db"

# ── Connection factory ────────────────────────────────────────────────────────

def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


# ── Schema ────────────────────────────────────────────────────────────────────

def init_db() -> None:
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id       TEXT UNIQUE NOT NULL,
                fingerprint      TEXT,
                ip               TEXT,
                ip_anonymized    INTEGER DEFAULT 0,
                country          TEXT,
                city             TEXT,
                isp              TEXT,
                user_agent       TEXT,
                browser          TEXT,
                browser_version  TEXT,
                os               TEXT,
                device_type      TEXT,
                language         TEXT,
                timezone         TEXT,
                screen_width     INTEGER,
                screen_height    INTEGER,
                referer          TEXT,
                created_at       INTEGER NOT NULL,
                last_seen        INTEGER NOT NULL,
                is_active        INTEGER DEFAULT 1,
                total_time       INTEGER DEFAULT 0,
                page_clicks      INTEGER DEFAULT 0,
                max_scroll       INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS section_views (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id  TEXT NOT NULL,
                section     TEXT NOT NULL,
                viewed_at   INTEGER NOT NULL,
                time_spent  INTEGER DEFAULT 0,
                FOREIGN KEY (session_id) REFERENCES sessions(session_id)
            );

            CREATE TABLE IF NOT EXISTS events (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id  TEXT NOT NULL,
                event_type  TEXT NOT NULL,
                data        TEXT,
                occurred_at INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(session_id)
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_created     ON sessions(created_at);
            CREATE INDEX IF NOT EXISTS idx_sessions_active      ON sessions(is_active);
            CREATE INDEX IF NOT EXISTS idx_sessions_fingerprint ON sessions(fingerprint);
            CREATE INDEX IF NOT EXISTS idx_sv_session           ON section_views(session_id);
            CREATE INDEX IF NOT EXISTS idx_ev_session           ON events(session_id);
        """)


# ── Write helpers ─────────────────────────────────────────────────────────────

def upsert_session(data: dict[str, Any]) -> None:
    now = int(time.time() * 1000)
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM sessions WHERE session_id = ?", (data["session_id"],)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE sessions SET last_seen = ?, is_active = 1 WHERE session_id = ?",
                (now, data["session_id"]),
            )
        else:
            conn.execute(
                """INSERT INTO sessions (
                    session_id, fingerprint, ip, country, city, isp,
                    user_agent, browser, browser_version, os, device_type,
                    language, timezone, screen_width, screen_height, referer,
                    created_at, last_seen
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    data["session_id"],
                    data.get("fingerprint"),
                    data.get("ip"),
                    data.get("country"),
                    data.get("city"),
                    data.get("isp"),
                    data.get("user_agent"),
                    data.get("browser"),
                    data.get("browser_version"),
                    data.get("os"),
                    data.get("device_type"),
                    data.get("language"),
                    data.get("timezone"),
                    data.get("screen_width"),
                    data.get("screen_height"),
                    data.get("referer"),
                    now,
                    now,
                ),
            )


def update_activity(session_id: str, total_time: int | None, clicks: int | None,
                    max_scroll: int | None, is_active: bool = True) -> None:
    now = int(time.time() * 1000)
    with get_conn() as conn:
        conn.execute(
            """UPDATE sessions SET
                last_seen   = ?,
                total_time  = COALESCE(?, total_time),
                page_clicks = COALESCE(?, page_clicks),
                max_scroll  = MAX(COALESCE(max_scroll, 0), COALESCE(?, 0)),
                is_active   = ?
               WHERE session_id = ?""",
            (now, total_time, clicks, max_scroll, 1 if is_active else 0, session_id),
        )


def record_section(session_id: str, section: str, time_spent: int = 0) -> None:
    now = int(time.time() * 1000)
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO section_views (session_id, section, viewed_at, time_spent) VALUES (?,?,?,?)",
            (session_id, section, now, time_spent),
        )


def record_event(session_id: str, event_type: str, data: Any = None) -> None:
    import json
    now = int(time.time() * 1000)
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO events (session_id, event_type, data, occurred_at) VALUES (?,?,?,?)",
            (session_id, event_type, json.dumps(data) if data is not None else None, now),
        )


def mark_inactive(threshold_ms: int = 5 * 60 * 1000) -> None:
    cutoff = int(time.time() * 1000) - threshold_ms
    with get_conn() as conn:
        conn.execute(
            "UPDATE sessions SET is_active = 0 WHERE last_seen < ? AND is_active = 1",
            (cutoff,),
        )


# ── GDPR ─────────────────────────────────────────────────────────────────────

def anonymise_old_ips(days: int = 30) -> None:
    cutoff = int(time.time() * 1000) - days * 86_400_000
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, ip FROM sessions WHERE ip_anonymized = 0 AND created_at < ?", (cutoff,)
        ).fetchall()
        for row in rows:
            conn.execute(
                "UPDATE sessions SET ip = ?, ip_anonymized = 1 WHERE id = ?",
                (_anonymise_ip(row["ip"] or ""), row["id"]),
            )


def prune_old_sessions(days: int = 90) -> None:
    cutoff = int(time.time() * 1000) - days * 86_400_000
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM events WHERE session_id IN (SELECT session_id FROM sessions WHERE created_at < ?)",
            (cutoff,),
        )
        conn.execute(
            "DELETE FROM section_views WHERE session_id IN (SELECT session_id FROM sessions WHERE created_at < ?)",
            (cutoff,),
        )
        conn.execute("DELETE FROM sessions WHERE created_at < ?", (cutoff,))


def _anonymise_ip(ip: str) -> str:
    if ":" in ip:
        parts = ip.split(":")
        return ":".join(parts[:3]) + ":0000:0000:0000:0000:0000"
    parts = ip.split(".")
    if len(parts) == 4:
        parts[3] = "0"
    return ".".join(parts)


# ── Admin read queries ────────────────────────────────────────────────────────

def _row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)


def get_active_sessions() -> list[dict]:
    mark_inactive()
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM sessions WHERE is_active = 1 ORDER BY last_seen DESC"
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_recent_sessions(limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_stats() -> dict:
    now = int(time.time() * 1000)
    day_ms = 86_400_000

    with get_conn() as conn:
        total  = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
        unique = conn.execute(
            "SELECT COUNT(DISTINCT COALESCE(fingerprint, ip)) FROM sessions"
        ).fetchone()[0]
        today  = conn.execute(
            "SELECT COUNT(*) FROM sessions WHERE created_at > ?", (now - day_ms,)
        ).fetchone()[0]
        active = conn.execute(
            "SELECT COUNT(*) FROM sessions WHERE is_active = 1"
        ).fetchone()[0]

        top_sections = [
            _row_to_dict(r) for r in conn.execute(
                "SELECT section, COUNT(*) as views FROM section_views GROUP BY section ORDER BY views DESC LIMIT 10"
            ).fetchall()
        ]
        top_countries = [
            _row_to_dict(r) for r in conn.execute(
                "SELECT country, COUNT(*) as c FROM sessions WHERE country IS NOT NULL GROUP BY country ORDER BY c DESC LIMIT 10"
            ).fetchall()
        ]
        top_browsers = [
            _row_to_dict(r) for r in conn.execute(
                "SELECT browser, COUNT(*) as c FROM sessions WHERE browser IS NOT NULL GROUP BY browser ORDER BY c DESC LIMIT 5"
            ).fetchall()
        ]
        top_os = [
            _row_to_dict(r) for r in conn.execute(
                "SELECT os, COUNT(*) as c FROM sessions WHERE os IS NOT NULL GROUP BY os ORDER BY c DESC LIMIT 5"
            ).fetchall()
        ]
        device_types = [
            _row_to_dict(r) for r in conn.execute(
                "SELECT device_type, COUNT(*) as c FROM sessions WHERE device_type IS NOT NULL GROUP BY device_type ORDER BY c DESC"
            ).fetchall()
        ]

    return {
        "total": total,
        "unique": unique,
        "today": today,
        "active": active,
        "top_sections": top_sections,
        "top_countries": top_countries,
        "top_browsers": top_browsers,
        "top_os": top_os,
        "device_types": device_types,
    }


def get_session_detail(session_id: str) -> dict:
    with get_conn() as conn:
        session = conn.execute(
            "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
        ).fetchone()
        sections = conn.execute(
            "SELECT * FROM section_views WHERE session_id = ? ORDER BY viewed_at", (session_id,)
        ).fetchall()
        evts = conn.execute(
            "SELECT * FROM events WHERE session_id = ? ORDER BY occurred_at", (session_id,)
        ).fetchall()
    return {
        "session": _row_to_dict(session) if session else None,
        "sections": [_row_to_dict(r) for r in sections],
        "events": [_row_to_dict(r) for r in evts],
    }
