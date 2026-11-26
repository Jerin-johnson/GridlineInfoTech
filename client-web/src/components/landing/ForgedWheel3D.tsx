"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  PerformanceMonitor,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Minus, Plus, RotateCcw } from "lucide-react";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

interface FinishSpec {
  id: "bronze" | "gunmetal" | "silver" | "black";
  label: string;
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

const FINISHES: readonly FinishSpec[] = [
  {
    id: "bronze",
    label: "Satin Bronze",
    color: "#9B7A4C",
    metalness: 0.96,
    roughness: 0.32,
    clearcoat: 0.3,
    clearcoatRoughness: 0.34,
  },
  {
    id: "gunmetal",
    label: "Gunmetal",
    color: "#4B4E57",
    metalness: 0.98,
    roughness: 0.28,
    clearcoat: 0.35,
    clearcoatRoughness: 0.28,
  },
  {
    id: "silver",
    label: "Brushed Silver",
    color: "#C7CAD1",
    metalness: 1.0,
    roughness: 0.22,
    clearcoat: 0.42,
    clearcoatRoughness: 0.2,
  },
  {
    id: "black",
    label: "Matte Black",
    color: "#1D1F24",
    metalness: 0.85,
    roughness: 0.48,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
  },
] as const;

type FinishId = FinishSpec["id"];

const TWO_PI = Math.PI * 2;
const TIRE_RADIUS = 1.8;
const SPOKE_COUNT = 5;
const SPOKE_ANGLES = Array.from(
  { length: SPOKE_COUNT },
  (_, i) => (i * TWO_PI) / SPOKE_COUNT + Math.PI / 2,
);

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 0.4, 8.2);
const DEFAULT_DISTANCE = DEFAULT_CAMERA_POS.length();
const MIN_DISTANCE = 5.6;
const MAX_DISTANCE = 9.8;
const ZOOM_STEP = 0.85;

/* ------------------------------------------------------------------ */
/* Geometry builders                                                   */
/* Wheel axis = Z (faces the camera). Built once, never per frame.     */
/* ------------------------------------------------------------------ */

function lathe(profile: [number, number][], segments = 128) {
  const g = new THREE.LatheGeometry(
    profile.map(([r, a]) => new THREE.Vector2(r, a)),
    segments,
  );
  g.rotateX(Math.PI / 2);
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
  for (const g of [-0.095, 0, 0.095]) {
    p.push(
      [TIRE_RADIUS, g - 0.014],
      [TIRE_RADIUS - 0.018, g - 0.008],
      [TIRE_RADIUS - 0.018, g + 0.008],
      [TIRE_RADIUS, g + 0.014],
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
  return lathe(p, 128);
}

function buildBarrel() {
  return lathe(
    [
      [1.35, -0.32],
      [1.31, -0.32],
      [1.26, -0.24],
      [1.24, 0.05],
      [1.29, 0.22],
      [1.34, 0.27],
      [1.36, 0.295],
      [1.31, 0.3],
      [1.24, 0.26],
      [1.19, 0.12],
      [1.24, -0.26],
    ],
    128,
  );
}

function buildHub() {
  return lathe(
    [
      [0.38, -0.02],
      [0.36, 0.05],
      [0.24, 0.1],
      [0.2, 0.12],
      [0.14, 0.12],
      [0.14, 0.02],
    ],
    64,
  );
}

function buildNut() {
  return lathe(
    [
      [0.19, 0.08],
      [0.2, 0.13],
      [0.16, 0.19],
      [0.11, 0.22],
      [0.06, 0.235],
      [0.0, 0.235],
    ],
    64,
  );
}

/** Single Y-spoke: base tapers out then splits into two arms at r = 0.64 */
function buildSpoke() {
  const s = new THREE.Shape();
  s.moveTo(-0.044, 0.26);
  s.lineTo(0.044, 0.26);
  s.lineTo(0.052, 0.62);
  s.lineTo(0.185, 1.24);
  s.lineTo(0.125, 1.255);
  s.lineTo(0.018, 0.72);
  s.lineTo(0, 0.69);
  s.lineTo(-0.018, 0.72);
  s.lineTo(-0.125, 1.255);
  s.lineTo(-0.185, 1.24);
  s.lineTo(-0.052, 0.62);
  s.closePath();

  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.072,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.01,
    bevelSegments: 3,
    curveSegments: 16,
  });
  g.translate(0, 0, -0.036);
  return g;
}

function buildRotor() {
  return lathe(
    [
      [0.52, -0.03],
      [0.52, 0.04],
      [0.64, 0.04],
      [0.64, 0.025],
      [1.06, 0.025],
      [1.06, -0.025],
      [0.64, -0.025],
      [0.64, -0.03],
    ],
    96,
  );
}

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

