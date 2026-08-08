"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

type Category = {
  title: string;
  colorVar: string;
  colorRgb: string;
  skills: string[];
};

const skillCategories: Category[] = [
  {
    title: "Frontend",
    colorVar: "var(--neon-cyan)",
    colorRgb: "0,240,255",
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
  },
  {
    title: "Backend",
    colorVar: "var(--neon-purple)",
    colorRgb: "180,0,255",
    skills: ["Python", "FastAPI", "Node.js", "PostgreSQL", "REST API", "Bramki płatnicze"],
  },
  {
    title: "Mobile",
    colorVar: "var(--neon-pink)",
    colorRgb: "255,0,128",
    skills: ["Kotlin", "React Native", "Expo", "Flutter"],
  },
  {
    title: "Robotyka",
    colorVar: "var(--neon-cyan)",
    colorRgb: "0,240,255",
    skills: ["Arduino", "ESP32", "STM32", "Raspberry Pi", "ROS", "C/C++", "Sensory & Aktuatory"],
  },
  {
    title: "Inżynieria",
    colorVar: "var(--neon-purple)",
    colorRgb: "180,0,255",
    skills: ["CAD/CAM", "3D Printing", "Prototypowanie", "Elektronika"],
  },
  {
    title: "Narzędzia",
    colorVar: "var(--neon-pink)",
    colorRgb: "255,0,128",
    skills: ["Git", "Docker", "Linux", "VS Code", "SEO"],
  },
];

// ── Category row ──────────────────────────────────────────────────────────
function CategoryRow({ category, index }: { category: Category; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group"
    >
      {/* Category label */}
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="font-mono text-xs font-bold tracking-widest uppercase"
          style={{ color: category.colorVar }}
        >
          {category.title}
        </span>
        <div className="flex-1 h-px ml-2" style={{ background: `rgba(${category.colorRgb},0.12)` }} />
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {category.skills.map((skill, i) => (
          <motion.span
            key={skill}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: index * 0.08 + i * 0.04, duration: 0.25 }}
            className="px-2.5 py-1 rounded-lg text-sm cursor-default transition-all duration-200 border"
            style={{
              borderColor: `rgba(${category.colorRgb},0.1)`,
              background: `rgba(${category.colorRgb},0.04)`,
              color: "rgba(255,255,255,0.5)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = `rgba(${category.colorRgb},0.35)`;
              el.style.background = `rgba(${category.colorRgb},0.1)`;
              el.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = `rgba(${category.colorRgb},0.1)`;
              el.style.background = `rgba(${category.colorRgb},0.04)`;
              el.style.color = "rgba(255,255,255,0.5)";
            }}
          >
            {skill}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function Skills() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="skills" className="relative py-32 px-4 overflow-hidden">
      {/* Background ambient blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-4 blur-[180px] pointer-events-none"
        style={{ background: "var(--neon-cyan)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-4 blur-[160px] pointer-events-none"
        style={{ background: "var(--neon-purple)" }} />

      <div ref={ref} className="max-w-6xl mx-auto">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <span className="text-neon-cyan font-mono text-sm tracking-widest uppercase">
            03 — Umiejętności
          </span>
        </motion.div>

        {/* Title */}
        <h2 className="text-4xl sm:text-5xl font-bold mb-4">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            Mój <span className="gradient-text">tech stack</span>
          </motion.span>
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="text-white/35 text-lg mb-12 max-w-xl"
        >
          Od frontendu po robotykę — narzędzia, które znam i których używam na co dzień.
        </motion.p>

        {/* Compact grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {skillCategories.map((category, index) => (
            <CategoryRow key={category.title} category={category} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
