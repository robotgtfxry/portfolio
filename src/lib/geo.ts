// Simple in-memory cache to avoid hammering ip-api.com (rate limit: 45 req/min)
const cache = new Map<string, { data: GeoInfo; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

export interface GeoInfo {
  country: string | null;
  city: string | null;
  isp: string | null;
}

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^::1$/,
  /^fc/,
  /^fd/,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((r) => r.test(ip));
}

export async function getGeoInfo(ip: string): Promise<GeoInfo> {
  const empty: GeoInfo = { country: null, city: null, isp: null };

  if (!ip || isPrivateIp(ip)) return empty;

  const cached = cache.get(ip);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,isp`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return empty;
    const json = await res.json();
    if (json.status !== 'success') return empty;

    const data: GeoInfo = {
      country: json.country ?? null,
      city: json.city ?? null,
      isp: json.isp ?? null,
    };
    cache.set(ip, { data, ts: Date.now() });
    return data;
  } catch {
    return empty;
  }
}

export function extractIp(request: Request): string {
  const headerOrder = [
    'x-real-ip',
    'x-forwarded-for',
    'cf-connecting-ip',
    'true-client-ip',
  ];
  for (const h of headerOrder) {
    const val = request.headers.get(h);
    if (val) return val.split(',')[0].trim();
  }
  return '127.0.0.1';
}
