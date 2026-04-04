"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const skillCategories = [
  {
    title: "Frontend",
    color: "var(--neon-cyan)",
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
  },
  {
    title: "Backend",
    color: "var(--neon-purple)",
    skills: ["Python", "FastAPI", "Node.js", "PostgreSQL", "REST API"],
  },
  {
    title: "Robotyka",
    color: "var(--neon-pink)",
    skills: ["Arduino", "Raspberry Pi", "ROS", "C/C++", "Sensory & Aktuatory"],
  },
  {
    title: "Inżynieria",
    color: "var(--neon-cyan)",
    skills: ["CAD/CAM", "3D Printing", "Projektowanie", "Prototypowanie", "Elektronika"],
  },
  {
    title: "Narzędzia",
    color: "var(--neon-purple)",
    skills: ["Git", "Docker", "Linux", "VS Code", "Figma"],
  },
];

function SkillCard({
  category,
  index,
}: {
  category: (typeof skillCategories)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="relative group"
    >
      {/* Star border effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${category.color}22, transparent, ${category.color}22)`,
          }}
        />
      </div>

      <div className="relative p-6 rounded-2xl bg-card-bg border border-card-border hover:border-white/10 transition-colors duration-300">
        <div
          className="text-sm font-mono font-bold tracking-wider uppercase mb-4"
          style={{ color: category.color }}
        >
          {category.title}
        </div>

        <div className="flex flex-wrap gap-2">
          {category.skills.map((skill, i) => (
            <motion.span
              key={skill}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: index * 0.1 + i * 0.05, duration: 0.3 }}
              className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-white/70 border border-white/5 hover:border-white/20 hover:text-white transition-all duration-200"
            >
              {skill}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedCounter({
  value,
  label,
  suffix = "",
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="text-center"
    >
      <motion.div
        className="text-5xl sm:text-6xl font-bold gradient-text"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
      >
        <motion.span
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          {value}{suffix}
        </motion.span>
      </motion.div>
      <p className="text-white/40 mt-2 text-sm font-mono">{label}</p>
    </motion.div>
  );
}

export default function Skills() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="skills" className="relative py-32 px-4">
      <div ref={ref} className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <span className="text-neon-cyan font-mono text-sm tracking-widest uppercase">
            02 — Umiejętności
          </span>
        </motion.div>

        <h2 className="text-4xl sm:text-5xl font-bold mb-16">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            Mój <span className="gradient-text">tech stack</span>
          </motion.span>
        </h2>

        {/* Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <AnimatedCounter value={5} suffix="+" label="Technologii" />
          <AnimatedCounter value={10} suffix="+" label="Projektów" />
          <AnimatedCounter value={3} suffix="+" label="Robotów" />
          <AnimatedCounter value={100} suffix="%" label="Pasji" />
        </div>

        {/* Skills grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {skillCategories.map((category, index) => (
            <SkillCard key={category.title} category={category} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
