"use client";

import { useEffect } from "react";

const AWAY_FRAMES = [
  "( o_o ) halo?",
  "( o_O ) halo?",
  "( O_o ) halo?",
  "( -_- ) …",
  "( -_- ) zzz",
];

const BACK_TITLE = "( ^_^ ) o, jesteś!";
// Przegladarki i tak dlawia timery w ukrytych kartach do 1 klatki/s,
// wiec krotszy interwal dalby tylko nierowne tempo.
const FRAME_MS = 1000;
const BACK_MS = 1600;

export default function AwayTitle() {
  useEffect(() => {
    let original = document.title;
    // Czy tytul jest w tej chwili nasz? Chroni przed zapamietaniem klatki
    // animacji jako oryginalu, gdy ktos szybko przeskakuje miedzy kartami.
    let owned = false;
    let frame = 0;
    let cycle: ReturnType<typeof setInterval> | null = null;
    let restore: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (cycle) {
        clearInterval(cycle);
        cycle = null;
      }
      if (restore) {
        clearTimeout(restore);
        restore = null;
      }
    };

    const onVisibility = () => {
      clearTimers();

      if (document.hidden) {
        if (!owned) original = document.title;
        owned = true;
        frame = 0;
        document.title = AWAY_FRAMES[0];
        cycle = setInterval(() => {
          frame = (frame + 1) % AWAY_FRAMES.length;
          document.title = AWAY_FRAMES[frame];
        }, FRAME_MS);
        return;
      }

      owned = true;
      document.title = BACK_TITLE;
      restore = setTimeout(() => {
        document.title = original;
        owned = false;
        restore = null;
      }, BACK_MS);
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimers();
      if (owned) document.title = original;
    };
  }, []);

  return null;
}
