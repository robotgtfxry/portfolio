"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

type TimelineItem = {
  type: "role" | "mentoring";
  title: string;
  org: string;
  url?: string;
  period: string;
  description: string;
  tags?: string[];
  color: "cyan" | "purple" | "pink";
  certified?: boolean;
  collapsible?: boolean;
  certificateUrl?: string;
  certificateReady?: boolean;
};

const timeline: TimelineItem[] = [
  {
    type: "role",
    title: "Hardware Engineer",
    org: "Attention Link",
    url: "https://attention-link.com",
    period: "obecnie",
    description:
      "Prowadzę rozwój techniczny startupu budującego łącza radiowe dla dronów — transmisja wideo i telemetrii, kompresja strumienia i szyfrowanie, z zastosowaniami w obronności.",
    tags: ["Drony", "Systemy radiowe", "Kompresja", "Szyfrowanie", "Embedded"],
    color: "purple",
    collapsible: false,
  },
  {
    type: "role",
    title: "Platform Engineer",
    org: "Revdu",
    url: "https://revdu.com",
    period: "2024 — obecnie",
    description:
      "Współtworzę platformę Revdu — architektura systemu, backend w Pythonie, baza PostgreSQL, integracje zewnętrzne, konteneryzacja Dockerem.",
    tags: ["Next.js", "Python", "PostgreSQL", "Docker"],
    color: "cyan",
    collapsible: false,
  },
  {
    type: "role",
    title: "Ambasador",
    org: "Podkarpackie Centrum Innowacji",
    url: "https://pcinn.org/protolab/programy-edukacyjne/program-ambasadorski/",
    period: "2025 — obecnie",
    description:
      "Ambasador Programu Ambasadorskiego PCI — promowanie innowacji, przedsiębiorczości i kultury startupowej wśród młodych ludzi w regionie Podkarpacia.",
    tags: ["Innowacje", "Edukacja", "Startupy"],
    color: "pink",
    collapsible: false,
  },
  {
    type: "role",
    title: "Uczestnik programu",
    org: "StratoSTEM",
    url: "https://event.pcinn.org/stratostem",
    period: "marzec – wrzesień 2026",
    description:
      "Program edukacyjny Podkarpackiego Centrum Innowacji we współpracy z Boeing — budowa balonów stratosferycznych. Warsztaty dla uczniów szkół średnich z Podkarpacia: przygotowanie projektów i eksperymenty naukowe związane z przestrzenią kosmiczną.",
    tags: ["Balony stratosferyczne", "Boeing", "PCINN", "Kosmonautyka", "STEM"],
    color: "cyan",
    collapsible: false,
  },
  {
    type: "mentoring",
    title: "Mentor",
    org: "Hack Carpatia",
    period: "14 marca 2026",
    description:
      "Mentoring uczestników hackathonu Hack Carpatia — doradztwo techniczne, ocena projektów, warsztaty dla zespołów.",
    tags: ["Hackathon", "Mentoring", "Tech"],
    color: "purple",
    certified: true,
    collapsible: true,
    certificateUrl: "/certificates/hackcarpatia_mielec.pdf",
    certificateReady: true,
  },
  {
    type: "mentoring",
    title: "Mentor",
    org: "NASA Space Apps Challenge",
    period: "kwiecień 2025",
    description:
      "Mentoring uczestników NASA Space Apps Challenge — największego na świecie hackathonu NASA. Doradztwo techniczne, wsparcie zespołów w rozwiązywaniu wyzwań kosmicznych.",
    tags: ["NASA", "Hackathon", "Mentoring", "Space"],
    color: "purple",
    certified: true,
    collapsible: true,
    certificateUrl: "/certificates/nasa-space-apps-2025.pdf",
    certificateReady: true,
  },
];

const colorMap = {
  cyan:   { border: "border-neon-cyan/30",   bg: "bg-neon-cyan/5",   text: "text-neon-cyan",   dot: "bg-neon-cyan",   glow: "rgba(0,240,255,0.06)" },
  purple: { border: "border-neon-purple/30", bg: "bg-neon-purple/5", text: "text-neon-purple", dot: "bg-neon-purple", glow: "rgba(180,0,255,0.06)" },
  pink:   { border: "border-neon-pink/30",   bg: "bg-neon-pink/5",   text: "text-neon-pink",   dot: "bg-neon-pink",   glow: "rgba(255,0,128,0.06)" },
};

