"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { allProjects, type Project as PortfolioProject } from "@/data/projects";

const SOFTWARE_CATEGORY = "Software";
const HOME_PROJECTS_COUNT = 3;

function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/** Zdjęcie w pasku nagłówka karty i modala. Logotypy (imageFit: "contain") nie są kadrowane. */
function ProjectImage({ project }: { project: PortfolioProject }) {
  const contain = project.imageFit === "contain";

  return (
    <>
      <img
        src={project.image}
        alt={project.title}
        loading="lazy"
        className={`absolute inset-0 w-full h-full ${
          contain ? "object-contain p-8" : "object-cover"
        }`}
        style={project.imageBg ? { backgroundColor: project.imageBg } : undefined}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
    </>
  );
}

function ProjectCard({
  project,
  index,
  onClick,
}: {
  project: PortfolioProject;
  index: number;
  onClick: () => void;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const featured = Boolean(project.featured);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15 }}
    >
      {/* layoutId links this card to the modal */}
      <motion.div
        layoutId={`card-${project.title}`}
        onClick={onClick}
        className="relative group rounded-2xl overflow-hidden h-full cursor-pointer"
        style={{
          background: "var(--card-bg)",
          border: featured
            ? "1px solid rgba(0, 240, 255, 0.35)"
            : "1px solid var(--card-border)",
          boxShadow: featured ? "0 0 32px rgba(0, 240, 255, 0.07)" : undefined,
        }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        {/* Image area */}
        <motion.div
          layoutId={`card-image-${project.title}`}
          className={`relative h-44 border-b border-card-border overflow-hidden ${
            featured
              ? "bg-gradient-to-br from-neon-cyan/5 to-neon-purple/5"
              : "bg-gradient-to-br from-neon-purple/5 to-neon-pink/5"
          }`}
        >
          <ProjectImage project={project} />

          {featured && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-widest uppercase text-neon-cyan border border-neon-cyan/30 bg-black/40 backdrop-blur-sm">
              ★ Featured
            </div>
          )}
        </motion.div>

        <div className="p-6 flex flex-col">
          <motion.h3
            layoutId={`card-title-${project.title}`}
            className={`text-xl font-bold mb-2 transition-colors ${
              featured ? "group-hover:text-neon-cyan" : "group-hover:text-neon-purple"
            }`}
          >
            {project.title}
          </motion.h3>

          <motion.p
            layoutId={`card-desc-${project.title}`}
            className="text-white/50 text-sm leading-relaxed mb-4"
          >
            {project.description}
          </motion.p>

          <div className="flex flex-wrap gap-2">
            {project.tech.map((t) => (
              <span
                key={t}
                className="px-2 py-1 text-xs rounded-md bg-white/5 text-white/50 border border-white/5"
              >
                {t}
              </span>
            ))}
          </div>

          <p className={`mt-4 text-xs font-mono ${featured ? "text-neon-cyan/60" : "text-neon-purple/60"}`}>
            kliknij aby rozwinąć →
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProjectModal({
  project,
  onClose,
}: {
  project: PortfolioProject;
  onClose: () => void;
}) {
  useScrollLock(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const featured = Boolean(project.featured);
  const accentText = featured ? "text-neon-cyan" : "text-neon-purple";
  const accentBorder = featured ? "border-neon-cyan/25" : "border-neon-purple/25";
  const accentBg = featured ? "bg-neon-cyan/8" : "bg-neon-purple/8";
  const accentHoverBg = featured ? "hover:bg-neon-cyan/10" : "hover:bg-neon-purple/10";
  const accentDot = featured ? "bg-neon-cyan" : "bg-neon-purple";
  const accentColor = featured ? "rgba(0,240,255," : "rgba(180,0,255,";

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — shares layoutId with the card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          layoutId={`card-${project.title}`}
          className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden pointer-events-auto"
          style={{
            background: "var(--card-bg)",
            border: featured
              ? "1px solid rgba(0, 240, 255, 0.4)"
              : "1px solid rgba(180,0,255,0.3)",
            boxShadow: `0 0 80px ${accentColor}0.12)`,
          }}
        >
          {/* Top image band */}
          <motion.div
            layoutId={`card-image-${project.title}`}
            className={`relative h-52 shrink-0 overflow-hidden ${
              featured
                ? "bg-gradient-to-br from-neon-cyan/10 to-neon-purple/10"
                : "bg-gradient-to-br from-neon-purple/10 to-neon-pink/10"
            }`}
          >
            <ProjectImage project={project} />

            {/* Glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(500px circle at 50% 100%, ${accentColor}0.08), transparent 70%)`,
              }}
            />

            {featured && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="absolute top-4 right-4 px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-widest uppercase text-neon-cyan border border-neon-cyan/30 bg-black/40 backdrop-blur-sm"
              >
                ★ Featured
              </motion.div>
            )}

            {/* Close button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              onClick={onClose}
              className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-colors"
            >
              ✕
            </motion.button>
          </motion.div>

          {/* Content */}
          <div className="p-8 min-h-0 overflow-y-auto">
            <motion.h3
              layoutId={`card-title-${project.title}`}
              className="text-3xl font-bold mb-2"
            >
              {project.title}
            </motion.h3>

            <motion.p
              layoutId={`card-desc-${project.title}`}
              className="text-white/60 text-sm leading-relaxed mb-4"
            >
              {project.description}
            </motion.p>

            {/* Extra details — fade in after card expands */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="w-full h-px bg-white/8 my-5" />

              <p className="text-white/40 text-sm leading-relaxed mb-6 whitespace-pre-line">
                {project.summary ?? project.details}
              </p>

              {/* Tech tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {project.tech.map((t) => (
                  <span
                    key={t}
                    className={`px-3 py-1.5 text-xs rounded-lg border ${accentText} ${accentBorder} ${accentBg}`}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 flex-wrap">
                {project.github && (
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
                  >
                    <GitHubIcon />
                    GitHub
                  </a>
                )}
                {project.live && (
                  <a
                    href={project.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium ${accentText} border ${accentBorder} ${accentHoverBg} transition-all duration-200`}
                  >
                    <span className={`w-2 h-2 rounded-full ${accentDot} animate-pulse`} />
                    Live Demo
                  </a>
                )}
                <Link
                  href={`/projekty/${project.id}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
                >
                  Czytaj więcej →
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default function Projects() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [selected, setSelected] = useState<PortfolioProject | null>(null);

  const softwareProjects = allProjects.filter((p) => p.category === SOFTWARE_CATEGORY);
  const featured = softwareProjects.filter((p) => p.featured);
  const nonFeatured = softwareProjects.filter((p) => !p.featured);
  const homeProjects = [...featured, ...nonFeatured].slice(0, HOME_PROJECTS_COUNT);

  return (
    <section id="projects" className="relative py-32 px-4">
      <div ref={ref} className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <span className="text-neon-cyan font-mono text-sm tracking-widest uppercase">
            04 — Projekty Software
          </span>
        </motion.div>

        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            Kod & <span className="gradient-text">aplikacje</span>
          </motion.span>
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="text-white/40 text-lg mb-16 max-w-2xl"
        >
          Aplikacje webowe, API, systemy — projekty, które rozwiązują realne problemy.
        </motion.p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {homeProjects.map((project, index) => (
            <ProjectCard
              key={project.title}
              project={project}
              index={index}
              onClick={() => setSelected(project)}
            />
          ))}
        </div>
      </div>

      {/* Portal-like modal layer */}
      <AnimatePresence>
        {selected && (
          <ProjectModal project={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