function stepFinishMaterial(
  material: THREE.MeshPhysicalMaterial,
  targetColor: THREE.Color,
  spec: FinishSpec,
  t: number,
  snap: boolean,
): boolean {
  if (snap) {
    material.color.copy(targetColor);
    material.metalness = spec.metalness;
    material.roughness = spec.roughness;
    material.clearcoat = spec.clearcoat;
    material.clearcoatRoughness = spec.clearcoatRoughness;
    return true;
  }

  material.color.lerp(targetColor, t);
  material.metalness = THREE.MathUtils.lerp(
    material.metalness,
    spec.metalness,
    t,
  );
  material.roughness = THREE.MathUtils.lerp(
    material.roughness,
    spec.roughness,
    t,
  );
  material.clearcoat = THREE.MathUtils.lerp(
    material.clearcoat,
    spec.clearcoat,
    t,
  );
  material.clearcoatRoughness = THREE.MathUtils.lerp(
    material.clearcoatRoughness,
    spec.clearcoatRoughness,
    t,
  );

  const dr = Math.abs(material.color.r - targetColor.r);
  const dg = Math.abs(material.color.g - targetColor.g);
  const db = Math.abs(material.color.b - targetColor.b);
  const dRough = Math.abs(material.roughness - spec.roughness);

  if (dr + dg + db + dRough < 0.002) {
    material.color.copy(targetColor);
    material.metalness = spec.metalness;
    material.roughness = spec.roughness;
    material.clearcoat = spec.clearcoat;
    material.clearcoatRoughness = spec.clearcoatRoughness;
    return true;
  }

  return false;
}

