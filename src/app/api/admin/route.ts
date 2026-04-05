import { NextRequest } from 'next/server';
import { getActiveSessions, getRecentSessions, getStats, getSessionDetails, anonymiseOldIps, pruneOldSessions } from '@/lib/db';

export const runtime = 'nodejs';

// Simple token auth — set ADMIN_TOKEN env var (defaults to a dev-only value)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'dev-admin-token-change-me';

function auth(request: NextRequest): boolean {
  const token =
    request.headers.get('x-admin-token') ??
    request.nextUrl.searchParams.get('token');
  return token === ADMIN_TOKEN;
}

export async function GET(request: NextRequest) {
  if (!auth(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get('action') ?? 'overview';

  if (action === 'overview') {
    // Run GDPR maintenance tasks
    anonymiseOldIps();
    pruneOldSessions();

    return Response.json({
      active: getActiveSessions(),
      recent: getRecentSessions(50),
      stats: getStats(),
    });
  }

  if (action === 'session') {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return Response.json({ error: 'missing id' }, { status: 400 });
    return Response.json(getSessionDetails(id));
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
}
