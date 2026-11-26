"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Finite, one-shot entrance for the left vehicle image in (auth) layout.
 * Zero infinite loops, zero pointermove listeners.
 */
export function useAuthShellAnimations() {
  const shellRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    const photo = photoRef.current;
    if (!shell || !photo || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // ANIMATION 1: Finite one-shot photo reveal (transform + opacity only)
      gsap.fromTo(
        photo,
        { opacity: 0, scale: 1.02 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.65,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
      );
    }, shell);

    return () => ctx.revert();
  }, []);

  return { shellRef, photoRef };
}

/**
 * Finite, non-blocking GSAP choreography for Sign In and Create Account forms.
 */
export function useAuthFormAnimations() {
  const formScopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scope = formScopeRef.current;
    if (!scope || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // ANIMATION 2: Calm route-switch crossfade + subtle horizontal slide
      gsap.fromTo(
        scope,
        { opacity: 0, x: 10 },
        {
          opacity: 1,
          x: 0,
          duration: 0.35,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
      );
    }, scope);

    return () => ctx.revert();
  }, []);

  // ANIMATION 3: Clean fade-out before navigating to the destination route
  const fadeOutOnSuccess = (onComplete: () => void) => {
    const scope = formScopeRef.current;
    if (!scope || prefersReducedMotion()) {
      onComplete();
      return;
    }

    gsap.to(scope, {
      opacity: 0,
      y: -4,
      duration: 0.25,
      ease: "power3.out",
      onComplete,
    });
  };

  return { formScopeRef, fadeOutOnSuccess };
}