function Wheel({
  finishSpec,
  reduced,
  dragging,
  resetSignal,
}: {
  finishSpec: FinishSpec;
  reduced: boolean;
  dragging: React.MutableRefObject<boolean>;
  resetSignal: number;
}) {
  const group = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const invalidate = useThree((s) => s.invalidate);

  const targetColor = useMemo(
    () => new THREE.Color(finishSpec.color),
    [finishSpec.color],
  );
  const settledRef = useRef(false);

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
    const initial = FINISHES[0];
    return {
      finish: new THREE.MeshPhysicalMaterial({
        color: initial.color,
        metalness: initial.metalness,
        roughness: initial.roughness,
        clearcoat: initial.clearcoat,
        clearcoatRoughness: initial.clearcoatRoughness,
        side: two,
      }),
      polished: new THREE.MeshPhysicalMaterial({
        color: "#E9EAEE",
        metalness: 1,
        roughness: 0.1,
      }),
      tire: new THREE.MeshPhysicalMaterial({
        color: "#0F1013",
        roughness: 0.88,
        metalness: 0,
        sheen: 0.55,
        sheenRoughness: 0.82,
        sheenColor: new THREE.Color("#2D2F36"),
        side: two,
      }),
      rotor: new THREE.MeshPhysicalMaterial({
        color: "#3C3E45",
        metalness: 0.88,
        roughness: 0.36,
        anisotropy: 0.6,
        clearcoat: 0.12,
      }),
      caliper: new THREE.MeshPhysicalMaterial({
        color: "#C81E1E",
        metalness: 0.32,
        roughness: 0.3,
        clearcoat: 0.95,
        clearcoatRoughness: 0.12,
      }),
      nut: new THREE.MeshPhysicalMaterial({
        color: "#C81E1E",
        metalness: 0.9,
        roughness: 0.26,
        clearcoat: 0.6,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: "#141518",
        metalness: 0.9,
        roughness: 0.34,
      }),
      well: new THREE.MeshStandardMaterial({ color: "#060607", roughness: 1 }),
    };
  }, []);

  // Free GPU memory on unmount
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mat).forEach((m) => m.dispose());
    },
    [geo, mat],
  );

  // Trigger smooth finish transition or snap immediately for reduced motion
  useEffect(() => {
    settledRef.current = false;
    if (reduced) {
      settledRef.current = stepFinishMaterial(
        mat.finish,
        targetColor,
        finishSpec,
        1,
        true,
      );
      invalidate();
    }
  }, [finishSpec, targetColor, reduced, mat, invalidate]);

  // Reset wheel phase when Reset button is pressed
  useEffect(() => {
    if (resetSignal > 0) {
      phase.current = 0;
      if (group.current) {
        group.current.rotation.set(0.06, -0.45, 0);
      }
      invalidate();
    }
  }, [resetSignal, invalidate]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    if (!reduced && !dragging.current) {
      phase.current += dt * 0.4;
      if (group.current) {
        group.current.rotation.y = -0.45 + Math.sin(phase.current) * 0.3;
      }
    }

    // Lerp PBR finish properties only until converged
    if (!reduced && !settledRef.current) {
      const t = 1 - Math.exp(-dt * 7);
      settledRef.current = stepFinishMaterial(
        mat.finish,
        targetColor,
        finishSpec,
        t,
        false,
      );
    }
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

      <group position={[0, 0, 0.06]}>
        <mesh geometry={geo.hub} material={mat.finish} />
        <mesh geometry={geo.nut} material={mat.nut} />
        <mesh geometry={geo.hex} material={mat.dark} position={[0, 0, 0.235]} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scene: studio lighting + baked environment + bounded camera/zoom   */
/* ------------------------------------------------------------------ */

function Scene({
  finishSpec,
  reduced,
  targetDistance,
  resetSignal,
}: {
  finishSpec: FinishSpec;
  reduced: boolean;
  targetDistance: number;
  resetSignal: number;
}) {
  const dragging = useRef(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { gl, camera, invalidate } = useThree();
  const isResettingRef = useRef(false);
  const lastTargetDistanceRef = useRef(targetDistance);

  // Preserve vertical page scrolling on touch devices
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      gl.domElement.style.touchAction = "pan-y";
    });
    return () => cancelAnimationFrame(id);
  }, [gl]);

  // Trigger smooth camera reset when resetSignal increments
  useEffect(() => {
    if (resetSignal > 0) {
      isResettingRef.current = true;
      invalidate();
    }
  }, [resetSignal, invalidate]);

  // Invalidate on demand when zoom buttons are clicked under reduced motion
  useEffect(() => {
    if (lastTargetDistanceRef.current !== targetDistance) {
      lastTargetDistanceRef.current = targetDistance;
      invalidate();
    }
  }, [targetDistance, invalidate]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = reduced ? 1 : 1 - Math.exp(-dt * 8);

    if (isResettingRef.current) {
      camera.position.lerp(DEFAULT_CAMERA_POS, t);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), t);
        controlsRef.current.update();
      }
      if (camera.position.distanceTo(DEFAULT_CAMERA_POS) < 0.02) {
        camera.position.copy(DEFAULT_CAMERA_POS);
        isResettingRef.current = false;
      }
      return;
    }

    const currentDist = camera.position.length();
    if (Math.abs(currentDist - targetDistance) > 0.015) {
      const nextDist = THREE.MathUtils.lerp(currentDist, targetDistance, t);
      camera.position.setLength(nextDist);
      controlsRef.current?.update();
    }
  });

  return (
    <>
      {/* Studio key, rim, and fill lights (zero real-time shadow maps) */}
      <directionalLight position={[3.5, 5.5, 5]} intensity={1.35} color="#F5F5F3" />
      <directionalLight position={[-4.5, 2, -4]} intensity={0.9} color="#D4D8E0" />
      <directionalLight position={[0, -2.5, 4]} intensity={0.35} color="#E4E4E7" />

      {/* Baked studio IBL: softboxes + side strips + subtle crimson rim kicker */}
      <Environment resolution={256} frames={1}>
        <mesh scale={50}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#0A0A0C" side={THREE.BackSide} />
        </mesh>
        <Lightformer
          form="rect"
          intensity={3.6}
          position={[0, 6, 4]}
          scale={[12, 3, 1]}
          onUpdate={(s) => s.lookAt(0, 0, 0)}
        />
        <Lightformer
          form="rect"
          intensity={2.6}
          position={[-6, 1, 3]}
          scale={[1.5, 8, 1]}
          onUpdate={(s) => s.lookAt(0, 0, 0)}
        />
        <Lightformer
          form="rect"
          intensity={2.6}
          position={[6, 1, 3]}
          scale={[1.5, 8, 1]}
          onUpdate={(s) => s.lookAt(0, 0, 0)}
        />
        <Lightformer
          form="rect"
          intensity={0.7}
          position={[0, 0, 9]}
          scale={[8, 5, 1]}
          onUpdate={(s) => s.lookAt(0, 0, 0)}
        />
        <Lightformer
          form="ring"
          color="#C81E1E"
          intensity={1.7}
          position={[-4, -2, -6]}
          scale={4}
          onUpdate={(s) => s.lookAt(0, 0, 0)}
        />
        <Lightformer
          form="rect"
          intensity={0.5}
          position={[0, -5, 2]}
          scale={[8, 2, 1]}
          onUpdate={(s) => s.lookAt(0, 0, 0)}
        />
      </Environment>

      <Wheel
        finishSpec={finishSpec}
        reduced={reduced}
        dragging={dragging}
        resetSignal={resetSignal}
      />

      <ContactShadows
        position={[0, -TIRE_RADIUS - 0.02, 0]}
        opacity={0.7}
        scale={7}
        blur={2.4}
        far={2.5}
        resolution={512}
        frames={1}
        color="#000000"
      />

      {/* Mouse-wheel zoom disabled so desktop page scrolling is never hijacked */}
      <OrbitControls
        ref={controlsRef}
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.055}
        rotateSpeed={0.65}
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
        minPolarAngle={Math.PI / 2.5}
        maxPolarAngle={Math.PI / 1.85}
        onStart={() => {
          dragging.current = true;
          isResettingRef.current = false;
        }}
        onEnd={() => {
          dragging.current = false;
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* React 19 Safe External Store Hooks                                  */
/* ------------------------------------------------------------------ */

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

function useTabVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => !document.hidden,
    () => true,
  );
}

