"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock } from "lucide-react";
import { useAuthShellAnimations } from "./useAuthAnimations";

const HERO_PHOTO =
  "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1800&q=85";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { shellRef, photoRef } = useAuthShellAnimations();

  return (
    <div
      ref={shellRef}
      className="min-h-screen bg-[#080808] text-[#F5F5F3] flex flex-col lg:grid lg:grid-cols-12"
    >
      {/* Desktop Left Editorial Stage (58% width): Natural vehicle lighting + edge-only scrims */}
      <aside className="hidden lg:flex lg:col-span-7 relative h-screen sticky top-0 overflow-hidden bg-[#080808] flex-col justify-between p-10 xl:p-14">
        <div
          ref={photoRef}
          className="absolute inset-0 z-0 will-change-transform"
        >
          <Image
            src={HERO_PHOTO}
            alt="Performance coupe in dark studio lighting"
            fill
            priority
            quality={85}
            sizes="58vw"
            className="object-cover object-center"
          />
          {/* Top edge scrim for brand mark legibility */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#080808]/85 to-transparent" />
          {/* Bottom edge scrim for editorial line & trust note */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#080808] via-[#080808]/70 to-transparent" />
        </div>

        {/* Top Bar: Single ALL-CAPS brand mark + guest catalogue link */}
        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            aria-label="APEX ATELIER Home"
            className="inline-flex items-center gap-2.5 text-[#F5F5F3] focus-visible:outline-2 focus-visible:outline-[#F5F5F3] focus-visible:outline-offset-4"
          >
            <svg
              width="24"
              height="18"
              viewBox="0 0 28 22"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M14 2L26 20H20.5L14 10L7.5 20H2L14 2Z"
                fill="currentColor"
              />
              <path d="M14 14L18 20H10L14 14Z" fill="#C81E1E" />
            </svg>
            <span className="text-xs font-medium tracking-[0.24em] uppercase">
              APEX ATELIER
            </span>
          </Link>

          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm text-[#F5F5F3]/85 hover:text-[#F5F5F3] transition-colors focus-visible:outline-2 focus-visible:outline-[#F5F5F3] focus-visible:outline-offset-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Browse catalogue</span>
          </Link>
        </div>

        {/* Bottom Editorial Line & Single Trust Note */}
        <div className="relative z-10 space-y-3 max-w-md">
          <h2 className="font-serif text-4xl font-normal leading-[1.1] text-[#F5F5F3]">
            Engineered for drivers who notice every gram.
          </h2>
          <p className="inline-flex items-center gap-2 text-sm text-zinc-300">
            <Lock className="w-3.5 h-3.5 text-[#C81E1E]" />
            <span>Your session is encrypted</span>
          </p>
        </div>
      </aside>

      {/* Right Form Column (42% on desktop, intentional distraction-free flow on mobile) */}
      <main className="flex-1 lg:col-span-5 min-h-screen bg-[#0D0D0F] lg:border-l lg:border-white/10 flex flex-col px-6 py-6 sm:px-10 xl:px-14 overflow-y-auto">
        {/* Intentional Mobile Header (< 1024px): Clean bar without a cramped photo strip */}
        <header className="flex lg:hidden items-center justify-between pb-5 border-b border-white/10">
          <Link
            href="/"
            aria-label="APEX ATELIER Home"
            className="inline-flex items-center gap-2.5 text-[#F5F5F3]"
          >
            <svg
              width="22"
              height="17"
              viewBox="0 0 28 22"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M14 2L26 20H20.5L14 10L7.5 20H2L14 2Z"
                fill="currentColor"
              />
              <path d="M14 14L18 20H10L14 14Z" fill="#C81E1E" />
            </svg>
            <span className="text-xs font-medium tracking-[0.24em] uppercase">
              APEX ATELIER
            </span>
          </Link>

          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-[#F5F5F3] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Catalogue</span>
          </Link>
        </header>

        <div className="my-auto w-full max-w-[420px] mx-auto py-6 lg:py-4">
          {children}
        </div>
      </main>
    </div>
  );
}
