"use client";

import { Canvas } from "@react-three/fiber";
import ParticleField from "./ParticleField";

/**
 * Cały three.js siedzi w tym chunku. Showcase3D ładuje go dynamicznie,
 * więc wejście na stronę główną nie płaci za bibliotekę, której nikt jeszcze nie zobaczył.
 */
export default function Stage({ calm, active }: { calm: boolean; active: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      // Poza kadrem pętla renderowania stoi — zero pracy GPU przy scrollowaniu reszty strony.
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ParticleField calm={calm} />
    </Canvas>
  );
}
