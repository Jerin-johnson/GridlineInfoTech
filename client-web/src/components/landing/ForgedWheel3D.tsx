"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  PerformanceMonitor,
} from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const FINISHES = [
  { id: "bronze", label: "Satin Bronze", color: "#9b7a4c" },
  { id: "gunmetal", label: "Gunmetal", color: "#4b4e57" },
  { id: "silver", label: "Brushed Silver", color: "#c7cad1" },
] as const;
type FinishId = (typeof FINISHES)[number]["id"];

const TWO_PI = Math.PI * 2;
const TIRE_RADIUS = 1.8;
const SPOKE_COUNT = 5; // each spoke forks into 2 arms -> 10 contact points
const SPOKE_ANGLES = Array.from(
  { length: SPOKE_COUNT },
  (_, i) => (i * TWO_PI) / SPOKE_COUNT + Math.PI / 2,
);

/* ------------------------------------------------------------------ */
/* Geometry builders                                                   */
/* Wheel axis = Z (faces the camera). Built once, never per frame.     */
/* ------------------------------------------------------------------ */

/** Revolve a [radius, axial] profile around the Z axis. */
function lathe(profile: [number, number][], segments = 128) {
  const g = new THREE.LatheGeometry(
    profile.map(([r, a]) => new THREE.Vector2(r, a)),
    segments,
  );
  g.rotateX(Math.PI / 2); // lathe axis Y -> wheel axis Z
  return g;
}

function buildTire() {
  const p: [number, number][] = [
    [1.34, -0.25],
    [1.4, -0.27],
    [1.47, -0.3],
    [1.62, -0.315],
    [1.74, -0.275],
    [1.79, -0.2],
    [TIRE_RADIUS, -0.17],
  ];
  // three circumferential tread grooves
  for (const g of [-0.095, 0, 0.095]) {
    p.push(
      [TIRE_RADIUS, g - 0.022],
      [TIRE_RADIUS - 0.028, g - 0.016],
      [TIRE_RADIUS - 0.028, g + 0.016],
      [TIRE_RADIUS, g + 0.022],
    );
  }
  p.push(
    [TIRE_RADIUS, 0.17],
    [1.79, 0.2],
    [1.74, 0.275],
    [1.62, 0.315],
    [1.47, 0.3],
    [1.4, 0.27],
    [1.34, 0.25],
  );
  return lathe(p, 160);
}

function buildBarrel() {
  return lathe([
    [1.26, -0.28],
    [1.255, 0.0],
    [1.265, 0.2],
    [1.3, 0.27],
    [1.36, 0.295],
    [1.385, 0.28],
    [1.39, 0.24],
    [1.36, 0.15],
    [1.355, -0.25],
  ]);
}

function buildHub() {
  return lathe(
    [
      [0, 0.17],
      [0.14, 0.17],
      [0.22, 0.16],
      [0.34, 0.125],
      [0.41, 0.06],
      [0.43, 0.0],
      [0.43, -0.06],
      [0, -0.06],
    ],
    96,
  );
}

function buildNut() {
  return lathe(
    [
      [0, 0.22],
      [0.12, 0.22],
      [0.19, 0.2],
      [0.2, 0.15],
      [0.2, 0.12],
      [0, 0.12],
    ],
    64,
  );
}

/** Y-spoke: one stem that forks into two arms. Extruded + beveled. */
function buildSpoke() {
  const pts: [number, number][] = [
    [0.3, -0.1],
    [0.3, 0.1],
    [0.7, 0.075],
    [1.22, 0.4],
    [1.33, 0.33],
    [0.86, 0.015],
    [0.86, -0.015],
    [1.33, -0.33],
    [1.22, -0.4],
    [0.7, -0.075],
  ];
  const s = new THREE.Shape();
  s.moveTo(...pts[0]);
  pts.slice(1).forEach(([x, y]) => s.lineTo(x, y));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.07,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.014,
    bevelSegments: 3,
    curveSegments: 1,
  });
  g.translate(0, 0, -0.035);
  return g;
}

/** Cross-drilled disc with centre hole. */
function buildRotor() {
  const s = new THREE.Shape();
  s.absarc(0, 0, 1.02, 0, TWO_PI, false);
  const centre = new THREE.Path();
  centre.absarc(0, 0, 0.44, 0, TWO_PI, true);
  s.holes.push(centre);
  const rings = [
    { r: 0.64, off: 0 },
    { r: 0.84, off: Math.PI / 36 },
  ];
  for (const { r, off } of rings) {
    for (let i = 0; i < 36; i++) {
      const a = off + (i * TWO_PI) / 36;
      const h = new THREE.Path();
      h.absarc(Math.cos(a) * r, Math.sin(a) * r, 0.022, 0, TWO_PI, true);
      s.holes.push(h);
    }
  }
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.05,
    bevelEnabled: false,
    curveSegments: 20,
  });
  g.translate(0, 0, -0.025);
  return g;
}

