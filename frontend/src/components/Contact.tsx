"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useInView } from "framer-motion";

function FuzzyText({ text, className }: { text: string; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-50px" });
  const [displayText, setDisplayText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const chars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  useEffect(() => {
    if (!isHovered) {
      setDisplayText(text);
      return;
    }

    const interval = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char) => {
            if (char === " ") return " ";
            if (Math.random() > 0.7) {
              return chars[Math.floor(Math.random() * chars.length)];
            }
            return char;
          })
          .join("")
      );
    }, 50);

    return () => clearInterval(interval);
  }, [isHovered, text]);

  return (
    <span
      ref={ref}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`cursor-default ${className}`}
    >
      {displayText}
    </span>
  );
}

function ClickSpark({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sparks, setSparks] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setSparks((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => s.id !== id));
    }, 600);
  }, []);

  return (
    <div ref={containerRef} onClick={handleClick} className="relative">
      {children}
      {sparks.map((spark) => (
        <div key={spark.id} className="absolute pointer-events-none" style={{ left: spark.x, top: spark.y }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                x: Math.cos((i * Math.PI * 2) / 8) * 40,
                y: Math.sin((i * Math.PI * 2) / 8) * 40,
                scale: [0, 1, 0],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: i % 2 === 0 ? "var(--neon-cyan)" : "var(--neon-purple)",
                boxShadow: `0 0 6px ${i % 2 === 0 ? "var(--neon-cyan)" : "var(--neon-purple)"}`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export default function Contact() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");
  const [status,  setStatus]  = useState<"idle" | "sending" | "ok" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setStatus("sending");

    const sessionId = sessionStorage.getItem("_pt_sid");

    try {
      const res = await fetch(`${BACKEND}/contact`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: sessionId, name, email, message }),
      });
      if (!res.ok) throw new Error("server error");
      setStatus("ok");
      setName(""); setEmail(""); setMessage("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="relative py-32 px-4">
      {/* Decorative threads/ribbons background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 0.03 } : {}}
            transition={{ delay: i * 0.2 }}
            className="absolute h-[1px] w-full"
            style={{
              top: `${20 + i * 15}%`,
              background: `linear-gradient(90deg, transparent, ${i % 2 === 0 ? "var(--neon-cyan)" : "var(--neon-purple)"}, transparent)`,
              transform: `rotate(${-2 + i * 1}deg)`,
            }}
          />
        ))}
      </div>

      <div ref={ref} className="max-w-4xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <span className="text-neon-cyan font-mono text-sm tracking-widest uppercase">
            06 — Kontakt
          </span>
        </motion.div>

        <h2 className="text-4xl sm:text-6xl font-bold mb-6">
          <FuzzyText
            text="Porozmawiajmy"
            className="gradient-text"
          />
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="text-white/40 text-lg mb-12 max-w-xl"
        >
          Masz pomysł na projekt? Chcesz współpracować? Napisz do mnie!
        </motion.p>

        <ClickSpark>
          <motion.form
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-6"
            onSubmit={handleSubmit}
          >
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-mono text-white/40 mb-2">Imię</label>
                <input
                  type="text"
                  placeholder="Jan Kowalski"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-card-bg border border-card-border text-white placeholder:text-white/20 focus:outline-none focus:border-neon-cyan/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-mono text-white/40 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="jan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-card-bg border border-card-border text-white placeholder:text-white/20 focus:outline-none focus:border-neon-cyan/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono text-white/40 mb-2">Wiadomość</label>
              <textarea
                rows={5}
                placeholder="Twoja wiadomość..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-card-bg border border-card-border text-white placeholder:text-white/20 focus:outline-none focus:border-neon-cyan/50 transition-colors resize-none"
              />
            </div>

            {/* Status messages */}
            {status === "ok" && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-neon-cyan font-mono text-sm"
              >
                ✓ Wiadomość wysłana! Odezwę się wkrótce.
              </motion.p>
            )}
            {status === "error" && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-neon-pink font-mono text-sm"
              >
                ✗ Błąd wysyłania. Spróbuj ponownie lub napisz bezpośrednio na email.
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={status === "sending" || status === "ok"}
              whileHover={{ scale: status === "sending" ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 rounded-xl font-medium text-background cursor-pointer relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))",
              }}
            >
              <span className="relative z-10">
                {status === "sending" ? "Wysyłanie…" : status === "ok" ? "Wysłano ✓" : "Wyślij wiadomość →"}
              </span>
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                }}
              />
            </motion.button>
          </motion.form>
        </ClickSpark>

        {/* Social links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6 }}
          className="mt-16 flex gap-4 justify-center"
        >
          {[
            { name: "GitHub", href: "https://github.com/robotgtfxry/", icon: (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            )},
            { name: "LinkedIn", href: "#", icon: (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            )},
            { name: "Email", href: "mailto:mijaksan@gmail.com", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            )},
          ].map((social) => (
            <motion.a
              key={social.name}
              href={social.href}
              target={social.href.startsWith("http") ? "_blank" : undefined}
              rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-card-bg border border-card-border text-white/50 hover:text-neon-cyan hover:border-neon-cyan/30 transition-colors duration-300"
            >
              {social.icon}
            </motion.a>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.8 }}
        className="mt-24 text-center text-white/20 text-sm font-mono"
      >
        <p>&copy; 2026 — Built with Next.js, Framer Motion & pasja</p>
      </motion.footer>
    </section>
  );
}