function subscribeNoop() {
  return () => {};
}

function useCan3D(): boolean | null {
  return useSyncExternalStore(
    subscribeNoop,
    () => {
      try {
        const c = document.createElement("canvas");
        const hasGL = !!(c.getContext("webgl2") || c.getContext("webgl"));
        const nav = navigator as Navigator & { deviceMemory?: number };
        const weak =
          (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2;
        return hasGL && !weak;
      } catch {
        return false;
      }
    },
    () => null,
  );
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
  const [targetDistance, setTargetDistance] = useState(DEFAULT_DISTANCE);
  const [resetSignal, setResetSignal] = useState(0);

  const reduced = useReducedMotion();
  const tabVisible = useTabVisible();
  const can3D = useCan3D();

  // Pause rendering when off-screen
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const currentFinish = FINISHES.find((f) => f.id === finish) ?? FINISHES[0];

  const handleZoomIn = useCallback(() => {
    setTargetDistance((d) => Math.max(MIN_DISTANCE, d - ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTargetDistance((d) => Math.min(MAX_DISTANCE, d + ZOOM_STEP));
  }, []);

  const handleReset = useCallback(() => {
    setTargetDistance(DEFAULT_DISTANCE);
    setResetSignal((n) => n + 1);
  }, []);

  const shouldRenderLoop = inView && tabVisible;

  return (
    <div
      ref={wrapRef}
      onDoubleClick={handleReset}
      className="relative h-[420px] w-full cursor-grab overflow-hidden active:cursor-grabbing md:h-[540px]"
      style={{
        background:
          "radial-gradient(60% 58% at 50% 44%, #1A1B20 0%, #0B0B0D 58%, #080808 100%)",
      }}
    >
      {can3D === true && (
        <Canvas
          dpr={dpr}
          frameloop={!shouldRenderLoop ? "never" : reduced ? "demand" : "always"}
          camera={{ position: [0, 0.4, 8.2], fov: 30 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 1.05;
          }}
          aria-label={`Interactive 3D forged wheel, ${currentFinish.label} finish. Drag to rotate.`}
        >
          <PerformanceMonitor
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(1.75)}
          />
          <Scene
            finishSpec={currentFinish}
            reduced={reduced}
            targetDistance={targetDistance}
            resetSignal={resetSignal}
          />
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

      {/* Bounded Zoom & Reset View Controls (never hijacks page scroll) */}
      {can3D === true && (
        <div className="absolute top-4 right-4 z-10 flex items-center border border-white/10 bg-black/65 backdrop-blur-sm">
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={targetDistance <= MIN_DISTANCE}
            aria-label="Zoom in"
            className="h-9 w-9 flex items-center justify-center text-zinc-300 hover:text-[#F5F5F3] hover:bg-white/5 transition-colors disabled:opacity-35 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <span className="h-5 w-[1px] bg-white/10" aria-hidden="true" />
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={targetDistance >= MAX_DISTANCE}
            aria-label="Zoom out"
            className="h-9 w-9 flex items-center justify-center text-zinc-300 hover:text-[#F5F5F3] hover:bg-white/5 transition-colors disabled:opacity-35 cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="h-5 w-[1px] bg-white/10" aria-hidden="true" />
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset camera view"
            className="h-9 px-3 flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-zinc-300 hover:text-[#F5F5F3] hover:bg-white/5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      )}

      {/* Finish selector */}
      <div
        role="radiogroup"
        aria-label="Wheel finish"
        className="absolute bottom-4 left-4 z-10 flex items-center gap-3 border border-white/10 bg-black/65 px-3 py-2 backdrop-blur-sm"
      >
        {FINISHES.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={finish === f.id}
            aria-label={f.label}
            onClick={() => setFinish(f.id)}
            className={`h-6 w-6 rounded-full border transition cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C81E1E] ${
              finish === f.id
                ? "scale-110 border-white"
                : "border-white/20 hover:border-white/60"
            }`}
            style={{ background: f.color }}
          />
        ))}
        <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-300">
          {currentFinish.label}
        </span>
      </div>
    </div>
  );
}
