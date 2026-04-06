"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence, LayoutGroup } from "framer-motion";
import Folder, { FolderItem } from "./Folder";

type Item = FolderItem & {
  description: string;
  tech: string[];
  status: "Ukończony" | "W trakcie";
  details: string;
  category: string;
  url?: string;
  readMoreUrl?: string;
};

const items: Item[] = [
  {
    id: "vector",
    label: "VECTOR",
    icon: "🤖",
    category: "Robotyka",
    description: "Robot z ramieniem robotycznym — projekt budowany od podstaw z wlasnym PCB, konstrukcja mechaniczna i elektronika zaprojektowane samodzielnie.",
    details: "VECTOR to robot z ramieniem robotycznym, w ktorym kazdy element powstal od zera. Wlasna plytka PCB zaprojektowana i wytrawiona przez nas, konstrukcja mechaniczna modelowana w CAD i drukowana 3D. Sterowanie oparte na mikrokontrolerze z dedykowanym firmware. Projekt w trakcie realizacji.",
    tech: ["PCB Design", "CAD", "3D Print", "C++", "Elektronika"],
    status: "W trakcie",
  },
  {
    id: "robot-2",
    label: "Robot #2",
    icon: "🦾",
    category: "Robotyka",
    description: "Opis drugiego robota — autonomiczna nawigacja, sterowanie, komunikacja.",
    details: "Robot z autonomiczną nawigacją opartą na LIDARze i kamerze. Implementacja SLAM, planowanie ścieżki, unikanie przeszkód.",
    tech: ["Raspberry Pi", "Python", "ROS", "LIDAR"],
    status: "Ukończony",
  },
  {
    id: "robot-3",
    label: "Robot #3",
    icon: "⚙️",
    category: "Robotyka",
    description: "Opis trzeciego robota — najnowszy projekt, aktualnie w budowie.",
    details: "Projekt bazuje na ESP32, własnej płytce PCB i zaawansowanym sterowaniu silnikami. Model 3D w CAD, testy na prototypie.",
    tech: ["ESP32", "MicroPython", "PCB Design", "CAD"],
    status: "W trakcie",
  },
  {
    id: "eng-1",
    label: "Mechanika",
    icon: "📐",
    category: "Inżynieria",
    description: "Projekt mechaniczny — zaprojektowany i wykonany od podstaw.",
    details: "Szczegółowy opis projektu: koncepcja, modelowanie 3D, prototypowanie, testy. Jakie problemy mechaniczne zostały rozwiązane i jakie technologie zastosowano.",
    tech: ["SolidWorks", "3D Print", "CNC"],
    status: "Ukończony",
  },
  {
    id: "eng-2",
    label: "Elektronika",
    icon: "🔌",
    category: "Inżynieria",
    description: "Projekt elektroniczny — własna płytka PCB i system embedded.",
    details: "Projekt płytki PCB: schemat, layout, lutowanie, testowanie. System embedded sterujący urządzeniem z własnym oprogramowaniem.",
    tech: ["KiCad", "PCB Design", "Oscyloskop"],
    status: "Ukończony",
  },
  {
    id: "eng-3",
    label: "Automatyka",
    icon: "🏭",
    category: "Inżynieria",
    description: "System automatyzacji — sterowanie, czujniki, logika.",
    details: "Projekt systemu automatyzacji: dobór czujników, programowanie logiki sterowania, integracja z istniejącą infrastrukturą.",
    tech: ["PLC", "Python", "Sensory"],
    status: "W trakcie",
  },
  {
    id: "stratostem",
    label: "StratoSTEM",
    icon: "🎈",
    category: "Kosmonautyka",
    description: "Program edukacyjny PCINN + Boeing — budowa balonów stratosferycznych, eksperymenty naukowe związane z przestrzenią kosmiczną.",
    details: "Program Podkarpackiego Centrum Innowacji we współpracy z Boeing. Warsztaty dla uczniów szkół średnich z Podkarpacia — projektowanie i budowa balonów stratosferycznych, przygotowanie ładunków naukowych oraz eksperymenty badawcze wyniesione na krawędź stratosfery.",
    tech: ["Balony stratosferyczne", "Boeing", "PCINN", "Kosmonautyka", "STEM"],
    status: "W trakcie",
    url: "https://event.pcinn.org/stratostem",
  },
];

const categoryColor: Record<string, string> = {
  Robotyka:     "text-neon-cyan border-neon-cyan/20 bg-neon-cyan/10",
  Inżynieria:   "text-neon-purple border-neon-purple/20 bg-neon-purple/10",
  Kosmonautyka: "text-amber-400 border-amber-400/20 bg-amber-400/10",
};

// Special "Zobacz więcej" paper shown as 3rd slot in folder
const MORE_ITEM: FolderItem = {
  id: "__more__",
  label: "Zobacz więcej",
  icon: "📂",
};

const FOLDER_SIZE = 2.2;

