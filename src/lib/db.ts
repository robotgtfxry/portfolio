import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'analytics.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      fingerprint TEXT,
      ip TEXT,
      ip_anonymized INTEGER DEFAULT 0,
      country TEXT,
      city TEXT,
      isp TEXT,
      user_agent TEXT,
      browser TEXT,
      browser_version TEXT,
      os TEXT,
      device_type TEXT,
      language TEXT,
      timezone TEXT,
      screen_width INTEGER,
      screen_height INTEGER,
      referer TEXT,
      created_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      total_time INTEGER DEFAULT 0,
      page_clicks INTEGER DEFAULT 0,
      max_scroll INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS section_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      section TEXT NOT NULL,
      viewed_at INTEGER NOT NULL,
      time_spent INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      data TEXT,
      occurred_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
    CREATE INDEX IF NOT EXISTS idx_sessions_fingerprint ON sessions(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_section_views_session ON section_views(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
  `);
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function upsertSession(data: {
  sessionId: string;
  fingerprint?: string;
  ip: string;
  country?: string;
  city?: string;
  isp?: string;
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  deviceType?: string;
  language?: string;
  timezone?: string;
  screenWidth?: number;
  screenHeight?: number;
  referer?: string;
}) {
  const db = getDb();
  const now = Date.now();

  const existing = db.prepare('SELECT id FROM sessions WHERE session_id = ?').get(data.sessionId);

  if (existing) {
    db.prepare(`
      UPDATE sessions SET last_seen = ?, is_active = 1 WHERE session_id = ?
    `).run(now, data.sessionId);
  } else {
    db.prepare(`
      INSERT INTO sessions (
        session_id, fingerprint, ip, country, city, isp,
        user_agent, browser, browser_version, os, device_type,
        language, timezone, screen_width, screen_height, referer,
        created_at, last_seen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.sessionId,
      data.fingerprint ?? null,
      data.ip,
      data.country ?? null,
      data.city ?? null,
      data.isp ?? null,
      data.userAgent ?? null,
      data.browser ?? null,
      data.browserVersion ?? null,
      data.os ?? null,
      data.deviceType ?? null,
      data.language ?? null,
      data.timezone ?? null,
      data.screenWidth ?? null,
      data.screenHeight ?? null,
      data.referer ?? null,
      now,
      now,
    );
  }
}

export function updateSessionActivity(data: {
  sessionId: string;
  totalTime?: number;
  clicks?: number;
  maxScroll?: number;
  isActive?: boolean;
}) {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    UPDATE sessions SET
      last_seen = ?,
      total_time = COALESCE(?, total_time),
      page_clicks = COALESCE(?, page_clicks),
      max_scroll = MAX(COALESCE(max_scroll, 0), COALESCE(?, 0)),
      is_active = ?
    WHERE session_id = ?
  `).run(
    now,
    data.totalTime ?? null,
    data.clicks ?? null,
    data.maxScroll ?? null,
    data.isActive !== false ? 1 : 0,
    data.sessionId,
  );
}

export function recordSectionView(sessionId: string, section: string, timeSpent = 0) {
  const db = getDb();
  db.prepare(`
    INSERT INTO section_views (session_id, section, viewed_at, time_spent)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, section, Date.now(), timeSpent);
}

