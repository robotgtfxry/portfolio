"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

type EngineeringProject = {
  title: string;
  category: string;
  description: string;
  tools: string[];
  /** Link zewnętrzny — np. artykuł prasowy o projekcie. */
  url?: string;
  urlLabel?: string;
};

const engineeringProjects: EngineeringProject[] = [
  {
    title: "Silnik jonowy dla nanosatelitów",
    category: "Kosmonautyka",
    description:
      "Napęd elektrostatyczny dla CubeSatów — bez paliwa chemicznego i bez części ruchomych. Zwycięzca VII edycji Akademii ProtoLab (PCINN).",
    tools: ["CubeSat", "Napęd jonowy", "Elektrostatyka"],
    url: "https://rzeszow-news.pl/vii-edycja-akademii-protolab-juz-za-nami-zwyciezyl-silnik-jonowy-dla-nanosatelitow/",
    urlLabel: "Artykuł w Rzeszów News",
  },
  {
    title: "Projekt Inżynieryjny #1",
    category: "Mechanika",
    description: "Opis projektu inżynieryjnego — co zaprojektowałeś, jakie problemy rozwiązałeś.",
    tools: ["SolidWorks", "3D Print", "CNC"],
  },
  {
    title: "Projekt Inżynieryjny #2",
    category: "Elektronika",
    description: "Opis projektu elektronicznego — PCB, układy, systemy embedded.",
    tools: ["KiCad", "PCB Design", "Oscyloskop"],
  },
  {
    title: "Projekt Design #1",
    category: "Design",
    description: "Opis projektu designerskiego — co zaprojektowałeś, jaki problem rozwiązuje.",
    tools: ["Figma", "Blender", "Fusion 360"],
  },
  {
    title: "Projekt Inżynieryjny #3",
    category: "Automatyka",
    description: "Opis projektu automatyzacji — systemy sterowania, czujniki, logika.",
    tools: ["PLC", "Python", "Sensory"],
  },
];

function TiltedCard({
  project,
  index,
}: {
  project: EngineeringProject;
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-50px" });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -10, y: x * 10 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const categoryColors: Record<string, string> = {
    Mechanika: "var(--neon-cyan)",
    Elektronika: "var(--neon-purple)",
    Design: "var(--neon-pink)",
    Automatyka: "var(--neon-cyan)",
    Kosmonautyka: "var(--neon-pink)",
  };

  return (
    <motion.div
      ref={sectionRef}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.12 }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ transformPerspective: 800 }}
        className="relative group rounded-2xl overflow-hidden cursor-default"
      >
        <div className="p-6 bg-card-bg border border-card-border rounded-2xl hover:border-white/10 transition-colors duration-300">
          {/* Image placeholder */}
          <div className="relative h-40 mb-5 rounded-xl bg-gradient-to-br from-white/[0.02] to-white/[0.05] flex items-center justify-center overflow-hidden">
            <div className="text-center">
              <div className="text-4xl mb-1 opacity-20">📐</div>
              <p className="text-white/20 font-mono text-xs">Zdjęcie projektu</p>
            </div>

            {/* Glare effect on hover */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: `linear-gradient(${135 + tilt.y * 5}deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)`,
              }}
            />
          </div>

          <span
            className="text-xs font-mono font-bold tracking-wider uppercase"
            style={{ color: categoryColors[project.category] }}
          >
            {project.category}
          </span>

          <h3 className="text-lg font-bold mt-2 mb-2 group-hover:text-white transition-colors">
            {project.title}
          </h3>

          <p className="text-white/40 text-sm leading-relaxed mb-4">
            {project.description}
          </p>

          <div className="flex flex-wrap gap-2">
            {project.tools.map((tool) => (
              <span
                key={tool}
                className="px-2 py-1 text-xs rounded-md bg-white/5 text-white/50 border border-white/5"
              >
                {tool}
              </span>
            ))}
          </div>

          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono text-neon-cyan underline underline-offset-4 decoration-neon-cyan/30 hover:text-neon-purple hover:decoration-neon-purple/50 transition-colors"
            >
              {project.urlLabel ?? "Zobacz więcej"} ↗
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Engineering() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="engineering" className="relative py-32 px-4">
      {/* Background accent */}
      <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full opacity-5 blur-[150px]"
        style={{ background: "var(--neon-purple)" }} />

      <div ref={ref} className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <span className="text-neon-cyan font-mono text-sm tracking-widest uppercase">
            04 — Inżynieria & Design
          </span>
        </motion.div>

        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            Projekty <span className="gradient-text">inżynieryjne</span>
          </motion.span>
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="text-white/40 text-lg mb-16 max-w-2xl"
        >
          Od koncepcji po gotowy produkt — projekty łączące inżynierię mechaniczną, elektronikę i design.
        </motion.p>

        <div className="grid sm:grid-cols-2 gap-6">
          {engineeringProjects.map((project, index) => (
            <TiltedCard key={project.title} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