// ── Certificate modal ────────────────────────────────────────────────────────
function CertificateModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl bg-[#111]/95 border border-neon-purple/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{ maxHeight: "90vh" }}
        >
          {/* Glow top */}
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{ background: "radial-gradient(500px circle at 50% -40px, rgba(180,0,255,0.07), transparent 60%)" }}
          />

          {/* Header */}
          <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-neon-purple" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                </svg>
              </div>
              <span className="text-sm font-mono font-bold text-white/80 tracking-wide">
                Certyfikat — {title}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-purple/70 hover:text-neon-purple text-xs font-mono transition-colors"
              >
                Otwórz w nowej karcie ↗
              </a>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white/70 transition-colors text-sm font-mono w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5"
              >
                ✕
              </button>
            </div>
          </div>

          {/* PDF iframe */}
          <div className="relative flex-1" style={{ minHeight: "60vh" }}>
            <iframe
              src={url}
              className="w-full h-full"
              style={{ minHeight: "60vh" }}
              title={`Certyfikat — ${title}`}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Timeline entry ───────────────────────────────────────────────────────────
function TimelineEntry({
  item,
  index,
  isInView,
  instant = false,
}: {
  item: TimelineItem;
  index: number;
  isInView: boolean;
  /** Wpisy odsłaniane kliknięciem „rozwiń" — bez własnego wejścia, żeby nie było pustej luki. */
  instant?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const c = colorMap[item.color];
  const isCollapsible = item.collapsible !== false && item.type === "mentoring";

  const hasCert = Boolean(item.certificateUrl);
  const certReady = item.certificateReady === true;

  const openCert = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!certReady || !item.certificateUrl) return;
    setCertOpen(true);
  };

  return (
    <>
      <motion.div
        initial={instant ? false : { opacity: 0 }}
        animate={instant || isInView ? { opacity: 1 } : {}}
        transition={instant ? { duration: 0 } : { delay: 0.3 + index * 0.12, duration: 0.6 }}
        className="relative flex gap-6"
      >
        {/* Timeline spine + dot */}
        <div className="flex flex-col items-center">
          <div className={`w-3 h-3 rounded-full ${c.dot} mt-1 shrink-0 ${item.type === "role" ? "animate-pulse" : ""}`} />
          <div className="w-px flex-1 mt-2 bg-white/8" />
        </div>

        {/* Card */}
        <div className="pb-10 flex-1 min-w-0">
          <div
            className={`relative rounded-2xl border ${c.border} ${c.bg} overflow-hidden transition-all duration-300 group`}
          >
            {/* Hover glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
              style={{ background: `radial-gradient(300px circle at 50% 0%, ${c.glow}, transparent 70%)` }}
            />

            {/* Header row — always visible */}
            <div
              className={`flex flex-wrap items-start justify-between gap-3 p-5 ${isCollapsible ? "cursor-pointer select-none" : ""}`}
              onClick={() => isCollapsible && setExpanded((v) => !v)}
            >
              <div className="flex-1 min-w-0">
                <div className={`font-mono text-xs ${c.text} tracking-widest uppercase mb-1`}>
                  {item.period}
                  {item.type === "mentoring" && (
                    <span className="ml-2 text-white/30">· Mentoring</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold leading-tight">{item.title}</h3>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`${c.text} font-mono text-sm hover:underline`}
                    >
                      {item.org} ↗
                    </a>
                  ) : (
                    <span className={`${c.text} font-mono text-sm`}>{item.org}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 mt-0.5 flex-wrap">
                {/* Certificate button / badge */}
                {hasCert && (
                  certReady ? (
                    <button
                      onClick={openCert}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neon-purple/10 border border-neon-purple/25 hover:bg-neon-purple/20 hover:border-neon-purple/40 transition-all duration-200 group/cert"
                    >
                      <svg className="w-3 h-3 text-neon-purple" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                      </svg>
                      <span className="text-neon-purple text-[10px] font-mono font-bold tracking-wider group-hover/cert:text-white transition-colors">
                        CERTYFIKAT
                      </span>
                    </button>
                  ) : (
                    <div
                      title="Certyfikat zostanie dodany wkrótce"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 cursor-default"
                    >
                      <svg className="w-3 h-3 text-white/25" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                      </svg>
                      <span className="text-white/30 text-[10px] font-mono font-bold tracking-wider">
                        WKRÓTCE
                      </span>
                    </div>
                  )
                )}

                {/* Fallback CERT badge for entries without certificateUrl but certified=true */}
                {item.certified && !hasCert && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neon-purple/10 border border-neon-purple/20">
                    <svg className="w-3 h-3 text-neon-purple" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                    </svg>
                    <span className="text-neon-purple text-[10px] font-mono font-bold tracking-wider">CERT</span>
                  </div>
                )}

                {isCollapsible && (
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-white/30 text-xs"
                  >
                    ▼
                  </motion.span>
                )}
              </div>
            </div>

            {/* Expandable / always-visible body */}
            <AnimatePresence initial={false}>
              {(!isCollapsible || expanded) && (
                <motion.div
                  key="body"
                  initial={isCollapsible ? { height: 0, opacity: 0 } : false}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5">
                    <p className="text-white/50 text-sm leading-relaxed mb-4">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`px-2 py-1 text-xs rounded-md border ${c.border} ${c.text} bg-white/5`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* "Zobacz certyfikat" inline button in expanded body */}
                      {hasCert && (
                        certReady ? (
                          <button
                            onClick={openCert}
                            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border ${c.border} ${c.text} bg-neon-purple/8 hover:bg-neon-purple/18 transition-all duration-200`}
                          >
                            📄 Zobacz certyfikat
                          </button>
                        ) : (
                          <span className="ml-auto text-xs font-mono text-white/25 flex items-center gap-1">
                            ⏳ Certyfikat wkrótce
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Certificate PDF modal */}
      {certOpen && certReady && item.certificateUrl && (
        <CertificateModal
          url={item.certificateUrl}
          title={`${item.title} — ${item.org}`}
          onClose={() => setCertOpen(false)}
        />
      )}
    </>
  );
}

export default function Experience() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [showAll, setShowAll] = useState(false);

  return (
    <section id="experience" className="relative py-32 px-4">
      <div ref={ref} className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <span className="text-neon-cyan font-mono text-sm tracking-widest uppercase">
            02 — Doświadczenie
          </span>
        </motion.div>

        {/* Title */}
        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            Role & <span className="gradient-text">mentoring</span>
          </motion.span>
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="text-white/40 text-lg mb-16 max-w-2xl"
        >
          Tworzę strony i aplikacje webowe, rozwijam systemy radiowe dla dronów i dzielę się
          wiedzą jako mentor na hackathonach.
        </motion.p>

        {/* Timeline — collapsed: first item with blur fade, expanded: all */}
        <div className="relative">
          {/* First item — clickable to expand when collapsed */}
          <div
            className={`relative ${!showAll ? "max-h-[200px] overflow-hidden cursor-pointer" : ""}`}
            onClick={() => !showAll && setShowAll(true)}
          >
            <TimelineEntry
              key={`${timeline[0].org}-0`}
              item={timeline[0]}
              index={0}
              isInView={isInView}
            />

            {/* Blur/fade overlay when collapsed */}
            {!showAll && (
              <div
                className="absolute bottom-0 left-0 right-0 h-40 flex items-end justify-center pb-3"
                style={{
                  background: "linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.3) 30%, rgba(10,10,10,0.7) 60%, var(--background) 100%)",
                  backdropFilter: "blur(3px)",
                  WebkitBackdropFilter: "blur(3px)",
                  maskImage: "linear-gradient(to bottom, transparent 0%, black 25%)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 25%)",
                }}
              >
                <span className="text-white/40 text-xs font-mono">
                  kliknij aby rozwinac
                </span>
              </div>
            )}
          </div>

          {/* Rest of timeline — animated */}
          <AnimatePresence initial={false}>
            {showAll && (
              <motion.div
                key="rest"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                {timeline.slice(1).map((item, index) => (
                  <TimelineEntry
                    key={`${item.org}-${index + 1}`}
                    item={item}
                    index={index + 1}
                    isInView={isInView}
                    instant
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse button — only when expanded */}
          {showAll && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center mt-4"
            >
              <button
                onClick={() => setShowAll(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20 text-white/50 hover:text-white text-sm font-mono transition-all duration-200 cursor-pointer"
              >
                <motion.span animate={{ rotate: 180 }}>▼</motion.span>
                Zwin
              </button>
            </motion.div>
          )}
        </div>

      </div>
    </section>
  );
}
