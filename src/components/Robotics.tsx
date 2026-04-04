"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const robots = [
  {
    name: "Robot #1",
    description: "Opis Twojego pierwszego robota — co robi, jakie technologie wykorzystuje, co było największym wyzwaniem.",
    tech: ["Arduino", "C++", "Sensory", "3D Print"],
    status: "Ukończony",
  },
  {
    name: "Robot #2",
    description: "Opis drugiego robota — autonomiczna nawigacja, sterowanie, komunikacja.",
    tech: ["Raspberry Pi", "Python", "ROS", "LIDAR"],
    status: "Ukończony",
  },
  {
    name: "Robot #3",
    description: "Opis trzeciego robota — najnowszy projekt, aktualnie w budowie.",
    tech: ["ESP32", "MicroPython", "PCB Design", "CAD"],
    status: "W trakcie",
  },
];

function SpotlightCard({
  robot,
  index,
}: {
  robot: (typeof robots)[0];
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-50px" });

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
      ref={sectionRef}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15 }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        className="relative group rounded-2xl overflow-hidden cursor-default"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
        }}
      >
        {/* Spotlight effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: "radial-gradient(400px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(0, 240, 255, 0.06), transparent 60%)",
          }}
        />

        {/* Image placeholder */}
        <div className="relative h-48 bg-gradient-to-br from-neon-cyan/5 to-neon-purple/5 flex items-center justify-center border-b border-card-border">
          <div className="text-center">
            <div className="text-5xl mb-2 opacity-30">🤖</div>
            <p className="text-white/20 font-mono text-xs">Zdjęcie robota</p>
          </div>

          {/* Status badge */}
          <div className="absolute top-4 right-4">
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
                robot.status === "Ukończony"
                  ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"
                  : "bg-neon-pink/10 text-neon-pink border border-neon-pink/20"
              }`}
            >
              {robot.status}
            </span>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-bold mb-2 group-hover:text-neon-cyan transition-colors">
            {robot.name}
          </h3>
          <p className="text-white/50 text-sm leading-relaxed mb-4">
            {robot.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {robot.tech.map((t) => (
              <span
                key={t}
                className="px-2 py-1 text-xs rounded-md bg-white/5 text-white/50 border border-white/5"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Electric border on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none electric-border" />
      </div>
    </motion.div>
  );
}

export default function Robotics() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="robotics" className="relative py-32 px-4">
      {/* Background accent */}
      <div className="absolute top-1/2 left-0 w-96 h-96 rounded-full opacity-5 blur-[150px]"
        style={{ background: "var(--neon-cyan)" }} />

      <div ref={ref} className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <span className="text-neon-cyan font-mono text-sm tracking-widest uppercase">
            03 — Robotyka
          </span>
        </motion.div>

        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            Moje <span className="gradient-text">roboty</span>
          </motion.span>
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="text-white/40 text-lg mb-16 max-w-2xl"
        >
          Od pomysłu, przez projekt, po działający prototyp — każdy robot to historia rozwiązywania problemów.
        </motion.p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {robots.map((robot, index) => (
            <SpotlightCard key={robot.name} robot={robot} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
