"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { AuthHeroStage } from "./AuthHeroStage";

interface AuthShellProps {
  headline: string;
  supportingCopy: string;
  posterImage: string;
  posterAlt: string;
  isPasswordFocused: boolean;
  isSuccess: boolean;
  children: React.ReactNode;
}

export function AuthShell({
  headline,
  supportingCopy,
  posterImage,
  posterAlt,
  isPasswordFocused,
  isSuccess,
  children,
}: AuthShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Orchestrated 1.2s load timeline: masked headline -> accent rule -> staggered form fields
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.from(".auth-headline-line", {
        yPercent: 100,
        opacity: 0,
        duration: 0.75,
        clearProps: "transform,opacity",
      })
        .from(
          ".auth-accent-line",
          {
            scaleX: 0,
            duration: 0.45,
            ease: "power3.out",
            clearProps: "transform",
          },
          "-=0.45",
        )
        .from(
          ".auth-field-item",
          {
            y: 12,
            opacity: 0,
            duration: 0.45,
            stagger: 0.06,
            ease: "power3.out",
            clearProps: "transform,opacity",
          },
          "-=0.25",
        );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen bg-[#0A0B0E] text-[#F3F4F6] grid grid-cols-1 lg:grid-cols-12"
    >
      {/* Left 60% Three.js Showroom Stage (Desktop) */}
      <aside className="hidden lg:flex lg:col-span-7 relative flex-col justify-between overflow-hidden bg-[#0A0B0E] p-10 xl:p-14">
        <AuthHeroStage
          posterImage={posterImage}
          posterAlt={posterAlt}
          isPasswordFocused={isPasswordFocused}
          isSuccess={isSuccess}
        />

        {/* Top Bar (Single ALL-CAPS brand mark on the page) */}
        <div className="relative z-30 flex items-center justify-between">
          <Link
            href="/"
            aria-label="APEX ATELIER Home"
            className="flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-[#F3F4F6] focus-visible:outline-offset-4"
          >
            <svg
              width="26"
              height="20"
              viewBox="0 0 28 22"
              fill="none"
              className="text-[#F3F4F6] transition-transform duration-300 group-hover:scale-105"
            >
              <path
                d="M14 2L26 20H20.5L14 10L7.5 20H2L14 2Z"
                fill="currentColor"
              />
              <path d="M14 14L18 20H10L14 14Z" fill="#D13423" />
            </svg>
            <span className="text-xs font-medium tracking-[0.28em] uppercase text-[#F3F4F6]">
              APEX ATELIER
            </span>
          </Link>

          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm text-[#C4C8D0] hover:text-[#F3F4F6] transition-colors focus-visible:outline-2 focus-visible:outline-[#F3F4F6] focus-visible:outline-offset-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to catalogue</span>
          </Link>
        </div>

        {/* Bottom Trust Strip */}
        <div className="relative z-30 flex items-center justify-between pt-6 border-t border-white/10 text-sm text-[#C4C8D0]">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#D13423]" />
            <span>Your session is encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#B8BDC7]" />
            <span>Secure checkout</span>
          </div>
        </div>
      </aside>

      {/* Right 40% Auth Panel */}
      <main className="lg:col-span-5 flex flex-col justify-between min-h-screen bg-[#111216] border-l border-white/10 px-6 py-8 sm:px-10 xl:px-14">
        {/* Mobile Header (< 1024px) */}
        <header className="flex lg:hidden items-center justify-between pb-6 border-b border-white/10">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-[#F3F4F6] focus-visible:outline-offset-4"
          >
            <svg
              width="22"
              height="17"
              viewBox="0 0 28 22"
              fill="none"
              className="text-[#F3F4F6]"
            >
              <path
                d="M14 2L26 20H20.5L14 10L7.5 20H2L14 2Z"
                fill="currentColor"
              />
              <path d="M14 14L18 20H10L14 14Z" fill="#D13423" />
            </svg>
            <span className="text-xs font-medium tracking-[0.26em] uppercase text-[#F3F4F6]">
              APEX ATELIER
            </span>
          </Link>

          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm text-[#C4C8D0] hover:text-[#F3F4F6] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Catalogue</span>
          </Link>
        </header>

        {/* Full-Presence Form Column */}
        <div className="flex-1 flex flex-col justify-center py-8 sm:py-10 w-full max-w-[440px] mx-auto">
          <div className="mb-8 space-y-3">
            <div className="overflow-hidden">
              <h1 className="auth-headline-line font-serif text-4xl sm:text-[44px] font-normal leading-[1.08] tracking-tight text-[#F3F4F6]">
                {headline}
              </h1>
            </div>

            <div className="auth-accent-line h-[2px] w-12 origin-left bg-[#D13423]" />

            <p className="auth-field-item text-[15px] text-[#C4C8D0] leading-relaxed">
              {supportingCopy}
            </p>
          </div>

          {children}
        </div>

        {/* Footer Trust Line */}
        <footer className="pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-[#9CA3AF]">
          <span>Your session is encrypted</span>
          <Link
            href="/shop"
            className="text-[#C4C8D0] hover:text-[#F3F4F6] transition-colors"
          >
            Browse hardware without signing in
          </Link>
        </footer>
      </main>

      {/* Success Wipe Overlay when camera pushes through */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-50 bg-[#0A0B0E] transition-opacity duration-500 ${
          isSuccess ? "opacity-90" : "opacity-0"
        }`}
      />
    </div>
  );
}
