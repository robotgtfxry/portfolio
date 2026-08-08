"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  Lightformer,
  PresentationControls,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";

export type Finish = {
  color: string;
  metalness: number;
  roughness: number;
};

/**
 * Scena „konfiguratora produktu" — dokładnie ten schemat, którego sklepy używają
 * do prezentacji wariantów towaru: obrót przeciąganiem, materiał sterowany z UI.
 */
export default function Configurator({
  finish,
  accent,
  calm = false,
}: {
  finish: Finish;
  accent: string;
  calm?: boolean;
}) {
  const ring = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!calm && ring.current) ring.current.rotation.z += delta * 0.35;
  });

  return (
    <>
      <PresentationControls
        global
        cursor
        snap
        speed={1.4}
        zoom={1}
        rotation={[0.1, -0.35, 0]}
        polar={[-0.5, 0.5]}
        azimuth={[-0.9, 0.9]}
      >
        <Float
          speed={calm ? 0 : 1.6}
          rotationIntensity={calm ? 0 : 0.25}
          floatIntensity={calm ? 0 : 0.5}
        >
          <RoundedBox args={[1.7, 1.7, 1.7]} radius={0.28} smoothness={8} castShadow>
            <meshStandardMaterial
              color={finish.color}
              metalness={finish.metalness}
              roughness={finish.roughness}
              envMapIntensity={1.1}
            />
          </RoundedBox>

          {/* Pierścień akcentowy — świeci własnym kolorem niezależnie od materiału obudowy. */}
          <mesh ref={ring} rotation={[Math.PI / 2.4, 0, 0]}>
            <torusGeometry args={[1.45, 0.035, 16, 128]} />
            <meshStandardMaterial
              color={accent}
              emissive={accent}
              emissiveIntensity={2.4}
              toneMapped={false}
            />
          </mesh>
        </Float>
      </PresentationControls>

      <ContactShadows position={[0, -1.5, 0]} opacity={0.55} scale={9} blur={2.6} far={4} />

      {/* Środowisko budowane z własnych świateł — bez pobierania HDRI z zewnętrznego CDN. */}
      <Environment resolution={256}>
        <Lightformer intensity={3} color="#00f0ff" position={[-5, 2, -4]} scale={9} />
        <Lightformer intensity={3} color="#b400ff" position={[5, -1, -4]} scale={9} />
        <Lightformer intensity={2} color="#ffffff" position={[0, 5, 2]} scale={7} />
        <Lightformer intensity={1.2} color="#ff006e" position={[0, -4, 3]} scale={6} />
      </Environment>
    </>
  );
}
