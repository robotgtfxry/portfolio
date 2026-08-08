"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useInView } from "framer-motion";

// ── Rising Lines canvas background ────────────────────────────────────────
function RisingLines() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const R = 0, G = 240, B = 255; // neon-cyan
    const rgb = `${R},${G},${B}`;

    let W = 0, H = 0;
    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Particles (rising dots with trails) ─────────────────────────────
    type Particle = { x: number; y: number; vy: number; size: number; trail: number; alpha: number };
    const PARTICLE_COUNT = 90;
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vy: 0.4 + Math.random() * 1.1,
      size: 0.8 + Math.random() * 1.4,
      trail: 18 + Math.random() * 55,
      alpha: 0.15 + Math.random() * 0.55,
    }));

    // ── Laser beams (vertical glowing lines) ────────────────────────────
    type Beam = { x: number; lw: number; baseAlpha: number; phase: number; speed: number };
    const BEAM_COUNT = 9;
    const beams: Beam[] = Array.from({ length: BEAM_COUNT }, (_, i) => ({
      x: (i + 0.5) * (W / BEAM_COUNT) + (Math.random() - 0.5) * 60,
      lw: 0.6 + Math.random() * 1.2,
      baseAlpha: 0.04 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
    }));

    let raf: number;
    let t = 0;

    const draw = () => {
      t += 0.016;

      // Soft clear for particle trails
      ctx.fillStyle = "rgba(10,10,10,0.18)";
      ctx.fillRect(0, 0, W, H);

      // ── Horizon glow (bottom radial) ──────────────────────────────────
      const hGrad = ctx.createRadialGradient(W / 2, H, 20, W / 2, H, W * 0.75);
      hGrad.addColorStop(0, `rgba(${rgb},0.18)`);
      hGrad.addColorStop(0.45, `rgba(${rgb},0.055)`);
      hGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = hGrad;
      ctx.fillRect(0, 0, W, H);

      // ── Central halo beam ─────────────────────────────────────────────
      const haloW = 130;
      const haloGrad = ctx.createLinearGradient(W / 2 - haloW, 0, W / 2 + haloW, 0);
      haloGrad.addColorStop(0, "rgba(0,0,0,0)");
      haloGrad.addColorStop(0.5, `rgba(${rgb},0.035)`);
      haloGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haloGrad;
      ctx.fillRect(W / 2 - haloW, 0, haloW * 2, H);

      // ── Laser beams ───────────────────────────────────────────────────
      beams.forEach((b) => {
        const a = b.baseAlpha * (0.6 + 0.4 * Math.sin(t * b.speed + b.phase));
        const bGrad = ctx.createLinearGradient(0, 0, 0, H);
        bGrad.addColorStop(0, `rgba(${rgb},0)`);
        bGrad.addColorStop(0.25, `rgba(${rgb},${a * 0.5})`);
        bGrad.addColorStop(0.65, `rgba(${rgb},${a})`);
        bGrad.addColorStop(1, `rgba(${rgb},${a * 0.6})`);
        ctx.beginPath();
        ctx.strokeStyle = bGrad;
        ctx.lineWidth = b.lw;
        ctx.moveTo(b.x, 0);
        ctx.lineTo(b.x, H);
        ctx.stroke();
        // Gentle x drift
        b.x += Math.sin(t * 0.15 + b.phase) * 0.25;
        if (b.x < -10) b.x = W + 10;
        if (b.x > W + 10) b.x = -10;
      });

      // ── Rising particles ──────────────────────────────────────────────
      particles.forEach((p) => {
        p.y -= p.vy;
        if (p.y < -p.trail - 10) {
          p.y = H + 10;
          p.x = Math.random() * W;
          p.alpha = 0.15 + Math.random() * 0.55;
          p.vy = 0.4 + Math.random() * 1.1;
        }

        // Trail gradient (bright head, fades downward)
        const tGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.trail);
        tGrad.addColorStop(0, `rgba(${rgb},${p.alpha})`);
        tGrad.addColorStop(0.6, `rgba(${rgb},${p.alpha * 0.25})`);
        tGrad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.beginPath();
        ctx.strokeStyle = tGrad;
        ctx.lineWidth = p.size;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.trail);
        ctx.stroke();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.75 }} />
      {/* Fade top */}
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, #0a0a0a 0%, transparent 100%)" }} />
      {/* Fade bottom */}
      <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
        style={{ background: "linear-gradient(to top, #0a0a0a 0%, transparent 100%)" }} />
      {/* Fade left */}
      <div className="absolute inset-y-0 left-0 w-24 pointer-events-none"
        style={{ background: "linear-gradient(to right, #0a0a0a 0%, transparent 100%)" }} />
      {/* Fade right */}
      <div className="absolute inset-y-0 right-0 w-24 pointer-events-none"
        style={{ background: "linear-gradient(to left, #0a0a0a 0%, transparent 100%)" }} />
    </div>
  );
}

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

// ── Wskazniki stanu wysylki ───────────────────────────────────────────────
function Spinner() {
  return (
    <motion.svg
      className="w-4 h-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </motion.svg>
  );
}

function CheckMark() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <motion.path
        d="M4 12.5 L9.5 18 L20 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
    </svg>
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
  // Zamek na ref, nie na stanie: kilka zdarzen w tym samym ticku widzialoby
  // jeszcze stary `status` z domkniecia renderu i przepuscilo duplikaty.
  const submitLock = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    if (submitLock.current) return;
    submitLock.current = true;
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
      // Zamek zostaje zamkniety — wiadomosc juz poszla.
    } catch {
      setStatus("error");
      submitLock.current = false; // po bledzie mozna sprobowac ponownie
    }
  };

  return (
    <section id="contact" className="relative py-32 px-4 overflow-hidden">
      {/* Rising Lines canvas background */}
      <RisingLines />

      <div ref={ref} className="max-w-4xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <span className="text-neon-cyan font-mono text-sm tracking-widest uppercase">
            07 — Kontakt
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

            {/* Po sukcesie przycisk chowa sie razem z zajmowanym miejscem —
                ptaszek zdazy sie pokazac dzieki opoznieniu animacji. */}
            <motion.div
              className="overflow-hidden"
              initial={false}
              animate={
                status === "ok"
                  ? { opacity: 0, height: 0, transition: { delay: 1.2, duration: 0.35, ease: "easeIn" } }
                  : { opacity: 1, height: "auto", transition: { duration: 0.2 } }
              }
              style={{ pointerEvents: status === "ok" ? "none" : "auto" }}
            >
              <motion.button
                type="submit"
                disabled={status === "sending" || status === "ok"}
                whileHover={{ scale: status === "idle" || status === "error" ? 1.02 : 1 }}
                whileTap={{ scale: status === "idle" || status === "error" ? 0.98 : 1 }}
                className="px-8 py-4 rounded-xl font-medium text-background cursor-pointer relative overflow-hidden group disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))",
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {status === "sending" ? (
                    <>
                      <Spinner />
                      Wysyłanie…
                    </>
                  ) : status === "ok" ? (
                    <>
                      <CheckMark />
                      Wysłano
                    </>
                  ) : (
                    "Wyślij wiadomość →"
                  )}
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
            </motion.div>
          </motion.form>
        </ClickSpark>

      </div>
    </section>
  );
}
