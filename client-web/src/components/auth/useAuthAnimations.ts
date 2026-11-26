"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Shared GSAP choreography for the Auth Shell (left photo + Ken Burns + mouse parallax).
 * Runs once in the persistent (auth) layout so the photo stays in place during Sign in <-> Create account switches.
 */
export function useAuthShellAnimations() {
  const shellRef = useRef<HTMLDivElement>(null);
  const photoWrapRef = useRef<HTMLDivElement>(null);
  const photoImgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    const photoWrap = photoWrapRef.current;
    const photoImg = photoImgRef.current;
    if (!shell || !photoWrap || !photoImg) return;

    if (prefersReducedMotion()) {
      return;
    }

    let xTo: gsap.QuickToFunc | null = null;
    let yTo: gsap.QuickToFunc | null = null;

    const ctx = gsap.context(() => {
      // ANIMATION 1a: Page load photo reveal via clip-path wipe
      gsap.fromTo(
        photoWrap,
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 0.75,
          ease: "power3.out",
          clearProps: "clipPath",
        },
      );

      // ANIMATION 2a: Slow Ken Burns (scale 1 -> 1.06 over ~20s, yoyo)
      gsap.to(photoImg, {
        scale: 1.06,
        duration: 20,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      // ANIMATION 2b: Damped mouse parallax (max 10px)
      xTo = gsap.quickTo(photoImg, "x", { duration: 0.8, ease: "power3.out" });
      yTo = gsap.quickTo(photoImg, "y", { duration: 0.8, ease: "power3.out" });
    }, shell);

    const handlePointerMove = (e: PointerEvent) => {
      if (!xTo || !yTo) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      xTo(Math.max(-10, Math.min(10, nx * 10)));
      yTo(Math.max(-10, Math.min(10, ny * 10)));
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      ctx.revert();
    };
  }, []);

  return { shellRef, photoWrapRef, photoImgRef };
}

/**
 * Shared GSAP choreography for each Auth Form (Sign in / Create account).
 * Handles: masked heading reveal, 60ms field stagger, route switch crossfade+slide,
 * validation error shake, and success fade-out.
 */
export function useAuthFormAnimations() {
  const formScopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scope = formScopeRef.current;
    if (!scope || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // ANIMATION 6: Form panel crossfade with small horizontal slide on route switch
      tl.fromTo(
        scope,
        { opacity: 0, x: 14 },
        { opacity: 1, x: 0, duration: 0.45, clearProps: "transform,opacity" },
      )
        // ANIMATION 1b: Heading lines slide up through a mask
        .from(
          ".auth-heading-line",
          {
            yPercent: 100,
            opacity: 0,
            duration: 0.6,
            clearProps: "transform,opacity",
          },
          "-=0.35",
        )
        // ANIMATION 1c: Form fields fade up with 60ms stagger
        .from(
          ".auth-stagger-item",
          {
            y: 12,
            opacity: 0,
            duration: 0.45,
            stagger: 0.06,
            clearProps: "transform,opacity",
          },
          "-=0.4",
        );
    }, scope);

    return () => ctx.revert();
  }, []);

  // ANIMATION 7: Short horizontal shake on validation or auth error
  const shakeElement = (element: HTMLElement | null) => {
    if (!element || prefersReducedMotion()) return;
    gsap.fromTo(
      element,
      { x: -6 },
      {
        x: 0,
        duration: 0.4,
        ease: "power3.out",
        keyframes: [{ x: -6 }, { x: 6 }, { x: -4 }, { x: 4 }, { x: 0 }],
        clearProps: "transform",
      },
    );
  };

  // ANIMATION 5b: Clean fade-out transition before navigating to the next page
  const fadeOutOnSuccess = (onComplete: () => void) => {
    const scope = formScopeRef.current;
    if (!scope || prefersReducedMotion()) {
      onComplete();
      return;
    }

    gsap.to(scope, {
      opacity: 0,
      y: -6,
      duration: 0.35,
      ease: "power3.out",
      onComplete,
    });
  };

  return { formScopeRef, shakeElement, fadeOutOnSuccess };
}
