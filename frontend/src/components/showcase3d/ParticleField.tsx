"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 22000;
const CYCLE = 5.5; // sekundy na jedno przejście między kształtami

/** Rozkład Fibonacciego — równomiernie rozłożone punkty na sferze. */
function sphere(i: number, n: number, out: THREE.Vector3) {
  const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  const r = 1.55;
  out.set(
    Math.cos(theta) * Math.sin(phi) * r,
    Math.sin(theta) * Math.sin(phi) * r,
    Math.cos(phi) * r
  );
}

/** Węzeł torusowy (2,3) z losowym rozrzutem wokół krzywej, żeby miał objętość. */
function torusKnot(i: number, n: number, out: THREE.Vector3) {
  const t = (i / n) * Math.PI * 2;
  const p = 2;
  const q = 3;
  const r = 0.55 * (2 + Math.cos(q * t));
  const jitter = 0.16;
  out.set(
    r * Math.cos(p * t) + (Math.random() - 0.5) * jitter,
    r * Math.sin(p * t) + (Math.random() - 0.5) * jitter,
    0.55 * Math.sin(q * t) + (Math.random() - 0.5) * jitter
  );
}

/** Siatka falująca — czytelnie pokazuje, że to naprawdę przestrzeń 3D, a nie płaski efekt. */
function wave(i: number, n: number, out: THREE.Vector3) {
  const side = Math.ceil(Math.sqrt(n));
  const gx = (i % side) / side - 0.5;
  const gz = Math.floor(i / side) / side - 0.5;
  out.set(gx * 4.4, Math.sin(gx * 9) * Math.cos(gz * 9) * 0.42, gz * 4.4);
}

const VERT = /* glsl */ `
  uniform float uTime;
  uniform vec3  uWeights;
  uniform vec3  uMouse;
  uniform float uPixelRatio;
  uniform float uCalm;

  attribute vec3  aPos0;
  attribute vec3  aPos1;
  attribute vec3  aPos2;
  attribute float aRand;

  varying float vRand;
  varying float vPush;

  void main() {
    // Mieszanka trzech kształtów — wagi liczone po stronie JS.
    vec3 pos = aPos0 * uWeights.x + aPos1 * uWeights.y + aPos2 * uWeights.z;

    // Delikatny oddech, żeby chmura nigdy nie wyglądała na zamrożoną.
    float w = aRand * 6.2831853;
    pos += uCalm * 0.05 * vec3(sin(uTime * 0.7 + w), cos(uTime * 0.6 + w), sin(uTime * 0.5 + w));

    // Odpychanie od kursora.
    vec3 away = pos - uMouse;
    float dist = length(away);
    float force = smoothstep(1.15, 0.0, dist);
    pos += normalize(away + 1e-5) * force * 0.75;
    vPush = force;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (7.0 + aRand * 5.0) * uPixelRatio * (1.0 / max(-mv.z, 0.001));
    vRand = aRand;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorHot;

  varying float vRand;
  varying float vPush;

  void main() {
    // Okrągły, miękko wygaszony punkt zamiast kwadratu.
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.08, d);

    vec3 col = mix(uColorA, uColorB, vRand);
    col = mix(col, uColorHot, vPush);        // rozgrzewa się pod kursorem
    gl_FragColor = vec4(col, alpha * 0.85);
  }
`;

export default function ParticleField({ calm = false }: { calm?: boolean }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  const mouseWorld = useRef(new THREE.Vector3(999, 999, 999));
  const scratch = useRef(new THREE.Vector3());

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const p0 = new Float32Array(COUNT * 3);
    const p1 = new Float32Array(COUNT * 3);
    const p2 = new Float32Array(COUNT * 3);
    const rand = new Float32Array(COUNT);
    const v = new THREE.Vector3();

    for (let i = 0; i < COUNT; i++) {
      sphere(i, COUNT, v);
      p0.set([v.x, v.y, v.z], i * 3);
      torusKnot(i, COUNT, v);
      p1.set([v.x, v.y, v.z], i * 3);
      wave(i, COUNT, v);
      p2.set([v.x, v.y, v.z], i * 3);
      rand[i] = Math.random();
    }

    // position jest wymagane przez three, ale realne współrzędne liczy vertex shader.
    geo.setAttribute("position", new THREE.BufferAttribute(p0.slice(), 3));
    geo.setAttribute("aPos0", new THREE.BufferAttribute(p0, 3));
    geo.setAttribute("aPos1", new THREE.BufferAttribute(p1, 3));
    geo.setAttribute("aPos2", new THREE.BufferAttribute(p2, 3));
    geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);
    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWeights: { value: new THREE.Vector3(1, 0, 0) },
      uMouse: { value: new THREE.Vector3(999, 999, 999) },
      uPixelRatio: { value: 1 },
      uCalm: { value: calm ? 0 : 1 },
      uColorA: { value: new THREE.Color("#00f0ff") },
      uColorB: { value: new THREE.Color("#b400ff") },
      uColorHot: { value: new THREE.Color("#ff006e") },
    }),
    [calm]
  );

  useFrame((state, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;

    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.gl.getPixelRatio();

    // Kursor rzutowany na płaszczyznę z = 0.
    const { pointer, camera } = state;
    if (pointer.x !== 0 || pointer.y !== 0) {
      scratch.current.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
      const t = -camera.position.z / scratch.current.z;
      mouseWorld.current.copy(camera.position).add(scratch.current.multiplyScalar(t));
      u.uMouse.value.lerp(mouseWorld.current, 0.15);
    }

    if (calm) {
      u.uWeights.value.set(1, 0, 0);
    } else {
      // Pętla 3 kształtów: 0 → 1 → 2 → 0.
      const t = (state.clock.elapsedTime / CYCLE) % 3;
      const from = Math.floor(t);
      const to = (from + 1) % 3;
      const raw = t - from;
      const f = raw * raw * (3 - 2 * raw); // smoothstep
      const w = [0, 0, 0];
      w[from] = 1 - f;
      w[to] += f;
      u.uWeights.value.set(w[0], w[1], w[2]);

      if (points.current) points.current.rotation.y += delta * 0.12;
    }
  });

  // Na wąskich ekranach chmura musi się zmieścić w kadrze.
  const scale = Math.min(1, viewport.width / 5.2);

  return (
    <points ref={points} geometry={geometry} scale={scale} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
