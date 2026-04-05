"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useInView } from "framer-motion";

type Skill = { name: string; icon: string };

type Category = {
  title: string;
  icon: string;
  colorVar: string;
  colorRgb: string;
  skills: Skill[];
  span?: string;
};

const skillCategories: Category[] = [
  {
    title: "Frontend",
    icon: "⚡",
    colorVar: "var(--neon-cyan)",
    colorRgb: "0,240,255",
    span: "md:col-span-2",
    skills: [
      { name: "React",         icon: "⚛" },
      { name: "Next.js",       icon: "▲" },
      { name: "TypeScript",    icon: "TS" },
      { name: "Tailwind CSS",  icon: "🌊" },
      { name: "Framer Motion", icon: "🎞" },
    ],
  },
  {
    title: "Backend",
    icon: "🔧",
    colorVar: "var(--neon-purple)",
    colorRgb: "180,0,255",
    skills: [
      { name: "Python",    icon: "🐍" },
      { name: "FastAPI",   icon: "🚀" },
      { name: "Node.js",   icon: "🟩" },
      { name: "PostgreSQL",icon: "🐘" },
      { name: "REST API",  icon: "🔌" },
    ],
  },
  {
    title: "Mobile",
    icon: "📱",
    colorVar: "var(--neon-pink)",
    colorRgb: "255,0,128",
    skills: [
      { name: "Swift",        icon: "🦅" },
      { name: "SwiftUI",      icon: "🍎" },
      { name: "Kotlin",       icon: "🎯" },
      { name: "React Native", icon: "⚛" },
      { name: "Expo",         icon: "📦" },
    ],
  },
  {
    title: "Robotyka",
    icon: "🤖",
    colorVar: "var(--neon-cyan)",
    colorRgb: "0,240,255",
    skills: [
      { name: "Arduino",             icon: "🔵" },
      { name: "Raspberry Pi",        icon: "🍓" },
      { name: "ROS",                 icon: "🌀" },
      { name: "C/C++",               icon: "⚙" },
      { name: "Sensory & Aktuatory", icon: "📡" },
    ],
  },
  {
    title: "Inżynieria",
    icon: "🛠",
    colorVar: "var(--neon-purple)",
    colorRgb: "180,0,255",
    skills: [
      { name: "CAD/CAM",        icon: "📐" },
      { name: "3D Printing",    icon: "🖨" },
      { name: "Prototypowanie", icon: "🔩" },
      { name: "Elektronika",    icon: "⚡" },
    ],
  },
  {
    title: "Narzędzia",
    icon: "🗂",
    colorVar: "var(--neon-pink)",
    colorRgb: "255,0,128",
    span: "md:col-span-2",
    skills: [
      { name: "Git",    icon: "🌿" },
      { name: "Docker", icon: "🐳" },
      { name: "Linux",  icon: "🐧" },
      { name: "VS Code",icon: "💙" },
      { name: "Figma",  icon: "🎨" },
    ],
  },
];

const allSkills = skillCategories.flatMap((c) => c.skills.map((s) => s.name));

// ── Marquee strip ──────────────────────────────────────────────────────────
function Marquee() {
  const doubled = [...allSkills, ...allSkills];
  return (
    <div className="relative overflow-hidden py-4 mt-16">
      {/* fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, #0a0a0a, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, #0a0a0a, transparent)" }} />

      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="flex gap-4 w-max"
      >
        {doubled.map((skill, i) => (
          <span
            key={i}
            className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-mono border border-white/8 bg-white/4 text-white/40 hover:text-white hover:border-neon-cyan/30 hover:bg-neon-cyan/5 transition-all duration-300 cursor-default"
          >
            {skill}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Stat counter ───────────────────────────────────────────────────────────
function Stat({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const timer = setTimeout(() => {
      let start = 0;
      const step = Math.ceil(value / 40);
      const interval = setInterval(() => {
        start = Math.min(start + step, value);
        setCount(start);
        if (start >= value) clearInterval(interval);
      }, 30);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [isInView, value, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="text-center"
    >
      <div className="text-4xl sm:text-5xl font-bold gradient-text tabular-nums">
        {count}{suffix}
      </div>
      <p className="text-white/35 text-xs font-mono mt-1 tracking-wider uppercase">{label}</p>
    </motion.div>
  );
}

// ── Bento skill card ───────────────────────────────────────────────────────
function BentoCard({ category, index }: { category: Category; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const wrapRef = useRef(null);
  const isInView = useInView(wrapRef, { once: true, margin: "-40px" });
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  return (
    <motion.div
      ref={wrapRef}
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.55, delay: index * 0.08 }}
      className={category.span ?? ""}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="relative h-full rounded-2xl overflow-hidden group cursor-default border border-white/6 hover:border-white/12 transition-colors duration-500"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        {/* Spotlight */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(280px circle at ${mouse.x}% ${mouse.y}%, rgba(${category.colorRgb},0.08), transparent 70%)`,
          }}
        />

        {/* Corner glow */}
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none"
          style={{ background: `rgba(${category.colorRgb},0.25)` }}
        />

        {/* Animated gradient border on hover */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, rgba(${category.colorRgb},0.15) 0%, transparent 50%, rgba(${category.colorRgb},0.06) 100%)`,
          }}
        />

        <div className="relative p-6 h-full flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border"
              style={{
                background: `rgba(${category.colorRgb},0.1)`,
                borderColor: `rgba(${category.colorRgb},0.2)`,
                boxShadow: `0 0 20px rgba(${category.colorRgb},0.1)`,
              }}
            >
              {category.icon}
            </div>
            <span
              className="font-mono text-sm font-bold tracking-widest uppercase"
              style={{ color: category.colorVar }}
            >
              {category.title}
            </span>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-2">
            {category.skills.map((skill, i) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: index * 0.08 + i * 0.06, duration: 0.3 }}
                className="group/pill relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-300 cursor-default"
                style={{
                  borderColor: `rgba(${category.colorRgb},0.12)`,
                  background: `rgba(${category.colorRgb},0.04)`,
                  color: "rgba(255,255,255,0.55)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = `rgba(${category.colorRgb},0.4)`;
                  el.style.background = `rgba(${category.colorRgb},0.12)`;
                  el.style.color = "#fff";
                  el.style.boxShadow = `0 0 12px rgba(${category.colorRgb},0.2)`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = `rgba(${category.colorRgb},0.12)`;
                  el.style.background = `rgba(${category.colorRgb},0.04)`;
                  el.style.color = "rgba(255,255,255,0.55)";
                  el.style.boxShadow = "none";
                }}
              >
                <span className="text-xs leading-none">{skill.icon}</span>
                <span>{skill.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
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
            04 — Umiejętności
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

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-14 p-6 rounded-2xl border border-white/6 bg-white/2"
        >
          <Stat value={6}   suffix="+"  label="Kategorii"   delay={0.4} />
          <Stat value={30}  suffix="+"  label="Technologii"  delay={0.5} />
          <Stat value={10}  suffix="+"  label="Projektów"    delay={0.6} />
          <Stat value={100} suffix="%"  label="Pasji"        delay={0.7} />
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {skillCategories.map((category, index) => (
            <BentoCard key={category.title} category={category} index={index} />
          ))}
        </div>

        {/* Marquee */}
        <Marquee />
      </div>
    </section>
  );
}
