"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const projects = [
  {
    title: "Projekt Software #1",
    description: "Opis aplikacji webowej — co robi, jaki problem rozwiązuje, jakie technologie.",
    tech: ["Next.js", "TypeScript", "Tailwind", "PostgreSQL"],
    github: "#",
    live: "#",
  },
  {
    title: "Projekt Software #2",
    description: "Opis drugiego projektu — API, backend, system, automatyzacja.",
    tech: ["Python", "FastAPI", "Docker", "Redis"],
    github: "#",
    live: "#",
  },
  {
    title: "Projekt Software #3",
    description: "Opis trzeciego projektu — mobile app, IoT, embedded, ML.",
    tech: ["React Native", "Python", "TensorFlow", "MQTT"],
    github: "#",
    live: null,
  },
];

function ProjectCard({
  project,
  index,
}: {
  project: (typeof projects)[0];
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty("--spotlight-x", `${x}px`);
    cardRef.current.style.setProperty("--spotlight-y", `${y}px`);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15 }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        className="relative group rounded-2xl overflow-hidden h-full"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
        }}
      >
        {/* Spotlight */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: "radial-gradient(400px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(180, 0, 255, 0.06), transparent 60%)",
          }}
        />

        {/* Image placeholder */}
        <div className="relative h-44 bg-gradient-to-br from-neon-purple/5 to-neon-pink/5 flex items-center justify-center border-b border-card-border overflow-hidden">
          <div className="text-center">
            <div className="text-5xl mb-2 opacity-20">💻</div>
            <p className="text-white/20 font-mono text-xs">Screenshot projektu</p>
          </div>

          {/* Floating code decoration */}
          <div className="absolute top-3 left-3 font-mono text-[10px] text-white/10 leading-relaxed">
            <div>const app = new App();</div>
            <div>app.init();</div>
            <div>await app.run();</div>
          </div>
        </div>

        <div className="p-6 flex flex-col flex-1">
          <h3 className="text-xl font-bold mb-2 group-hover:text-neon-purple transition-colors">
            {project.title}
          </h3>
          <p className="text-white/50 text-sm leading-relaxed mb-4 flex-1">
            {project.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-5">
            {project.tech.map((t) => (
              <span
                key={t}
                className="px-2 py-1 text-xs rounded-md bg-white/5 text-white/50 border border-white/5"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="flex gap-3">
            <a
              href={project.github}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
            {project.live && (
              <a
                href={project.live}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/10 transition-all duration-200"
              >
                <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
                Live Demo
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Projects() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

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
            05 — Projekty Software
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
          {projects.map((project, index) => (
            <ProjectCard key={project.title} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
