"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __portfolioConsoleGreeting?: boolean;
  }
}

const BG = "#0a0a0a";
const CYAN = "#00f0ff";
const PINK = "#ff006e";
const PURPLE = "#b400ff";

export default function ConsoleGreeting() {
  useEffect(() => {
    // W dev StrictMode montuje komponent dwa razy — banner ma polecieć raz.
    if (window.__portfolioConsoleGreeting) return;
    window.__portfolioConsoleGreeting = true;

    const base = `background:${BG};padding:6px 14px;border-left:3px solid ${PURPLE};font-family:monospace;`;
    const tag = "color:#0a0a0a;padding:4px 10px;border-radius:3px;font-weight:700;";

    console.log(
      "%cCześć 👋 widzę, że zaglądasz pod maskę.",
      `${base}color:${CYAN};font-size:20px;font-weight:700;`
    );
    console.log(
      "%cJeśli podoba Ci się to, co tu widzisz — pogadajmy.",
      `${base}color:#f0f0f0;font-size:13px;`
    );
    console.log(
      "%c mijaksan@gmail.com %c github.com/robotgtfxry ",
      `background:${CYAN};${tag}`,
      `background:${PINK};${tag}margin-left:6px;`
    );
    console.log(
      "%cStack: Next.js 16 · React 19 · TypeScript · Tailwind 4 · Framer Motion · React Three Fiber",
      "color:#888;font-size:11px;font-family:monospace;"
    );
  }, []);

  return null;
}
