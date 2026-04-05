#!/usr/bin/env node
// Portfolio Analytics — Terminal UI
// Run: node admin-tui.js [--token YOUR_TOKEN] [--url http://localhost:3000]
//
// Dependencies: blessed, blessed-contrib  (already in node_modules)

'use strict';

const blessed   = require('blessed');
const contrib   = require('blessed-contrib');
const https     = require('https');
const http      = require('http');
const { URL }   = require('url');

// ── Config ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const BASE_URL    = getArg('--url')   || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
const ADMIN_TOKEN = getArg('--token') || process.env.ADMIN_TOKEN     || 'dev-admin-token-change-me';
const REFRESH_MS  = parseInt(getArg('--refresh') || '10000', 10);

// ── HTTP helper ───────────────────────────────────────────────────────────────

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const mod = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      headers:  { 'x-admin-token': ADMIN_TOKEN },
    };
    const req = mod.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtMs(ms) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60)  return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60)  return m + 'm ' + (s % 60) + 's';
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
}

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('pl-PL', { hour12: false });
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('pl-PL') + ' ' + d.toLocaleTimeString('pl-PL', { hour12: false });
}

function truncate(str, len) {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

function deviceIcon(type) {
  if (!type) return '?';
  if (type === 'mobile')  return '📱';
  if (type === 'tablet')  return '📋';
  return '🖥 ';
}

// ── Build UI ──────────────────────────────────────────────────────────────────

const screen = blessed.screen({
  smartCSR:    true,
  title:       'Portfolio Analytics',
  fullUnicode: true,
  dockBorders: true,
});

// Main grid
const grid = new contrib.grid({ rows: 12, cols: 12, screen });

// ── Row 0-1: header + status bar ──────────────────────────────────────────────
const header = grid.set(0, 0, 1, 9, blessed.text, {
  content: ' {bold}{cyan-fg}◆ Portfolio Analytics{/cyan-fg}{/bold}   {gray-fg}TUI Panel{/gray-fg}',
  tags:    true,
  style:   { bg: '#0a0a0a' },
});

const statusBar = grid.set(0, 9, 1, 3, blessed.text, {
  content: ' connecting…',
  tags:    true,
  align:   'right',
  style:   { bg: '#0a0a0a', fg: '#555' },
});

// ── Row 1-4: Active sessions (left) + Stats boxes (right) ────────────────────
const activeTable = grid.set(1, 0, 4, 7, contrib.table, {
  keys:         true,
  interactive:  true,
  label:        ' {bold}Active Sessions{/bold} ',
  tags:         true,
  columnSpacing: 2,
  columnWidth:  [4, 16, 12, 10, 8, 6, 6],
  style: {
    border:   { fg: '#00f0ff' },
    header:   { fg: '#00f0ff', bold: true },
    cell:     { selected: { bg: '#1a1a1a', fg: 'white' } },
  },
});

const statsBox = grid.set(1, 7, 2, 5, blessed.box, {
  label: ' {bold}Overview{/bold} ',
  tags:  true,
  style: { border: { fg: '#b400ff' } },
  padding: { left: 1 },
});

const countryBox = grid.set(3, 7, 2, 5, blessed.box, {
  label: ' {bold}Top Countries{/bold} ',
  tags:  true,
  style: { border: { fg: '#b400ff' } },
  padding: { left: 1 },
});

// ── Row 5-8: Recent visitors ──────────────────────────────────────────────────
const recentTable = grid.set(5, 0, 4, 12, contrib.table, {
  keys:         true,
  interactive:  true,
  label:        ' {bold}Recent Visitors{/bold} ',
  tags:         true,
  columnSpacing: 2,
  columnWidth:  [4, 10, 12, 13, 12, 8, 7, 8, 8],
  style: {
    border:   { fg: '#ff006e' },
    header:   { fg: '#ff006e', bold: true },
    cell:     { selected: { bg: '#1a1a1a', fg: 'white' } },
  },
});

// ── Row 9-11: Section stats (bar chart) + Browser/OS + Detail pane ───────────
const sectionBar = grid.set(9, 0, 3, 5, contrib.bar, {
  label:      ' {bold}Section Views{/bold} ',
  tags:       true,
  barWidth:   4,
  barSpacing: 1,
  xOffset:    0,
  maxHeight:  10,
  style:      { border: { fg: '#00f0ff' } },
  barBgColor: 'cyan',
});

const browserBox = grid.set(9, 5, 3, 4, blessed.box, {
  label: ' {bold}Browsers / OS{/bold} ',
  tags:  true,
  style: { border: { fg: '#ff006e' } },
  padding: { left: 1 },
});

const detailBox = grid.set(9, 9, 3, 3, blessed.box, {
  label:    ' {bold}Session Detail{/bold} ',
  tags:     true,
  scrollable: true,
  style:    { border: { fg: '#b400ff' } },
  padding:  { left: 1 },
  content:  ' {gray-fg}Select a row above{/gray-fg}',
});

// ── Help bar ──────────────────────────────────────────────────────────────────
const helpBar = blessed.box({
  bottom:  0,
  left:    0,
  width:   '100%',
  height:  1,
  tags:    true,
  content: ' {cyan-fg}↑↓{/cyan-fg} navigate  {cyan-fg}Enter{/cyan-fg} details  {cyan-fg}r{/cyan-fg} refresh  {cyan-fg}q{/cyan-fg} quit',
  style:   { bg: '#111', fg: '#555' },
});
screen.append(helpBar);

// ── Data state ────────────────────────────────────────────────────────────────

let lastData = null;
let selectedSessionId = null;

// ── Render functions ──────────────────────────────────────────────────────────

function renderActive(sessions) {
  const rows = sessions.map((s, i) => [
    String(i + 1),
    truncate(s.country || s.ip || '?', 16),
    truncate(s.browser || '?', 12),
    truncate(s.os || '?', 10),
    deviceIcon(s.device_type),
    fmtMs(s.total_time),
    String(s.page_clicks || 0),
  ]);
  activeTable.setData({
    headers: ['#', 'Country/IP', 'Browser', 'OS', 'Dev', 'Time', 'Clk'],
    data:    rows.length ? rows : [['—', '—', '—', '—', '—', '—', '—']],
  });
}

function renderRecent(sessions) {
  const rows = sessions.map((s, i) => [
    String(i + 1),
    fmtTime(s.created_at),
    truncate(s.country || '?', 12),
    truncate(s.city || '?', 13),
    truncate(s.browser || '?', 12),
    truncate(s.os || '?', 8),
    String(s.max_scroll || 0) + '%',
    fmtMs(s.total_time),
    s.is_active ? '{green-fg}●{/green-fg}' : '{gray-fg}○{/gray-fg}',
  ]);
  recentTable.setData({
    headers: ['#', 'Time', 'Country', 'City', 'Browser', 'OS', 'Scroll', 'Time', 'Live'],
    data:    rows.length ? rows : [['—', '—', '—', '—', '—', '—', '—', '—', '—']],
  });
}

function renderStats(stats) {
  statsBox.setContent(
    ` {yellow-fg}Total visits:{/yellow-fg}   ${stats.total}\n` +
    ` {yellow-fg}Unique users:{/yellow-fg}   ${stats.unique}\n` +
    ` {yellow-fg}Today:{/yellow-fg}          ${stats.today}\n` +
    ` {green-fg}● Active now:{/green-fg}    ${stats.active}`
  );

  const countries = (stats.topCountries || []).slice(0, 5);
  const lines = countries.map((c) => {
    const bar = '█'.repeat(Math.min(c.c, 10));
    return ` {cyan-fg}${truncate(c.country || '?', 12).padEnd(12)}{/cyan-fg} ${bar} ${c.c}`;
  });
  countryBox.setContent(lines.join('\n') || ' {gray-fg}no data{/gray-fg}');

  // Section bar chart
  const sections = (stats.topSections || []).slice(0, 7);
  sectionBar.setData({
    titles: sections.map((s) => s.section.slice(0, 4)),
    data:   sections.map((s) => s.views),
  });

  // Browsers / OS
  const browsers = (stats.topBrowsers || []).slice(0, 4);
  const oses     = (stats.topOs || []).slice(0, 4);
  const bLines   = browsers.map((b) => ` {magenta-fg}${truncate(b.browser || '?', 10).padEnd(10)}{/magenta-fg} ${b.c}`);
  const oLines   = oses.map((o) => ` {blue-fg}${truncate(o.os || '?', 10).padEnd(10)}{/blue-fg} ${o.c}`);
  browserBox.setContent(
    '{bold}Browsers:{/bold}\n' + (bLines.join('\n') || ' —') +
    '\n\n{bold}OS:{/bold}\n' + (oLines.join('\n') || ' —')
  );
}

function renderDetail(session) {
  if (!session) {
    detailBox.setContent(' {gray-fg}no session selected{/gray-fg}');
    return;
  }
  const lines = [
    ` {yellow-fg}ID:{/yellow-fg} ${session.session_id.slice(0, 12)}…`,
    ` {yellow-fg}IP:{/yellow-fg} ${session.ip || '?'}`,
    ` {yellow-fg}Country:{/yellow-fg} ${session.country || '?'}`,
    ` {yellow-fg}City:{/yellow-fg} ${session.city || '?'}`,
    ` {yellow-fg}ISP:{/yellow-fg} ${truncate(session.isp, 20)}`,
    ` {yellow-fg}Browser:{/yellow-fg} ${session.browser || '?'} ${session.browser_version || ''}`,
    ` {yellow-fg}OS:{/yellow-fg} ${session.os || '?'}`,
    ` {yellow-fg}Device:{/yellow-fg} ${session.device_type || '?'}`,
    ` {yellow-fg}Lang:{/yellow-fg} ${session.language || '?'}`,
    ` {yellow-fg}TZ:{/yellow-fg} ${session.timezone || '?'}`,
    ` {yellow-fg}Screen:{/yellow-fg} ${session.screen_width || '?'}x${session.screen_height || '?'}`,
    ` {yellow-fg}Time:{/yellow-fg} ${fmtMs(session.total_time)}`,
    ` {yellow-fg}Scroll:{/yellow-fg} ${session.max_scroll || 0}%`,
    ` {yellow-fg}Clicks:{/yellow-fg} ${session.page_clicks || 0}`,
    ` {yellow-fg}Referer:{/yellow-fg} ${truncate(session.referer, 20)}`,
    ` {yellow-fg}First:{/yellow-fg} ${fmtDate(session.created_at)}`,
    ` {yellow-fg}Last:{/yellow-fg} ${fmtDate(session.last_seen)}`,
    ` {yellow-fg}Active:{/yellow-fg} ${session.is_active ? '{green-fg}yes{/green-fg}' : '{gray-fg}no{/gray-fg}'}`,
  ];
  detailBox.setContent(lines.join('\n'));
}

// ── Fetch & refresh ───────────────────────────────────────────────────────────

async function refresh() {
  statusBar.setContent(' {yellow-fg}⟳ fetching…{/yellow-fg}');
  screen.render();
  try {
    const data = await fetchJson('/api/admin?action=overview');
    lastData = data;

    renderActive(data.active || []);
    renderRecent(data.recent || []);
    renderStats(data.stats || {});

    const now = new Date().toLocaleTimeString('pl-PL', { hour12: false });
    statusBar.setContent(` {green-fg}✓ ${now}{/green-fg}   {gray-fg}${BASE_URL}{/gray-fg}`);

    // Re-render selected session detail if still present
    if (selectedSessionId) {
      const found = (data.recent || []).find((s) => s.session_id === selectedSessionId);
      renderDetail(found || null);
    }
  } catch (err) {
    statusBar.setContent(` {red-fg}✗ ${err.message}{/red-fg}`);
  }
  screen.render();
}

// ── Key bindings ──────────────────────────────────────────────────────────────

screen.key(['q', 'C-c'], () => { screen.destroy(); process.exit(0); });
screen.key(['r'], () => refresh());

// Select row in recent table → show detail
recentTable.rows.on('select', (item, index) => {
  if (!lastData || !lastData.recent) return;
  const session = lastData.recent[index];
  if (!session) return;
  selectedSessionId = session.session_id;
  renderDetail(session);
  // Optionally fetch full detail with section views
  fetchJson(`/api/admin?action=session&id=${encodeURIComponent(session.session_id)}`)
    .then((detail) => {
      if (!detail.session) return;
      const sections = (detail.sections || []).map((s) => `  ${s.section} (${fmtMs(s.time_spent)})`).join('\n');
      const base = detailBox.getContent();
      detailBox.setContent(base + (sections ? `\n\n {bold}Sections:{/bold}\n${sections}` : ''));
      screen.render();
    })
    .catch(() => {});
  screen.render();
});

recentTable.rows.on('select', () => { recentTable.focus(); });
activeTable.rows.on('select', (item, index) => {
  if (!lastData || !lastData.active) return;
  const session = lastData.active[index];
  if (session) { selectedSessionId = session.session_id; renderDetail(session); screen.render(); }
});

// ── Auto-refresh timer ────────────────────────────────────────────────────────

setInterval(refresh, REFRESH_MS);

// ── Boot ──────────────────────────────────────────────────────────────────────

screen.render();
refresh();
recentTable.focus();

console.log = () => {}; // Suppress stray console output that would corrupt TUI
