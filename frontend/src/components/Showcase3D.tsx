"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useInView } from "framer-motion";

const Stage = dynamic(() => import("./showcase3d/Stage"), {
  ssr: false,
  loading: () => <StageSkeleton />,
});

function StageSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-neon-cyan/20 border-t-neon-cyan animate-spin" />
    </div>
  );
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export default function Showcase3D() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-50px" });
  // Osobny obserwator bez `once` — steruje pętlą renderowania, żeby GPU stało, gdy scena jest poza kadrem.
  const stageVisible = useInView(stageRef, { margin: "100px" });

  const [calm, setCalm] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    setSupported(hasWebGL());

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setCalm(mq.matches);
    const onChange = () => setCalm(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Scena montuje się dopiero, gdy sekcja wjedzie w kadr — three.js nie obciąża startu strony.
  useEffect(() => {
    if (isInView) setArmed(true);
  }, [isInView]);

  return (
    <section id="showcase3d" className="relative py-24 sm:py-32 overflow-x-hidden">
      <div
        className="absolute top-1/3 right-0 w-96 h-96 rounded-full opacity-5 blur-[150px] pointer-events-none"
        style={{ background: "var(--neon-purple)" }}
      />

      <div ref={sectionRef} className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <span className="text-neon-cyan font-mono text-sm tracking-widest uppercase">
            06 — Interaktywne 3D
          </span>
        </motion.div>

        <h2 className="text-4xl sm:text-5xl font-bold">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            Web, którego nie widać <span className="gradient-text">na zrzucie ekranu</span>
          </motion.span>
        </h2>
      </div>

      {/* Scena bez ramki — cząsteczki lecą wprost na tle strony, na pełną szerokość. */}
      <motion.div
        ref={stageRef}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="relative mt-6 w-full h-[60vh] min-h-[380px] touch-none"
      >
        {supported === false ? (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
            <p className="text-white/40 text-sm">
              Twoja przeglądarka nie udostępnia WebGL, więc scena 3D nie może się uruchomić.
              Reszta strony działa normalnie.
            </p>
          </div>
        ) : armed && supported ? (
          <Stage calm={calm} active={stageVisible} />
        ) : (
          <StageSkeleton />
        )}
      </motion.div>
    </section>
  );
}
