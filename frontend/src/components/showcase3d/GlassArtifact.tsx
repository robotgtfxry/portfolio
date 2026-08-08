"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

/** Świecące bryły ZA szkłem — bez nich nie widać, że materiał naprawdę załamuje światło. */
function Backdrop({ calm }: { calm: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (!calm) group.current.rotation.z -= delta * 0.16;
    // Lekkie odchylenie w stronę kursora — scena reaguje, nawet gdy nic nie klikasz.
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      state.pointer.y * 0.25,
      0.05
    );
  });

  return (
    <group ref={group} position={[0, 0, -2.4]}>
      {[
        { pos: [-1.6, 0.9, 0], color: "#00f0ff", size: 0.26 },
        { pos: [1.7, -0.7, 0.4], color: "#b400ff", size: 0.32 },
        { pos: [0.4, 1.6, -0.3], color: "#ff006e", size: 0.2 },
        { pos: [-1.1, -1.5, 0.2], color: "#00f0ff", size: 0.18 },
        { pos: [2.0, 1.2, -0.5], color: "#ffffff", size: 0.14 },
      ].map((s, i) => (
        <mesh key={i} position={s.pos as [number, number, number]}>
          <sphereGeometry args={[s.size, 24, 24]} />
          <meshBasicMaterial color={s.color} toneMapped={false} />
        </mesh>
      ))}

      <mesh rotation={[0, 0, Math.PI / 6]}>
        <torusGeometry args={[2.4, 0.02, 12, 96]} />
        <meshBasicMaterial color="#00f0ff" toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function GlassArtifact({ calm = false }: { calm?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    if (!calm) {
      mesh.current.rotation.y += delta * 0.4;
      mesh.current.rotation.x += delta * 0.13;
    }
    const target = 1 + state.pointer.x * 0.06;
    mesh.current.scale.setScalar(THREE.MathUtils.lerp(mesh.current.scale.x, target, 0.08));
  });

  return (
    <>
      <Backdrop calm={calm} />

      <mesh ref={mesh}>
        <torusKnotGeometry args={[0.95, 0.36, 180, 32]} />
        <MeshTransmissionMaterial
          samples={6}
          resolution={256}
          thickness={0.75}
          roughness={0.05}
          transmission={1}
          ior={1.45}
          chromaticAberration={0.35}
          anisotropy={0.2}
          distortion={0.4}
          distortionScale={0.4}
          temporalDistortion={calm ? 0 : 0.15}
          backside
        />
      </mesh>

      <Environment resolution={256}>
        <Lightformer intensity={4} color="#00f0ff" position={[-4, 2, 3]} scale={7} />
        <Lightformer intensity={4} color="#b400ff" position={[4, -2, 3]} scale={7} />
        <Lightformer intensity={2} color="#ffffff" position={[0, 4, 4]} scale={5} />
      </Environment>
    </>
  );
}
