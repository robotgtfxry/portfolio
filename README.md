This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Powiadomienia i linki specjalne

### Dane w mailu z formularza

Każda wiadomość z formularza kontaktowego przychodzi z sekcją **„Kto pisał"**:
czas wysłania, IP, kraj i miasto (z nagłówków Vercela), urządzenie, język,
strefa czasowa, rozdzielczość, źródło wejścia, czas spędzony na stronie, liczba
kliknięć, głębokość scrolla, oglądane sekcje wraz z czasem, odcisk przeglądarki
i identyfikator sesji. Dane z przeglądarki zbiera `Tracker.tsx` — gdy jest
zablokowany, mail zawiera samą część z nagłówków HTTP.

### Linki z powiadomieniem o otwarciu

Link nie wymaga bazy — etykieta siedzi w samym tokenie, zaszyfrowana i
uwierzytelniona sekretem `LINK_SECRET`. Po otwarciu przychodzi mail z IP,
lokalizacją i urządzeniem klikającego. Podglądy linków (Gmail, Slack, WhatsApp,
LinkedIn) są odfiltrowane, żeby nie generowały fałszywych powiadomień.

Odbiorca nie ma z czego poznać, że link jest znaczony: domyślny format to zwykły
adres strony z parametrem polecającym (`/projekty?ref=…`), parametr znika
z paska adresu natychmiast po wejściu, a token po odkodowaniu base64 jest
nieczytelny. Wariant `--style path` daje jawne `/l/<token>` i przydaje się, gdy
link ma prowadzić poza własną domenę.

```bash
python make_link.py --gen-secret
```

Wynik wpisz jako `LINK_SECRET` w `backend/.env.local` oraz w zmiennych projektu
`portfolio-api` na Vercelu — bez tego samego sekretu po obu stronach linki nie
przejdą weryfikacji. Potem generujesz linki — bez argumentów otwiera się okno
z formularzem, które zapisuje sekret i kopiuje gotowy link do schowka:

```bash
python make_link.py
```

To samo z wiersza poleceń:

```bash
python make_link.py "Rekruter Nokia"
```

Przydatne opcje: `--url` (dokąd ma trafić klikający), `--days N` (po ilu dniach
link przestaje działać), `--base` (domena frontu), `--style path` (jawny format).
Stan konfiguracji sprawdzisz pod `/api/link/health`.

Generator działa wyłącznie lokalnie — liczy token z sekretu na dysku i z niczym
się nie łączy. Vercel jest bezserwerowy, nie ma tam czego logować się po SSH.
