"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Home",        href: "#hero",        icon: "⌂" },
  { label: "About",       href: "#about",       icon: "◉" },
  { label: "Experience",  href: "#experience",  icon: "★" },
  { label: "Skills",      href: "#skills",      icon: "◈" },
  { label: "Hardware",    href: "#robotics",    icon: "⚙" },
  { label: "Projects",    href: "#projects",    icon: "◻" },
  { label: "Contact",     href: "#contact",     icon: "✉" },
];

const socials = [
  {
    label: "GitHub",
    href: "https://github.com/robotgtfxry/",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/michal_jaksan/",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    label: "Email",
    href: "mailto:mijaksan@gmail.com",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
];

export default function Navigation() {
  const [activeSection, setActiveSection] = useState("hero");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.3 }
    );
    navItems.forEach(({ href }) => {
      const el = document.querySelector(href);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      setIsAtBottom(total - scrolled < 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.8, ease: "easeOut" }}
      /* max-w keeps pill from overflowing the viewport on narrow screens */
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-12px)]"
    >
      {/* Single pill that grows when at bottom */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-2 sm:py-3 rounded-2xl bg-[#111]/80 backdrop-blur-xl border border-white/5"
      >
        {/* Nav icons */}
        {navItems.map((item, index) => {
          const isActive = activeSection === item.href.slice(1);
          const isHovered = hoveredIndex === index;

          return (
            <a
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative flex flex-col items-center group"
            >
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0, y: 8, scale: 0.8 }}
                    animate={{ opacity: 1, y: -8, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.8 }}
                    className="absolute -top-8 text-xs font-medium text-neon-cyan whitespace-nowrap px-2 py-1 rounded-md bg-[#111]/90 border border-neon-cyan/20"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              <motion.div
                animate={{
                  scale: isHovered ? 1.3 : isActive ? 1.1 : 1,
                  y: isHovered ? -4 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-sm sm:text-lg transition-colors duration-300 cursor-pointer ${
                  isActive
                    ? "bg-neon-cyan/10 text-neon-cyan"
                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                {item.icon}
              </motion.div>

              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-neon-cyan"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </a>
          );
        })}

        {/* Separator + social icons — slide in when at bottom */}
        <AnimatePresence mode="popLayout">
          {isAtBottom && (
            <motion.div
              key="socials"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="flex items-center gap-0.5 sm:gap-1"
            >
              {/* Divider */}
              <div className="w-px h-5 sm:h-6 bg-white/10 mx-0.5 sm:mx-1 shrink-0" />

              {socials.map((s) => (
                <motion.a
                  key={s.label}
                  href={s.href}
                  target={s.href.startsWith("http") ? "_blank" : undefined}
                  rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  title={s.label}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  whileHover={{ scale: 1.2, y: -3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-white/40 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors duration-200 shrink-0"
                >
                  {s.icon}
                </motion.a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.nav>
  );
}
