import { NextRequest } from 'next/server';
import { UAParser } from 'ua-parser-js';
import { upsertSession, updateSessionActivity, recordSectionView, recordEvent } from '@/lib/db';
import { getGeoInfo, extractIp } from '@/lib/geo';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'init') {
      await handleInit(request, body);
    } else if (type === 'activity') {
      await handleActivity(body);
    } else if (type === 'leave') {
      await handleLeave(body);
    } else {
      return Response.json({ error: 'unknown type' }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[track]', err);
    return Response.json({ error: 'internal' }, { status: 500 });
  }
}

async function handleInit(request: NextRequest, body: Record<string, unknown>) {
  const ip = extractIp(request);
  const ua = request.headers.get('user-agent') ?? '';
  const parser = new UAParser(ua);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  const geo = await getGeoInfo(ip);

  upsertSession({
    sessionId: String(body.sessionId ?? ''),
    fingerprint: body.fingerprint ? String(body.fingerprint) : undefined,
    ip,
    country: geo.country ?? undefined,
    city: geo.city ?? undefined,
    isp: geo.isp ?? undefined,
    userAgent: ua,
    browser: browser.name ?? undefined,
    browserVersion: browser.version ?? undefined,
    os: `${os.name ?? ''} ${os.version ?? ''}`.trim() || undefined,
    deviceType: device.type ?? 'desktop',
    language: body.language ? String(body.language) : undefined,
    timezone: body.timezone ? String(body.timezone) : undefined,
    screenWidth: body.screenWidth ? Number(body.screenWidth) : undefined,
    screenHeight: body.screenHeight ? Number(body.screenHeight) : undefined,
    referer: body.referer ? String(body.referer) : undefined,
  });
}

async function handleActivity(body: Record<string, unknown>) {
  const sessionId = String(body.sessionId ?? '');
  if (!sessionId) return;

  updateSessionActivity({
    sessionId,
    totalTime: body.totalTime ? Number(body.totalTime) : undefined,
    clicks: body.clicks ? Number(body.clicks) : undefined,
    maxScroll: body.maxScroll ? Number(body.maxScroll) : undefined,
    isActive: true,
  });

  if (Array.isArray(body.sections)) {
    for (const s of body.sections as Array<{ name: string; timeSpent?: number }>) {
      if (s?.name) recordSectionView(sessionId, s.name, s.timeSpent ?? 0);
    }
  }

  if (Array.isArray(body.events)) {
    for (const e of body.events as Array<{ type: string; data?: unknown }>) {
      if (e?.type) recordEvent(sessionId, e.type, e.data);
    }
  }
}

async function handleLeave(body: Record<string, unknown>) {
  const sessionId = String(body.sessionId ?? '');
  if (!sessionId) return;

  updateSessionActivity({
    sessionId,
    totalTime: body.totalTime ? Number(body.totalTime) : undefined,
    clicks: body.clicks ? Number(body.clicks) : undefined,
    maxScroll: body.maxScroll ? Number(body.maxScroll) : undefined,
    isActive: false,
  });

  if (Array.isArray(body.sections)) {
    for (const s of body.sections as Array<{ name: string; timeSpent?: number }>) {
      if (s?.name) recordSectionView(sessionId, s.name, s.timeSpent ?? 0);
    }
  }
}