export function recordEvent(sessionId: string, eventType: string, data?: unknown) {
  const db = getDb();
  db.prepare(`
    INSERT INTO events (session_id, event_type, data, occurred_at)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, eventType, data ? JSON.stringify(data) : null, Date.now());
}

export function markInactiveSessions(thresholdMs = 5 * 60 * 1000) {
  const db = getDb();
  const cutoff = Date.now() - thresholdMs;
  db.prepare('UPDATE sessions SET is_active = 0 WHERE last_seen < ? AND is_active = 1').run(cutoff);
}

// GDPR: anonymise IP after 30 days
export function anonymiseOldIps(daysOld = 30) {
  const db = getDb();
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  // IPv4: zero last octet; IPv6: zero last 80 bits (keep /48 prefix)
  const rows = db.prepare(
    'SELECT id, ip FROM sessions WHERE ip_anonymized = 0 AND created_at < ?'
  ).all(cutoff) as { id: number; ip: string }[];

  const update = db.prepare('UPDATE sessions SET ip = ?, ip_anonymized = 1 WHERE id = ?');
  const anon = db.transaction(() => {
    for (const row of rows) {
      update.run(anonymiseIp(row.ip), row.id);
    }
  });
  anon();
}

// GDPR: delete sessions older than 90 days
export function pruneOldSessions(daysOld = 90) {
  const db = getDb();
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  db.prepare('DELETE FROM events WHERE session_id IN (SELECT session_id FROM sessions WHERE created_at < ?)').run(cutoff);
  db.prepare('DELETE FROM section_views WHERE session_id IN (SELECT session_id FROM sessions WHERE created_at < ?)').run(cutoff);
  db.prepare('DELETE FROM sessions WHERE created_at < ?').run(cutoff);
}

function anonymiseIp(ip: string): string {
  if (ip.includes(':')) {
    // IPv6 — keep first 3 groups
    const parts = ip.split(':');
    return parts.slice(0, 3).join(':') + ':0000:0000:0000:0000:0000';
  }
  // IPv4 — zero last octet
  const parts = ip.split('.');
  parts[3] = '0';
  return parts.join('.');
}

// ── Admin queries ─────────────────────────────────────────────────────────────

export function getActiveSessions() {
  const db = getDb();
  markInactiveSessions();
  return db.prepare(`
    SELECT * FROM sessions WHERE is_active = 1 ORDER BY last_seen DESC
  `).all();
}

export function getRecentSessions(limit = 50) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?
  `).all(limit);
}

export function getStats() {
  const db = getDb();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const total = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number }).c;
  const unique = (db.prepare("SELECT COUNT(DISTINCT COALESCE(fingerprint, ip)) as c FROM sessions").get() as { c: number }).c;
  const today = (db.prepare('SELECT COUNT(*) as c FROM sessions WHERE created_at > ?').get(now - day) as { c: number }).c;
  const active = (db.prepare('SELECT COUNT(*) as c FROM sessions WHERE is_active = 1').get() as { c: number }).c;

  const topSections = db.prepare(`
    SELECT section, COUNT(*) as views FROM section_views GROUP BY section ORDER BY views DESC LIMIT 10
  `).all();

  const topCountries = db.prepare(`
    SELECT country, COUNT(*) as c FROM sessions WHERE country IS NOT NULL GROUP BY country ORDER BY c DESC LIMIT 10
  `).all();

  const topBrowsers = db.prepare(`
    SELECT browser, COUNT(*) as c FROM sessions WHERE browser IS NOT NULL GROUP BY browser ORDER BY c DESC LIMIT 5
  `).all();

  const topOs = db.prepare(`
    SELECT os, COUNT(*) as c FROM sessions WHERE os IS NOT NULL GROUP BY os ORDER BY c DESC LIMIT 5
  `).all();

  const deviceTypes = db.prepare(`
    SELECT device_type, COUNT(*) as c FROM sessions WHERE device_type IS NOT NULL GROUP BY device_type ORDER BY c DESC
  `).all();

  const hourlyToday = db.prepare(`
    SELECT strftime('%H', datetime(created_at/1000, 'unixepoch')) as hour, COUNT(*) as c
    FROM sessions WHERE created_at > ?
    GROUP BY hour ORDER BY hour
  `).all(now - day);

  return { total, unique, today, active, topSections, topCountries, topBrowsers, topOs, deviceTypes, hourlyToday };
}

export function getSessionDetails(sessionId: string) {
  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId);
  const sections = db.prepare('SELECT * FROM section_views WHERE session_id = ? ORDER BY viewed_at').all(sessionId);
  const evts = db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY occurred_at').all(sessionId);
  return { session, sections, events: evts };
}
