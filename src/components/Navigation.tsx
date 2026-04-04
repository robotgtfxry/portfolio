"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Home", href: "#hero", icon: "⌂" },
  { label: "About", href: "#about", icon: "◉" },
  { label: "Skills", href: "#skills", icon: "◈" },
  { label: "Robotics", href: "#robotics", icon: "⚙" },
  { label: "Engineering", href: "#engineering", icon: "△" },
  { label: "Projects", href: "#projects", icon: "◻" },
  { label: "Contact", href: "#contact", icon: "✉" },
];

export default function Navigation() {
  const [activeSection, setActiveSection] = useState("hero");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    navItems.forEach((item) => {
      const el = document.querySelector(item.href);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.8, ease: "easeOut" }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl bg-[#111]/80 backdrop-blur-xl border border-white/5">
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
                className={`
                  w-10 h-10 flex items-center justify-center rounded-xl text-lg
                  transition-colors duration-300 cursor-pointer
                  ${isActive
                    ? "bg-neon-cyan/10 text-neon-cyan"
                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                  }
                `}
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
      </div>
    </motion.nav>
  );
}
