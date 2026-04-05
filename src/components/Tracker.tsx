'use client';

import { useEffect, useRef } from 'react';

// ── Canvas/WebGL fingerprint ──────────────────────────────────────────────────

function buildFingerprint(): string {
  const parts: string[] = [];

  // Canvas fingerprint
  try {
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 50;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.font = '11pt "Arial"';
      ctx.fillText('Portfolio tracker 🎯', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.font = '18pt "Arial"';
      ctx.fillText('Portfolio tracker 🎯', 4, 45);
      parts.push(c.toDataURL().slice(-50));
    }
  } catch { /* sandboxed */ }

  // WebGL fingerprint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        parts.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        parts.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
      parts.push(String(gl.getParameter(gl.MAX_TEXTURE_SIZE)));
    }
  } catch { /* sandboxed */ }

  // Stable device signals
  parts.push(navigator.language);
  parts.push(String(screen.colorDepth));
  parts.push(String(screen.width) + 'x' + String(screen.height));
  parts.push(navigator.platform ?? '');
  parts.push(new Date().getTimezoneOffset().toString());

  // Hash the collected string
  return simpleHash(parts.join('|'));
}

function simpleHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

// ── Session ID ────────────────────────────────────────────────────────────────

function getSessionId(): string {
  const key = '_pt_sid';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

// ── Intersection observer for sections ───────────────────────────────────────

type SectionEntry = { name: string; enteredAt: number; timeSpent: number };

const SECTION_SELECTORS: Record<string, string> = {
  hero: '#hero',
  about: '#about',
  skills: '#skills',
  robotics: '#robotics',
  engineering: '#engineering',
  projects: '#projects',
  contact: '#contact',
};

// ── Main component ────────────────────────────────────────────────────────────

export default function Tracker() {
  const sessionId = useRef<string>('');
  const startTime = useRef<number>(Date.now());
  const clicks = useRef<number>(0);
  const maxScroll = useRef<number>(0);
  const sectionsRef = useRef<Map<string, SectionEntry>>(new Map());
  const pendingEvents = useRef<Array<{ type: string; data?: unknown }>>([]);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialized = useRef(false);

  function send(payload: Record<string, unknown>) {
    // Use sendBeacon when available for reliability during page unload
    const data = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([data], { type: 'application/json' }));
    } else {
      fetch('/api/track', { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    }
  }

  function collectActivity() {
    return {
      sessionId: sessionId.current,
      totalTime: Date.now() - startTime.current,
      clicks: clicks.current,
      maxScroll: maxScroll.current,
      sections: [...sectionsRef.current.values()].map((s) => ({
        name: s.name,
        timeSpent: s.timeSpent + (s.enteredAt > 0 ? Date.now() - s.enteredAt : 0),
      })),
    };
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    sessionId.current = getSessionId();

    // ── Init beacon ─────────────────────────────────────────────────────────
    const fingerprint = buildFingerprint();

    send({
      type: 'init',
      sessionId: sessionId.current,
      fingerprint,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenWidth: screen.width,
      screenHeight: screen.height,
      referer: document.referrer || null,
    });

    // ── Click tracking ───────────────────────────────────────────────────────
    const onClickCapture = () => { clicks.current++; };
    document.addEventListener('click', onClickCapture, { passive: true });

    // ── Scroll tracking ──────────────────────────────────────────────────────
    const onScroll = () => {
      const scrolled = Math.round(
        ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
      );
      if (scrolled > maxScroll.current) maxScroll.current = scrolled;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── Section visibility tracking ──────────────────────────────────────────
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const name = entry.target.getAttribute('data-section') ?? '';
          if (!name) continue;

          let rec = sectionsRef.current.get(name);
          if (!rec) {
            rec = { name, enteredAt: 0, timeSpent: 0 };
            sectionsRef.current.set(name, rec);
          }

          if (entry.isIntersecting) {
            rec.enteredAt = Date.now();
          } else if (rec.enteredAt > 0) {
            rec.timeSpent += Date.now() - rec.enteredAt;
            rec.enteredAt = 0;
          }
        }
      },
      { threshold: 0.3 }
    );

    // Attach data-section attributes to known sections
    for (const [name, selector] of Object.entries(SECTION_SELECTORS)) {
      const el = document.querySelector(selector);
      if (el) {
        el.setAttribute('data-section', name);
        observer.observe(el);
      }
    }

    // ── Heartbeat every 30 s ─────────────────────────────────────────────────
    heartbeatTimer.current = setInterval(() => {
      send({ type: 'activity', ...collectActivity(), events: pendingEvents.current.splice(0) });
    }, 30_000);

    // ── Leave event ──────────────────────────────────────────────────────────
    const onLeave = () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      send({ type: 'leave', ...collectActivity() });
    };
    window.addEventListener('beforeunload', onLeave);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onLeave();
    });

    return () => {
      document.removeEventListener('click', onClickCapture);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeunload', onLeave);
      observer.disconnect();
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    };
  }, []);

  return null; // renders nothing
}
