import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { notifyLinkOpen } from "@/lib/tracked-link";

// Dyskretny wariant linku z powiadomieniem: zamiast osobnej sciezki /l/<token>
// adres wyglada jak zwykly link z parametrem polecajacym, np.
//
//     https://twoja-domena/projekty?ref=hK3n1s...
//
// Parametr znika z paska adresu zaraz po wejsciu, wiec odwiedzajacy zostaje na
// zwyklym adresie strony i nie ma czego ogladac. Sam token jest zaszyfrowany —
// po odkodowaniu base64 nie wychodzi z niego etykieta ani nic innego.

const PARAM = "ref";

export const config = {
  // Wszystko poza zasobami Nexta, API i plikami z rozszerzeniem. Trafienie
  // w matcher nic jeszcze nie kosztuje — bez parametru wychodzimy od razu.
  matcher: ["/((?!_next/|api/|favicon.ico|.*\\.[\\w]+$).*)"],
};

export function middleware(req: NextRequest, event: NextFetchEvent) {
  const token = req.nextUrl.searchParams.get(PARAM);
  if (!token) return NextResponse.next();

  // Powiadomienie leci w tle: wysylka maila idzie przez SMTP i potrafi zajac
  // sekunde albo dwie, a strona ma otworzyc sie natychmiast — inaczej sam czas
  // ladowania zdradzalby, ze link jest nietypowy.
  event.waitUntil(notifyLinkOpen(token, req.headers));

  const clean = req.nextUrl.clone();
  clean.searchParams.delete(PARAM);
  return NextResponse.redirect(clean, 302);
}
