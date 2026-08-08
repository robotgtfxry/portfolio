export type Project = {
  id: string;
  title: string;
  emoji: string;
  category: string;
  description: string;
  details: string;
  /** Skrót pokazywany w modalu na stronie głównej. Bez niego modal używa `details`. */
  summary?: string;
  tech: string[];
  status: "Ukończony" | "W trakcie";
  github?: string;
  live?: string;
  image: string;
  /** "contain" dla logotypów/ikon, które nie mogą być przycięte. Domyślnie "cover". */
  imageFit?: "cover" | "contain";
  /** Tło pod obrazem — używane razem z imageFit: "contain". */
  imageBg?: string;
  featured?: boolean;
};

export const allProjects: Project[] = [
  // Software
  {
    id: "consys",
    title: "consys",
    emoji: "📡",
    category: "Software",
    description:
      "System łącza radiowego dla dronów — transmisja wideo i telemetrii przez wfb-ng, z korekcją błędów, automatycznym doborem kanału i diagnostyką w terminalu.",
    details:
      "consys to łącze radiowe dla dronów zbudowane na wfb-ng (WiFi Broadcast) i kartach RTL8812AU. System tworzą dwie jednostki Raspberry Pi — stacja naziemna i pokładowa — połączone dwukierunkowym tunelem.\n\nArchitektura:\n• gs.py — stacja naziemna: instalator, konfigurator i terminalowy interfejs diagnostyczny (curses), pojedynczy dongle pracujący dwukierunkowo\n• drone.py — jednostka pokładowa o tej samej funkcjonalności, z osobnymi kartami nadawczą i odbiorczą\n• podglad_testu.py — desktopowe narzędzie do wykresów z zapisanych testów\n\nGłówne mechanizmy:\n• Forward Error Correction — nadmiarowość od 1,13× do 5×, z rozdzieleniem strat przed naprawą i po naprawie, żeby widzieć realną skuteczność odzysku\n• Automatyczny hopping kanałów — stacja naziemna szuka lepszego kanału, gdy jakość łącza spada poniżej progu strat, i potwierdza zmianę z dronem\n• Monitoring sygnału w czasie rzeczywistym — RSSI, SNR i MCS per antena, agregowane do najlepszej anteny\n• Parowanie oparte na wymianie kluczy X25519 wyprowadzonych z ośmioznakowego kodu\n• Statystyki pobierane z wfb-ng przez gniazda TCP msgpack, przeliczane z surowych liczników na wielkości fizyczne\n\nTesty zasięgowe porównały schematy modulacji: MCS 0 (BPSK 1/2) utrzymał 0,20% błędnych pakietów przy −82 dBm, podczas gdy MCS 7 (64-QAM 5/6) degradował się do 3,09% już przy −68 dBm.",
    summary:
      "Łącze radiowe dla dronów oparte na wfb-ng i kartach RTL8812AU. Dwie jednostki Raspberry Pi — naziemna i pokładowa — wymieniają wideo i telemetrię przez dwukierunkowy tunel z korekcją utraconych pakietów i automatycznym doborem kanału.\n\nW testach zasięgowych MCS 0 utrzymał 0,20% błędnych pakietów przy −82 dBm.",
    tech: ["Python", "wfb-ng", "RTL8812AU", "Raspberry Pi", "FEC", "curses"],
    status: "W trakcie",
    github: "https://github.com/Attention-link/consys",
    image: "https://opengraph.githubassets.com/1/Attention-link/consys",
  },
  {
    id: "revdu",
    title: "Revdu",
    emoji: "🌐",
    category: "Software",
    description:
      "Mój największy projekt — platforma zbudowana na Next.js, Pythonie i PostgreSQL z wieloma integracjami.",
    details:
      "Zaawansowana architektura mikroserwisów, konteneryzacja Dockerem i wiele własnych integracji produkcyjnych. System obsługuje rejestrację użytkowników, katalog produktów, płatności i wiele więcej. Projekt rozwijany komercyjnie od 2024.",
    tech: ["Next.js", "Python", "PostgreSQL", "Docker", "REST API"],
    status: "W trakcie",
    github: "https://github.com/robotgtfxry/",
    live: "https://revdu.com",
    featured: true,
    image: "/brand/revdu-icon.svg",
    imageFit: "contain",
    imageBg: "#353F77",
  },
  {
    id: "ksef-sender",
    title: "ksef-sender",
    emoji: "🧾",
    category: "Software",
    description:
      "Desktopowa aplikacja w Pythonie do konwersji i wysyłki faktur do Krajowego Systemu e-Faktur (KSeF) — interfejs Tkinter, pełna obsługa API MF.",
    details:
      "ksef-sender to narzędzie desktopowe napisane w Pythonie z interfejsem graficznym opartym na Tkinter. Aplikacja rozwiązuje realny problem firm, które muszą dostosować się do obowiązku wystawiania e-faktur przez KSeF — Krajowy System e-Faktur Ministerstwa Finansów.\n\nGłówne funkcje:\n• Konwersja faktur z popularnych formatów do struktury XML zgodnej ze schematem FA(2) wymaganym przez KSeF\n• Wysyłka dokumentów bezpośrednio do API Ministerstwa Finansów z obsługą tokenów autoryzacyjnych\n• Walidacja faktury przed wysyłką — weryfikacja pól obowiązkowych, NIP kontrahentów i sum kontrolnych\n• Podgląd wygenerowanego XML przed wysłaniem\n• Historia wysłanych dokumentów z numerami referencyjnymi KSeF\n\nAplikacja działa w środowisku testowym (demo) oraz produkcyjnym MF. Interfejs Tkinter zapewnia prosty dostęp bez konieczności instalacji przeglądarki czy serwera — jeden plik wykonywalny.",
    tech: ["Python", "Tkinter", "KSeF API", "XML", "REST API"],
    status: "Ukończony",
    github: "https://github.com/robotgtfxry/ksef-sender",
    image: "https://opengraph.githubassets.com/1/robotgtfxry/ksef-sender",
  },
  {
    id: "software-3",
    title: "Projekt Software #3",
    emoji: "📱",
    category: "Software",
    description:
      "Opis trzeciego projektu — mobile app, IoT, embedded, ML.",
    details:
      "Szczegółowy opis trzeciego projektu. Architektura aplikacji, integracje z urządzeniami IoT, modele ML i wyniki.",
    tech: ["React Native", "Python", "TensorFlow", "MQTT"],
    status: "Ukończony",
    image:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=400&fit=crop",
  },
  {
    id: "portfolio",
    title: "Portfolio",
    emoji: "🖥️",
    category: "Software",
    description:
      "Ta strona — portfolio zbudowane w Next.js z animacjami i interaktywną galerią 3D.",
    details:
      "Strona portfolio z efektami wizualnymi, animacjami Framer Motion, interaktywną galerią DomeGallery i ciemnym motywem neonowym. Responsywna, szybka, zoptymalizowana.",
    tech: ["Next.js", "React", "Tailwind CSS", "Framer Motion"],
    status: "W trakcie",
    image:
      "https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&h=400&fit=crop",
  },
  {
    id: "software-4",
    title: "Projekt Software #4",
    emoji: "🔧",
    category: "Software",
    description:
      "Opis czwartego projektu — narzędzie CLI, DevOps, automatyzacja.",
    details:
      "Szczegółowy opis czwartego projektu. Narzędzie wiersza poleceń do automatyzacji zadań deweloperskich, integracja z CI/CD.",
    tech: ["Python", "Click", "GitHub Actions", "Docker"],
    status: "Ukończony",
    image:
      "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=600&h=400&fit=crop",
  },
  {
    id: "software-5",
    title: "Projekt Software #5",
    emoji: "🤖",
    category: "Software",
    description:
      "Opis piątego projektu — chatbot, AI, automatyzacja komunikacji.",
    details:
      "Szczegółowy opis piątego projektu. Bot konwersacyjny z integracją LLM, przetwarzanie języka naturalnego, automatyczne odpowiedzi.",
    tech: ["Python", "LangChain", "OpenAI API", "FastAPI"],
    status: "W trakcie",
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop",
  },
  // Robotyka
  {
    id: "vector",
    title: "VECTOR",
    emoji: "🤖",
    category: "Robotyka",
    description:
      "Robot z ramieniem robotycznym — projekt budowany od podstaw z własnym PCB, konstrukcja mechaniczna i elektronika zaprojektowane samodzielnie.",
    details:
      "VECTOR to robot z ramieniem robotycznym, w którym każdy element powstał od zera. Własna płytka PCB zaprojektowana i wytrawiona przez nas, konstrukcja mechaniczna modelowana w CAD i drukowana 3D.",
    tech: ["PCB Design", "CAD", "3D Print", "C++", "Elektronika"],
    status: "W trakcie",
    featured: true,
    image:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=400&fit=crop",
  },
  {
    id: "robot-2",
    title: "Robot #2",
    emoji: "🦾",
    category: "Robotyka",
    description:
      "Opis drugiego robota — autonomiczna nawigacja, sterowanie, komunikacja.",
    details:
      "Robot z autonomiczną nawigacją opartą na LIDARze i kamerze. Implementacja SLAM, planowanie ścieżki, unikanie przeszkód.",
    tech: ["Raspberry Pi", "Python", "ROS", "LIDAR"],
    status: "Ukończony",
    image:
      "https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?w=600&h=400&fit=crop",
  },
  {
    id: "robot-3",
    title: "Robot #3",
    emoji: "⚙️",
    category: "Robotyka",
    description:
      "Opis trzeciego robota — najnowszy projekt, aktualnie w budowie.",
    details:
      "Projekt bazuje na ESP32, własnej płytce PCB i zaawansowanym sterowaniu silnikami. Model 3D w CAD, testy na prototypie.",
    tech: ["ESP32", "MicroPython", "PCB Design", "CAD"],
    status: "W trakcie",
    image:
      "https://images.unsplash.com/photo-1518314916381-77a37c2a49ae?w=600&h=400&fit=crop",
  },
  {
    id: "robot-4",
    title: "Robot #4",
    emoji: "🕹️",
    category: "Robotyka",
    description:
      "Opis czwartego robota — robot mobilny, zdalne sterowanie.",
    details:
      "Robot mobilny sterowany zdalnie przez Wi-Fi z kamerą FPV. Własna aplikacja do sterowania na telefon, transmisja wideo w czasie rzeczywistym.",
    tech: ["ESP32", "React Native", "WebSocket", "FPV"],
    status: "Ukończony",
    image:
      "https://images.unsplash.com/photo-1535378620166-273708d44e4c?w=600&h=400&fit=crop",
  },
  // Inżynieria
  {
    id: "silnik-jonowy",
    title: "Silnik jonowy",
    emoji: "🛰️",
    category: "Inżynieria",
    description:
      "Silnik jonowy dla nanosatelitów CubeSat — napęd elektrostatyczny bez paliwa chemicznego i bez części ruchomych. Zwycięski projekt VII edycji Akademii ProtoLab.",
    details:
      "System napędowy dla nanosatelitów klasy CubeSat, oparty na elektrostatycznym przyspieszaniu jonów gazu. Działa bez paliwa chemicznego i bez części ruchomych — stąd niska masa i wysoka niezawodność, co przy ładunkach orbitalnych, gdzie liczy się każdy gram, ma decydujące znaczenie.\n\nPrzeznaczenie: precyzyjne manewry orbitalne oraz kontrolowana deorbitacja satelity po zakończeniu misji.\n\nProjekt zrealizowany wspólnie z Aleksandrem Olberem z Politechniki Rzeszowskiej. Zwyciężył VII edycję Akademii ProtoLab — programu Podkarpackiego Centrum Innowacji, w którym nad rozwiązaniami z zakresu lotnictwa i kosmonautyki pracowało 36 uczestników. Finał odbył się 21 czerwca 2025.",
    tech: ["CubeSat", "Napęd jonowy", "Elektrostatyka", "Nanosatelity"],
    status: "Ukończony",
    live: "https://rzeszow-news.pl/vii-edycja-akademii-protolab-juz-za-nami-zwyciezyl-silnik-jonowy-dla-nanosatelitow/",
    featured: true,
    image:
      "https://images.unsplash.com/photo-1517976487492-5750f3195933?w=600&h=400&fit=crop",
  },
  {
    id: "eng-mechanika",
    title: "Mechanika",
    emoji: "📐",
    category: "Inżynieria",
    description:
      "Projekt mechaniczny — zaprojektowany i wykonany od podstaw.",
    details:
      "Szczegółowy opis projektu: koncepcja, modelowanie 3D, prototypowanie, testy. Jakie problemy mechaniczne zostały rozwiązane.",
    tech: ["SolidWorks", "3D Print", "CNC"],
    status: "Ukończony",
    image:
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&h=400&fit=crop",
  },
  {
    id: "eng-elektronika",
    title: "Elektronika",
    emoji: "🔌",
    category: "Inżynieria",
    description:
      "Projekt elektroniczny — własna płytka PCB i system embedded.",
    details:
      "Projekt płytki PCB: schemat, layout, lutowanie, testowanie. System embedded sterujący urządzeniem z własnym oprogramowaniem.",
    tech: ["KiCad", "PCB Design", "Oscyloskop"],
    status: "Ukończony",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop",
  },
  {
    id: "eng-automatyka",
    title: "Automatyka",
    emoji: "🏭",
    category: "Inżynieria",
    description:
      "System automatyzacji — sterowanie, czujniki, logika.",
    details:
      "Projekt systemu automatyzacji: dobór czujników, programowanie logiki sterowania, integracja z istniejącą infrastrukturą.",
    tech: ["PLC", "Python", "Sensory"],
    status: "W trakcie",
    image:
      "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=600&h=400&fit=crop",
  },
  {
    id: "eng-design",
    title: "Projekt Design #1",
    emoji: "🎨",
    category: "Design",
    description:
      "Opis projektu designerskiego — co zaprojektowałeś, jaki problem rozwiązuje.",
    details:
      "Szczegółowy opis projektu. Proces projektowy od koncepcji do finału.",
    tech: ["Figma", "Blender", "Fusion 360"],
    status: "Ukończony",
    image:
      "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=400&fit=crop",
  },
  {
    id: "druk-3d",
    title: "Druk 3D",
    emoji: "🖨️",
    category: "Inżynieria",
    description:
      "Projekty drukowane 3D — od modeli funkcjonalnych po prototypy.",
    details:
      "Kolekcja projektów drukowanych 3D: obudowy, części mechaniczne, prototypy urządzeń. Modelowanie w Fusion 360 i SolidWorks, druk FDM i SLA.",
    tech: ["Fusion 360", "Cura", "FDM", "SLA"],
    status: "Ukończony",
    image:
      "https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=600&h=400&fit=crop",
  },
  // Kosmonautyka
  {
    id: "stratostem",
    title: "StratoSTEM",
    emoji: "🎈",
    category: "Kosmonautyka",
    description:
      "Program edukacyjny PCINN + Boeing — budowa balonów stratosferycznych, eksperymenty naukowe.",
    details:
      "Program Podkarpackiego Centrum Innowacji we współpracy z Boeing. Warsztaty dla uczniów szkół średnich — projektowanie balonów stratosferycznych i przygotowanie ładunków naukowych.",
    tech: ["Balony stratosferyczne", "Boeing", "PCINN", "STEM"],
    status: "W trakcie",
    live: "https://event.pcinn.org/stratostem",
    featured: true,
    image:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&h=400&fit=crop",
  },
  // Hobby
  {
    id: "fotografia",
    title: "Fotografia",
    emoji: "📷",
    category: "Hobby",
    description:
      "Fotografia — krajobraz, architektura, macro.",
    details:
      "Fotografuję od kilku lat. Głównie krajobrazy, architekturę i zdjęcia macro. Obróbka w Lightroom i Photoshop.",
    tech: ["Lightroom", "Photoshop", "Canon"],
    status: "W trakcie",
    image:
      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&h=400&fit=crop",
  },
  {
    id: "muzyka",
    title: "Produkcja muzyki",
    emoji: "🎵",
    category: "Hobby",
    description:
      "Produkcja muzyki elektronicznej — beaty, synthwave, ambient.",
    details:
      "Tworzenie muzyki elektronicznej w DAW. Syntezatory, sampling, miksowanie i mastering. Eksperymenty z różnymi gatunkami.",
    tech: ["FL Studio", "Serum", "Ableton"],
    status: "W trakcie",
    image:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop",
  },
];

export const categoryColors: Record<string, string> = {
  Software: "text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10",
  Robotyka: "text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10",
  Inżynieria: "text-neon-purple border-neon-purple/30 bg-neon-purple/10",
  Design: "text-neon-pink border-neon-pink/30 bg-neon-pink/10",
  Kosmonautyka: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  Hobby: "text-green-400 border-green-400/30 bg-green-400/10",
};