/** Curved monoblock caliper that wraps the rotor edge. */
function buildCaliper() {
  const s = new THREE.Shape();
  s.absarc(0, 0, 1.1, -0.42, 0.42, false);
  s.absarc(0, 0, 0.74, 0.42, -0.42, true);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 4,
    curveSegments: 32,
  });
  g.translate(0, 0, -0.1);
  return g;
}

/* ------------------------------------------------------------------ */
/* Wheel                                                               */
/* ------------------------------------------------------------------ */

function Wheel({
  finishColor,
  reduced,
  dragging,
}: {
  finishColor: string;
  reduced: boolean;
  dragging: React.MutableRefObject<boolean>;
}) {
  const group = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  const target = useMemo(() => new THREE.Color(finishColor), []); // eslint-disable-line react-hooks/exhaustive-deps

  const geo = useMemo(
    () => ({
      tire: buildTire(),
      barrel: buildBarrel(),
      lip: new THREE.TorusGeometry(1.345, 0.022, 20, 160),
      hub: buildHub(),
      nut: buildNut(),
      hex: new THREE.CylinderGeometry(0.075, 0.075, 0.04, 6).rotateX(
        Math.PI / 2,
      ),
      spoke: buildSpoke(),
      rotor: buildRotor(),
      caliper: buildCaliper(),
      piston: new THREE.CylinderGeometry(0.075, 0.075, 0.03, 32).rotateX(
        Math.PI / 2,
      ),
      well: new THREE.CircleGeometry(1.3, 64),
    }),
    [],
  );

  const mat = useMemo(() => {
    const two = THREE.DoubleSide;
    return {
      finish: new THREE.MeshPhysicalMaterial({
        color: FINISHES[0].color,
        metalness: 1,
        roughness: 0.34,
        clearcoat: 0.35,
        clearcoatRoughness: 0.35,
        side: two,
      }),
      polished: new THREE.MeshPhysicalMaterial({
        color: "#e9eaee",
        metalness: 1,
        roughness: 0.08,
      }),
      tire: new THREE.MeshPhysicalMaterial({
        color: "#0d0d0f",
        roughness: 0.9,
        metalness: 0,
        sheen: 0.5,
        sheenRoughness: 0.85,
        sheenColor: new THREE.Color("#2b2b31"),
        side: two,
      }),
      rotor: new THREE.MeshPhysicalMaterial({
        color: "#34353a",
        metalness: 0.85,
        roughness: 0.42,
      }),
      caliper: new THREE.MeshPhysicalMaterial({
        color: "#c81e1e",
        metalness: 0.3,
        roughness: 0.32,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
      nut: new THREE.MeshPhysicalMaterial({
        color: "#c81e1e",
        metalness: 0.9,
        roughness: 0.28,
        clearcoat: 0.6,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: "#121214",
        metalness: 0.9,
        roughness: 0.35,
      }),
      well: new THREE.MeshStandardMaterial({ color: "#060607", roughness: 1 }),
    };
  }, []);

  // Free GPU memory on unmount.
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mat).forEach((m) => m.dispose());
    },
    [geo, mat],
  );

  // Finish change: lerp smoothly, or jump instantly for reduced motion.
  useEffect(() => {
    target.set(finishColor);
    if (reduced) {
      mat.finish.color.copy(target);
      invalidate();
    }
  }, [finishColor, reduced, target, mat, invalidate]);

  useFrame((_, delta) => {
    if (!reduced && !dragging.current) phase.current += delta * 0.45;
    if (group.current) {
      group.current.rotation.y = -0.45 + Math.sin(phase.current) * 0.32;
    }
    if (!reduced) mat.finish.color.lerp(target, 1 - Math.exp(-delta * 6));
  });

  return (
    <group ref={group} rotation={[0.06, -0.45, 0]}>
      <mesh geometry={geo.tire} material={mat.tire} />
      <mesh geometry={geo.barrel} material={mat.finish} />
      <mesh
        geometry={geo.lip}
        material={mat.polished}
        position={[0, 0, 0.296]}
      />
      <mesh geometry={geo.well} material={mat.well} position={[0, 0, -0.32]} />

      {/* Brake rotor + caliper sit behind the spokes */}
      <mesh
        geometry={geo.rotor}
        material={mat.rotor}
        position={[0, 0, -0.12]}
      />
      <group position={[0, 0, -0.12]} rotation={[0, 0, 0.62]}>
        <mesh geometry={geo.caliper} material={mat.caliper} />
        {[-0.27, 0, 0.27].map((a) => (
          <mesh
            key={a}
            geometry={geo.piston}
            material={mat.polished}
            position={[Math.cos(a) * 0.92, Math.sin(a) * 0.92, 0.14]}
          />
        ))}
      </group>

      {SPOKE_ANGLES.map((a) => (
        <mesh
          key={a}
          geometry={geo.spoke}
          material={mat.finish}
          position={[0, 0, 0.06]}
          rotation={[0, 0, a]}
        />
      ))}

      {/* Centre-lock hub */}
      <group position={[0, 0, 0.06]}>
        <mesh geometry={geo.hub} material={mat.finish} />
        <mesh geometry={geo.nut} material={mat.nut} />
        <mesh geometry={geo.hex} material={mat.dark} position={[0, 0, 0.235]} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scene: baked studio lighting + shadow + controls                    */
/* ------------------------------------------------------------------ */

function Scene({
  finishColor,
  reduced,
}: {
  finishColor: string;
  reduced: boolean;
}) {
  const dragging = useRef(false);
  const gl = useThree((s) => s.gl);

  // OrbitControls sets touch-action:none, which traps page scroll on mobile.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      gl.domElement.style.touchAction = "pan-y";
    });
    return () => cancelAnimationFrame(id);
  }, [gl]);

  return (
    <>
      {/* Custom studio: softboxes + strips + red kicker, rendered once. */}
      <Environment resolution={256} frames={1}>
        <mesh scale={50}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#0b0b0d" side={THREE.BackSide} />
        </mesh>
        <Lightformer
          form="rect"
          intensity={4}
          position={[0, 6, 4]}
          scale={[12, 3, 1]}
          onUpdate={(s) => s.lookAt(0, 0, 0)}
        />
        <Lightformer
          form="rect"
          intensity={3}
          position={[-6, 1, 3]}
          scale={[1.5, 8, 1]}
          onUpdate={(s) => s.lookAt(0, 0, 0)}
        />
        <Lightformer
          form="rect"
          intensity={3}
          position={[6, 1, 3]}
          scale={[1.5, 8, 1]}
          onUpdate={(s) => s.lookAt(0, 0, 0)}
        />
        <Lightformer
          form="rect"
          intensity={0.8}
          position={[0, 0, 9]}
          scale={[8, 5, 1]}
          onUpdate={(s) => s.lookAt(0, 0, 0)}
        />
        <Lightformer
          form="ring"
          color="#c81e1e"
          intensity={2.5}
          position={[-4, -2, -6]}
          scale={4}
          onUpdate={(s) => s.lookAt(0, 0, 0)}
        />
        <Lightformer
          form="rect"
          intensity={0.6}
          position={[0, -5, 2]}
          scale={[8, 2, 1]}
          onUpdate={(s) => s.lookAt(0, 0, 0)}
        />
      </Environment>

      <Wheel finishColor={finishColor} reduced={reduced} dragging={dragging} />

      {/* Baked once: cheap and sharp. */}
      <ContactShadows
        position={[0, -TIRE_RADIUS - 0.02, 0]}
        opacity={0.65}
        scale={7}
        blur={2.6}
        far={2.5}
        resolution={512}
        frames={1}
        color="#000000"
      />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.7}
        minPolarAngle={Math.PI / 2.5}
        maxPolarAngle={Math.PI / 1.85}
        onStart={() => (dragging.current = true)}
        onEnd={() => (dragging.current = false)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = () => setReduced(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

/** true = ok, false = no WebGL or weak device, null = still checking */
function useCan3D() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const hasGL = !!(c.getContext("webgl2") || c.getContext("webgl"));
      const nav = navigator as Navigator & { deviceMemory?: number };
      const weak =
        (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2;
      setOk(hasGL && !weak);
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

export default function ForgedWheel3D({
  fallbackSrc,
}: {
  fallbackSrc?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [dpr, setDpr] = useState(1.5);
  const [finish, setFinish] = useState<FinishId>("bronze");
  const reduced = useReducedMotion();
  const can3D = useCan3D();

  // Stop rendering entirely while off-screen.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const current = FINISHES.find((f) => f.id === finish)!;

  return (
    <div
      ref={wrapRef}
      className="relative h-[420px] w-full cursor-grab overflow-hidden active:cursor-grabbing md:h-[540px]"
      style={{
        background:
          "radial-gradient(60% 60% at 50% 42%, #1b1b1f 0%, #0b0b0d 55%, #060607 100%)",
      }}
    >
      {can3D === true && (
        <Canvas
          dpr={dpr}
          frameloop={!inView ? "never" : reduced ? "demand" : "always"}
          camera={{ position: [0, 0.4, 8.2], fov: 30 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 1.05;
          }}
          aria-label={`Interactive 3D forged wheel, ${current.label} finish. Drag to rotate.`}
        >
          <PerformanceMonitor
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(1.75)}
          />
          <Scene finishColor={current.color} reduced={reduced} />
        </Canvas>
      )}

      {can3D === false &&
        (fallbackSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fallbackSrc}
            alt="Forged center-lock wheel"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs uppercase tracking-[0.3em] text-zinc-500">
            3D preview unavailable
          </div>
        ))}

      {/* Finish selector */}
      <div
        role="radiogroup"
        aria-label="Wheel finish"
        className="absolute bottom-4 left-4 flex items-center gap-3 border border-white/10 bg-black/60 px-3 py-2 backdrop-blur"
      >
        {FINISHES.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={finish === f.id}
            aria-label={f.label}
            onClick={() => setFinish(f.id)}
            className={`h-5 w-5 rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
              finish === f.id
                ? "scale-110 border-white"
                : "border-white/20 hover:border-white/60"
            }`}
            style={{ background: f.color }}
          />
        ))}
        <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">
          {current.label}
        </span>
      </div>
    </div>
  );
}
