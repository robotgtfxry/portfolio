import { NextResponse, type NextRequest } from "next/server";
import { notifyLinkOpen } from "@/lib/tracked-link";

// Jawny wariant linku: /l/<token>. Wygodny, gdy link ma prowadzic gdzie indziej
// niz na wlasna domene — cel siedzi wtedy w tokenie. Do wysylania konkretnym
// osobom lepszy jest wariant dyskretny z middleware.ts (?ref=...), bo tam
// adres nie rozni sie od zwyklego linku do strony.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const home = new URL("/", req.url).toString();

  // Tutaj czekamy na backend, bo bez jego odpowiedzi nie znamy celu — token
  // jest zaszyfrowany i front nie ma jak go przeczytac. Niewazny token,
  // wygasly albo lezace API konczy sie cichym powrotem na strone glowna:
  // klikajacy nie musi wiedziec, ze link byl znaczony.
  const target = token ? await notifyLinkOpen(token, req.headers) : null;

  const response = NextResponse.redirect(target ?? home, 302);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
