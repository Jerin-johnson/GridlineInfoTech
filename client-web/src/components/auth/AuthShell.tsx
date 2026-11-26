"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  editorialTitle: string;
  editorialHighlight: string;
  editorialDescription: string;
  editorialImage: string;
  editorialImageAlt: string;
  children: React.ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  editorialTitle,
  editorialHighlight,
  editorialDescription,
  editorialImage,
  editorialImageAlt,
  children,
}: AuthShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      gsap.from(".auth-car-reveal", {
        opacity: 0,
        scale: 1.04,
        duration: 0.9,
        ease: "power3.out",
        clearProps: "transform,opacity",
      });

      gsap.from(".auth-light-reveal", {
        opacity: 0,
        duration: 1.0,
        delay: 0.1,
        ease: "power2.out",
        clearProps: "opacity",
      });

      gsap.from(".auth-reveal", {
        opacity: 0,
        y: 14,
        duration: 0.6,
        stagger: 0.07,
        ease: "power3.out",
        clearProps: "transform,opacity",
      });
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#080808] text-[#F5F5F3] grid grid-cols-1 lg:grid-cols-12"
    >
      {/* Left Editorial Panel (Desktop) */}
      <aside className="hidden lg:flex lg:col-span-6 relative flex-col justify-between overflow-hidden border-r border-white/10 bg-[#080808] bg-noise p-10 xl:p-14">
        <div className="absolute inset-0 z-0">
          <Image
            src={editorialImage}
            alt={editorialImageAlt}
            fill
            priority
            quality={85}
            sizes="50vw"
            className="auth-car-reveal object-cover object-center opacity-60 grayscale-[35%] contrast-115 brightness-110"
          />
          {/* Restrained overhead silver showroom key light */}
          <div
            aria-hidden="true"
            className="auth-light-reveal absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 75% 52% at 50% 44%, rgba(245,245,243,0.16) 0%, rgba(245,245,243,0.05) 45%, transparent 75%)",
            }}
          />
          {/* Subtle crimson floor/rim accent */}
          <div
            aria-hidden="true"
            className="auth-light-reveal absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 28% at 50% 78%, rgba(200,30,30,0.14) 0%, transparent 72%)",
            }}
          />
          {/* Vignette framing preserving #080808 edges and crisp text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/35 to-[#080808]/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/55 via-transparent to-[#080808]/75" />
        </div>

        {/* Top Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            aria-label="APEX ATELIER Home"
            className="flex items-center gap-3 group focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-4"
          >
            <svg
              width="26"
              height="20"
              viewBox="0 0 28 22"
              fill="none"
              className="text-white transition-transform duration-500 group-hover:scale-105"
            >
              <path
                d="M14 2L26 20H20.5L14 10L7.5 20H2L14 2Z"
                fill="currentColor"
              />
              <path d="M14 14L18 20H10L14 14Z" fill="#C81E1E" />
            </svg>
            <div className="flex flex-col">
              <span className="text-[11px] tracking-[0.34em] uppercase text-[#F5F5F3]">
                APEX ATELIER
              </span>
              <span className="text-[9px] tracking-[0.24em] uppercase text-zinc-500">
                Automotive Engineering
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.24em] uppercase text-zinc-400 hover:text-[#F5F5F3] transition-colors focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Atelier</span>
          </Link>
        </div>

        {/* Bottom Editorial Copy */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="auth-reveal flex items-center gap-3">
            <span className="h-[1px] w-8 bg-[#C81E1E]" />
            <span className="text-[10px] tracking-[0.28em] uppercase text-[#C81E1E]">
              Client Portal
            </span>
          </div>

          <h2 className="auth-reveal font-serif text-5xl xl:text-6xl font-light leading-[1.02] tracking-tight text-[#F5F5F3]">
            {editorialTitle}{" "}
            <span className="text-metallic text-metallic-active italic">
              {editorialHighlight}
            </span>
          </h2>

          <p className="auth-reveal text-sm text-zinc-400 leading-relaxed max-w-md">
            {editorialDescription}
          </p>

          <div className="auth-reveal pt-6 border-t border-white/10 grid grid-cols-2 gap-6 text-[10px] tracking-[0.22em] uppercase text-zinc-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C81E1E]" />
              <span>HttpOnly Session Security</span>
            </div>
            <div className="text-right tabular-nums">
              <span>Sepolia Verified Checkout</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Form Panel */}
      <main className="lg:col-span-6 flex flex-col justify-between min-h-screen bg-[#080808] px-5 py-8 sm:px-10 md:px-14">
        {/* Mobile Header */}
        <header className="flex lg:hidden items-center justify-between pb-6 border-b border-white/10">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-4"
          >
            <svg
              width="22"
              height="17"
              viewBox="0 0 28 22"
              fill="none"
              className="text-white"
            >
              <path
                d="M14 2L26 20H20.5L14 10L7.5 20H2L14 2Z"
                fill="currentColor"
              />
              <path d="M14 14L18 20H10L14 14Z" fill="#C81E1E" />
            </svg>
            <span className="text-[10px] tracking-[0.32em] uppercase text-[#F5F5F3]">
              APEX ATELIER
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Atelier</span>
          </Link>
        </header>

        {/* Centered Architectural Form Container */}
        <div className="flex-1 flex items-center justify-center py-8 sm:py-12">
          <div className="auth-reveal w-full max-w-md border border-white/10 bg-[#0D0D0F] p-7 sm:p-10">
            <div className="mb-8 space-y-2.5">
              <p className="text-[10px] tracking-[0.28em] uppercase text-[#C81E1E]">
                {eyebrow}
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-[#F5F5F3]">
                {title}
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {subtitle}
              </p>
            </div>

            {children}
          </div>
        </div>

        {/* Subtle Footer */}
        <footer className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] tracking-[0.22em] uppercase text-zinc-500">
          <span>APEX ATELIER · Single-Vendor Performance Hardware</span>
          <Link
            href="/shop"
            className="hover:text-[#F5F5F3] transition-colors"
          >
            Browse Catalogue
          </Link>
        </footer>
      </main>
    </div>
  );
}
