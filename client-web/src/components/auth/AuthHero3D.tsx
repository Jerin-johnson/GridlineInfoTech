"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

interface AuthHero3DProps {
  isPasswordFocused: boolean;
  isSuccess: boolean;
  onReady?: () => void;
}

const SPOKE_COUNT = 5;
const TWO_PI = Math.PI * 2;
const SPOKE_ANGLES = Array.from(
  { length: SPOKE_COUNT },
  (_, i) => (i * TWO_PI) / SPOKE_COUNT,
);

function WheelAndBrakeAssembly({
  isPasswordFocused,
  isSuccess,
  pointerRef,
}: {
  isPasswordFocused: boolean;
  isSuccess: boolean;
  pointerRef: React.RefObject<{ x: number; y: number }>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const sweepLightRef = useRef<THREE.PointLight>(null);

  // Build geometries and PBR materials once; dispose on unmount
  const resources = useMemo(() => {
    const tireGeo = new THREE.TorusGeometry(1.52, 0.34, 32, 96);
    const outerRimGeo = new THREE.CylinderGeometry(1.24, 1.24, 0.72, 64, 1, true);
    outerRimGeo.rotateX(Math.PI / 2);

    const lipGeo = new THREE.TorusGeometry(1.24, 0.045, 20, 72);
    const hubGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.36, 40);
    hubGeo.rotateX(Math.PI / 2);

    const centerCapGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.4, 32);
    centerCapGeo.rotateX(Math.PI / 2);

    const spokeGeo = new THREE.BoxGeometry(0.11, 0.96, 0.1);
    const lugGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.12, 16);
    lugGeo.rotateX(Math.PI / 2);

    const rotorGeo = new THREE.CylinderGeometry(1.02, 1.02, 0.09, 64);
    rotorGeo.rotateX(Math.PI / 2);

    const rotorHatGeo = new THREE.CylinderGeometry(0.46, 0.48, 0.14, 40);
    rotorHatGeo.rotateX(Math.PI / 2);

    const caliperGeo = new THREE.BoxGeometry(0.38, 0.78, 0.34);

    const tireMat = new THREE.MeshStandardMaterial({
      color: "#121316",
      roughness: 0.86,
      metalness: 0.06,
    });

    const alloyMat = new THREE.MeshPhysicalMaterial({
      color: "#B8BDC7",
      metalness: 0.92,
      roughness: 0.22,
      clearcoat: 0.45,
      clearcoatRoughness: 0.18,
    });

    const darkAlloyMat = new THREE.MeshStandardMaterial({
      color: "#3A3F4B",
      metalness: 0.88,
      roughness: 0.32,
    });

    const rotorMat = new THREE.MeshStandardMaterial({
      color: "#4B505C",
      metalness: 0.78,
      roughness: 0.38,
    });

    const caliperMat = new THREE.MeshPhysicalMaterial({
      color: "#D13423",
      metalness: 0.38,
      roughness: 0.26,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
    });

    return {
      geometries: [
        tireGeo,
        outerRimGeo,
        lipGeo,
        hubGeo,
        centerCapGeo,
        spokeGeo,
        lugGeo,
        rotorGeo,
        rotorHatGeo,
        caliperGeo,
      ],
      materials: [tireMat, alloyMat, darkAlloyMat, rotorMat, caliperMat],
      tireGeo,
      outerRimGeo,
      lipGeo,
      hubGeo,
      centerCapGeo,
      spokeGeo,
      lugGeo,
      rotorGeo,
      rotorHatGeo,
      caliperGeo,
      tireMat,
      alloyMat,
      darkAlloyMat,
      rotorMat,
      caliperMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      resources.geometries.forEach((g) => g.dispose());
      resources.materials.forEach((m) => m.dispose());
    };
  }, [resources]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const group = groupRef.current;
    if (group) {
      // Slow studio auto-rotation + damped mouse parallax
      group.rotation.z -= dt * 0.16;
      const targetY = -0.35 + pointerRef.current.x * 0.18;
      const targetX = 0.12 - pointerRef.current.y * 0.12;
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetY, 0.06);
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, targetX, 0.06);
    }

    // Slow specular light sweep across the machined alloy
    if (sweepLightRef.current) {
      const t = state.clock.getElapsedTime() * 0.45;
      sweepLightRef.current.position.x = Math.sin(t) * 3.4;
      sweepLightRef.current.position.y = Math.cos(t * 0.7) * 1.8 + 1.2;
    }

    // Camera zoom on password focus or auth success push-through
    const targetZ = isSuccess ? 1.85 : isPasswordFocused ? 3.85 : 4.55;
    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z,
      targetZ,
      0.07,
    );
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 5, 4]} intensity={1.8} color="#F3F4F6" />
      <pointLight
        ref={sweepLightRef}
        position={[2, 2, 3.2]}
        intensity={14}
        distance={10}
        color="#E5E7EB"
      />
      <pointLight
        position={[-2.8, -1.6, 2.5]}
        intensity={4.5}
        distance={8}
        color="#D13423"
      />

      <Environment resolution={256}>
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#F3F4F6"
          scale={[6, 1.4, 1]}
          position={[0, 4, 2]}
          rotation={[Math.PI / 2.6, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.5}
          color="#9CA3AF"
          scale={[4, 4, 1]}
          position={[-4, 0, 2]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.2}
          color="#D13423"
          scale={[3, 0.6, 1]}
          position={[2, -3, 2]}
          rotation={[-Math.PI / 3, 0, 0]}
        />
      </Environment>

      <group ref={groupRef} rotation={[0.12, -0.35, 0]}>
        {/* Tire & Outer Barrel */}
        <mesh geometry={resources.tireGeo} material={resources.tireMat} />
        <mesh
          geometry={resources.outerRimGeo}
          material={resources.darkAlloyMat}
        />
        <mesh
          geometry={resources.lipGeo}
          material={resources.alloyMat}
          position={[0, 0, 0.34]}
        />
        <mesh
          geometry={resources.lipGeo}
          material={resources.alloyMat}
          position={[0, 0, -0.34]}
        />

        {/* Hub & Center Cap */}
        <mesh
          geometry={resources.hubGeo}
          material={resources.alloyMat}
          position={[0, 0, 0.12]}
        />
        <mesh
          geometry={resources.centerCapGeo}
          material={resources.caliperMat}
          position={[0, 0, 0.14]}
        />

        {/* Forged Split-5 Spokes + Lug Bolts */}
        {SPOKE_ANGLES.map((angle) => (
          <group key={angle} rotation={[0, 0, angle]}>
            <mesh
              geometry={resources.spokeGeo}
              material={resources.alloyMat}
              position={[-0.085, 0.66, 0.24]}
              rotation={[0, 0, 0.11]}
            />
            <mesh
              geometry={resources.spokeGeo}
              material={resources.alloyMat}
              position={[0.085, 0.66, 0.24]}
              rotation={[0, 0, -0.11]}
            />
            <mesh
              geometry={resources.lugGeo}
              material={resources.darkAlloyMat}
              position={[0, 0.23, 0.28]}
            />
          </group>
        ))}

        {/* Cross-Drilled Brake Rotor & 6-Piston Caliper */}
        <mesh
          geometry={resources.rotorGeo}
          material={resources.rotorMat}
          position={[0, 0, -0.08]}
        />
        <mesh
          geometry={resources.rotorHatGeo}
          material={resources.darkAlloyMat}
          position={[0, 0, -0.02]}
        />
        <mesh
          geometry={resources.caliperGeo}
          material={resources.caliperMat}
          position={[0.78, 0.24, -0.06]}
          rotation={[0, 0, -0.28]}
        />
      </group>
    </>
  );
}

export function AuthHero3D({
  isPasswordFocused,
  isSuccess,
  onReady,
}: AuthHero3DProps) {
  const pointerRef = useRef({ x: 0, y: 0 });
  const [isHidden, setIsHidden] = useState(false);

  // Pause WebGL render loop when browser tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      setIsHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-10"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        pointerRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        pointerRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      }}
      onPointerLeave={() => {
        pointerRef.current.x = 0;
        pointerRef.current.y = 0;
      }}
    >
      <Canvas
        dpr={[1, 2]}
        frameloop={isHidden ? "never" : "always"}
        camera={{ position: [0, 0, 4.55], fov: 36 }}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
        onCreated={() => {
          onReady?.();
        }}
      >
        <WheelAndBrakeAssembly
          isPasswordFocused={isPasswordFocused}
          isSuccess={isSuccess}
          pointerRef={pointerRef}
        />
      </Canvas>
    </div>
  );
}