export default function Robotics() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const [folderOpen, setFolderOpen]     = useState(false);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [showModal,  setShowModal]      = useState(false);

  const selected    = items.find((i) => i.id === selectedId) ?? null;
  const hasSelection = selectedId !== null;

  // First 2 real items + "Zobacz więcej" as 3rd paper
  const folderPapers: FolderItem[] = [...items.slice(0, 2), MORE_ITEM];

  const handleItemClick = (item: FolderItem) => {
    if (item.id === "__more__") {
      setShowModal(true);
    } else {
      setSelectedId((prev) => (prev === item.id ? null : item.id));
    }
  };

  const closeAll = () => {
    setSelectedId(null);
    setFolderOpen(false);
    setShowModal(false);
  };

  return (
    <section id="robotics" className="relative py-24 sm:py-32 px-4 overflow-x-hidden">
      <div
        className="absolute top-1/2 left-0 w-96 h-96 rounded-full opacity-5 blur-[150px] pointer-events-none"
        style={{ background: "var(--neon-cyan)" }}
      />

      <div ref={ref} className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <span className="text-neon-cyan font-mono text-sm tracking-widest uppercase">
            05 — Hardware
          </span>
        </motion.div>

        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            Moje <span className="gradient-text">zainteresowania i projekty</span>
          </motion.span>
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="text-white/40 text-lg max-w-2xl mb-6"
        >
          Roboty, mechanika, elektronika, automatyka — projekty łączące świat cyfrowy z fizycznym.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="pt-24 sm:pt-36"
        >
          <LayoutGroup>
            {/* Mobile: column (folder on top, panel below). Desktop: row (folder left, panel right) */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-8 sm:gap-12">

              {/* ── Folder column ────────────────────────────────────────── */}
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                /* Mobile: always centered. Desktop: mx-auto when no panel, snap left when panel visible */
                className={`flex flex-col items-center gap-6 shrink-0 mx-auto ${hasSelection ? "sm:mx-0" : ""}`}
              >
                <Folder
                  color="#00f0ff"
                  size={FOLDER_SIZE}
                  items={folderPapers}
                  activeId={selectedId ?? undefined}
                  open={folderOpen}
                  onOpenChange={(v) => {
                    setFolderOpen(v);
                    if (!v) setSelectedId(null);
                  }}
                  onItemClick={handleItemClick}
                />

                {/* Hint / close button */}
                <AnimatePresence mode="wait">
                  {!folderOpen ? (
                    <motion.p
                      key="hint"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-neon-cyan/60 text-xs font-mono"
                    >
                      kliknij mnie
                    </motion.p>
                  ) : (
                    <motion.button
                      key="close"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      onClick={closeAll}
                      className="text-white/25 hover:text-white/50 text-xs font-mono transition-colors"
                    >
                      zamknij ✕
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* ── Detail panel ────────────────────────────────────────── */}
              <AnimatePresence mode="popLayout">
                {hasSelection && selected && (
                  <motion.div
                    key="panel"
                    layout
                    /* Mobile: slide up. Desktop: slide in from right */
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.05 }}
                    className="w-full sm:flex-1 sm:min-w-0 relative rounded-2xl border border-neon-cyan/25 bg-neon-cyan/5 p-4 sm:p-7 overflow-hidden"
                  >
                    <div
                      className="absolute inset-0 pointer-events-none rounded-2xl"
                      style={{ background: "radial-gradient(400px circle at 50% -40px, rgba(0,240,255,0.07), transparent 70%)" }}
                    />

                    <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl sm:text-3xl">{selected.icon}</span>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold">{selected.label}</h3>
                          <span className="font-mono text-xs text-white/30">{selected.id}.md</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border ${categoryColor[selected.category]}`}>
                          {selected.category}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
                          selected.status === "Ukończony"
                            ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"
                            : "bg-neon-pink/10 text-neon-pink border border-neon-pink/20"
                        }`}>
                          {selected.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-white/60 text-sm leading-relaxed mb-4">{selected.description}</p>
                    <div className="w-full h-px bg-white/8 my-4 sm:my-5" />
                    <p className="text-white/40 text-sm leading-relaxed mb-5 sm:mb-6">{selected.details}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {selected.tech.map((t) => (
                        <span key={t} className="px-2 py-1 text-xs rounded-md bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/15">
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {selected.url && (
                        <a
                          href={selected.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400/70 hover:text-amber-400 border border-amber-400/20 hover:border-amber-400/40 bg-amber-400/5 hover:bg-amber-400/10 px-3 py-1.5 rounded-lg transition-all duration-200"
                        >
                          {selected.url.replace("https://", "")} ↗
                        </a>
                      )}

                      {selected.readMoreUrl && (
                        <a
                          href={selected.readMoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-neon-cyan/70 hover:text-neon-cyan border border-neon-cyan/20 hover:border-neon-cyan/40 bg-neon-cyan/5 hover:bg-neon-cyan/10 px-3 py-1.5 rounded-lg transition-all duration-200"
                        >
                          Czytaj wiecej →
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </LayoutGroup>
        </motion.div>
      </div>

      {/* ── "Zobacz więcej" modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md mx-3 rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl p-4 sm:p-6 shadow-2xl"
              style={{ maxHeight: "85vh", overflowY: "auto" }}
            >
              {/* Glow */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ background: "radial-gradient(400px circle at 50% -20px, rgba(0,240,255,0.06), transparent 70%)" }}
              />

              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-white font-mono tracking-wide">
                  📂 Wszystkie projekty
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white/30 hover:text-white/70 transition-colors text-sm font-mono"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {items.map((item, i) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => {
                      setSelectedId(item.id);
                      setShowModal(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                      selectedId === item.id
                        ? "bg-neon-cyan/10 border-neon-cyan/30 text-white"
                        : "border-transparent text-white/55 hover:text-white hover:bg-white/5 hover:border-white/8"
                    }`}
                  >
                    <span className="text-xl leading-none shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">{item.label}</p>
                      <p className="text-xs text-white/30 truncate mt-0.5">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${categoryColor[item.category]}`}>
                        {item.category}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.status === "Ukończony" ? "bg-neon-cyan" : "bg-neon-pink"
                      }`} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
