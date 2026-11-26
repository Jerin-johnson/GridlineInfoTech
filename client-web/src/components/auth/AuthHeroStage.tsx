"use client";

import { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

// Lazy-load the Three.js canvas so SSR and mobile payloads stay lightweight
const AuthHero3D = dynamic(
  () => import("./AuthHero3D").then((m) => m.AuthHero3D),
  { ssr: false },
);

function subscribeMedia(query: string, callback: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function useMediaQuery(query: string, serverDefault: boolean) {
  return useSyncExternalStore(
    (cb) => subscribeMedia(query, cb),
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}

interface AuthHeroStageProps {
  posterImage: string;
  posterAlt: string;
  isPasswordFocused: boolean;
  isSuccess: boolean;
}

export function AuthHeroStage({
  posterImage,
  posterAlt,
  isPasswordFocused,
  isSuccess,
}: AuthHeroStageProps) {
  const [canvasReady, setCanvasReady] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)", false);
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
    true,
  );

  const shouldRender3D = isDesktop && !prefersReducedMotion;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#0A0B0E]">
      {/* Static poster image shown immediately on mobile, reduced-motion, and before WebGL mounts */}
      <Image
        src={posterImage}
        alt={posterAlt}
        fill
        priority
        quality={85}
        sizes="(min-width: 1024px) 60vw, 100vw"
        className={`object-cover object-center transition-opacity duration-700 ${
          shouldRender3D && canvasReady ? "opacity-15" : "opacity-55"
        }`}
      />

      {/* Restrained machined-metal key light + brake-disc rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 68% 54% at 50% 48%, rgba(184,189,199,0.14) 0%, rgba(209,52,35,0.06) 45%, transparent 74%)",
        }}
      />

      {shouldRender3D && (
        <AuthHero3D
          isPasswordFocused={isPasswordFocused}
          isSuccess={isSuccess}
          onReady={() => setCanvasReady(true)}
        />
      )}

      {/* Edge vignette for crisp text legibility */}
      <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#0A0B0E] via-transparent to-[#0A0B0E]/75" />
    </div>
  );
}
