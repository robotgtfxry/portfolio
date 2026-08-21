// Wspolna obsluga linkow z powiadomieniem. Uzywaja jej dwie sciezki wejscia:
// middleware (dyskretne ?ref=... na zwyklym adresie) i trasa /l/<token>.
//
// Sekret zna wylacznie backend — tutaj token jest nieprzezroczystym ciagiem,
// ktory tylko przekazujemy dalej razem z tym, czego backend sam nie zobaczy:
// prawdziwym adresem IP i naglowkami przegladarki.

export function apiBase(): string {
  const raw =
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8000";
  // Zmienna bywa ustawiona z /api na koncu albo bez — obcinamy, bo sciezke
  // dokladamy sami i nie chcemy /api/api/link.
  return raw.replace(/\/+$/, "").replace(/\/api$/, "");
}

/**
 * Zglasza otwarcie linku. Zwraca adres docelowy z tokenu albo null, gdy token
 * jest niewazny, wygasl lub backend nie odpowiada — wolajacy decyduje wtedy,
 * dokad odeslac odwiedzajacego.
 */
export async function notifyLinkOpen(
  token: string,
  headers: Headers,
): Promise<string | null> {
  const ip =
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    null;

  try {
    const res = await fetch(`${apiBase()}/api/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        ip,
        user_agent: headers.get("user-agent"),
        referer: headers.get("referer"),
        language: headers.get("accept-language"),
        // Geolokalizacja Vercela dochodzi do funkcji frontowej, nie do API —
        // przekazujemy ja dalej, zeby mail mial miasto i kraj.
        country: headers.get("x-vercel-ip-country"),
        city: headers.get("x-vercel-ip-city"),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return typeof data.url === "string" ? data.url : null;
  } catch {
    return null;
  }
}
