"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      <motion.div
        animate={{
          x: [0, 30, -20, 15, 0],
          y: [0, -50, 20, 35, 0],
          rotate: [0, 3, -2, 1, 0],
          scale: [1, 1.05, 0.95, 1.02, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-30 blur-[120px]"
        style={{
          background: "radial-gradient(circle, var(--neon-cyan) 0%, transparent 70%)",
        }}
      />
      <motion.div
        animate={{
          x: [0, -40, 25, -15, 0],
          y: [0, 30, -40, 20, 0],
          rotate: [0, -3, 2, -1, 0],
          scale: [1, 0.95, 1.08, 0.98, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-25 blur-[120px]"
        style={{
          background: "radial-gradient(circle, var(--neon-purple) 0%, transparent 70%)",
        }}
      />
      <motion.div
        animate={{
          x: [0, 20, -30, 10, 0],
          y: [0, -20, 30, -15, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full opacity-15 blur-[100px]"
        style={{
          background: "radial-gradient(circle, var(--neon-pink) 0%, transparent 70%)",
        }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

function DecryptedText({ text, className }: { text: string; className?: string }) {
  const [displayText, setDisplayText] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(true);
  const chars = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      if (iteration >= text.length) {
        clearInterval(interval);
        setIsDecrypting(false);
      }
      iteration += 1 / 3;
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className={`font-mono ${className}`}>
      {displayText}
      {isDecrypting && (
        <span className="inline-block w-[2px] h-[1em] bg-neon-cyan ml-1 animate-pulse" />
      )}
    </span>
  );
}

function SplitTextAnimation({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 40, rotateX: -90 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.6,
            delay: delay + i * 0.04,
            ease: [0.215, 0.61, 0.355, 1],
          }}
          className="inline-block"
          style={{ display: char === " " ? "inline" : "inline-block" }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

function ShinyButton({ children, href }: { children: React.ReactNode; href: string }) {
  const btnRef = useRef<HTMLAnchorElement>(null);

  return (
    <motion.a
      ref={btnRef}
      href={href}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium text-background overflow-hidden group cursor-pointer"
      style={{
        background: "linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))",
      }}
    >
      <span className="relative z-10">{children}</span>
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
        }}
      />
    </motion.a>
  );
}

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <section id="hero" className="relative min-h-screen" />;

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AuroraBackground />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <span className="inline-block px-4 py-2 rounded-full border border-neon-cyan/20 text-neon-cyan text-sm font-mono tracking-wider">
            &lt;PORTFOLIO /&gt;
          </span>
        </motion.div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-6">
          <SplitTextAnimation text="Cześć, jestem" className="block text-foreground" delay={0.3} />
          <SplitTextAnimation
            text="Michał"
            className="block gradient-text mt-2"
            delay={0.8}
          />
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="text-xl sm:text-2xl md:text-3xl text-white/60 mb-4 font-mono"
        >
          <DecryptedText text="Developer • Engineer • Builder" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.8 }}
          className="text-lg text-white/40 mb-10 max-w-2xl mx-auto"
        >
          Buduję roboty, projektuję rozwiązania inżynieryjne i tworzę oprogramowanie.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.3, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <ShinyButton href="#projects">
            Zobacz projekty →
          </ShinyButton>
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium border border-white/10 text-white/70 hover:text-white hover:border-neon-cyan/30 transition-all duration-300 cursor-pointer"
          >
            Kontakt
          </motion.a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2"
          >
            <motion.div
              animate={{ opacity: [0.2, 1, 0.2], y: [0, 6, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1 h-2 rounded-full bg-neon-cyan"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
