"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock } from "lucide-react";
import { useAuthShellAnimations } from "./useAuthAnimations";

const HERO_PHOTO =
  "https://images.unsplash.com/photo-1611821064430-0d40291d0f0b?auto=format&fit=crop&w=1600&q=85";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { shellRef, photoWrapRef, photoImgRef } = useAuthShellAnimations();

  return (
    <div
      ref={shellRef}
      className="min-h-screen bg-[#0E0F12] text-[#F2F1ED] flex flex-col lg:grid lg:grid-cols-12"
    >
      {/* Left Photo Panel: Full-bleed on desktop, short header strip on mobile */}
      <aside className="relative h-44 sm:h-52 lg:h-screen lg:sticky lg:top-0 lg:col-span-6 overflow-hidden bg-[#0E0F12]">
        <div
          ref={photoWrapRef}
          className="absolute inset-0 overflow-hidden"
        >
          <div ref={photoImgRef} className="absolute inset-0 will-change-transform">
            <Image
              src={HERO_PHOTO}
              alt="Forged performance wheel and brake hardware"
              fill
              priority
              quality={85}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center opacity-75"
            />
          </div>
          {/* Soft dark gradient overlay for calm readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E0F12] via-[#0E0F12]/45 to-[#0E0F12]/70" />
        </div>

        {/* Overlay content: single ALL-CAPS brand mark, short headline, one trust line */}
        <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8 lg:p-12">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              aria-label="APEX ATELIER Home"
              className="inline-flex items-center gap-2.5 text-[#F2F1ED] focus-visible:outline-2 focus-visible:outline-[#F2F1ED] focus-visible:outline-offset-4"
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
                <path d="M14 14L18 20H10L14 14Z" fill="#B83227" />
              </svg>
              <span className="text-xs font-medium tracking-[0.24em] uppercase">
                APEX ATELIER
              </span>
            </Link>

            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 text-sm text-[#D1D5DB] hover:text-[#F2F1ED] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Catalogue</span>
            </Link>
          </div>

          <div className="hidden lg:block space-y-4 max-w-md">
            <h2 className="font-serif text-4xl font-normal leading-[1.12] text-[#F2F1ED]">
              Precision hardware for drivers who notice every gram.
            </h2>
            <p className="inline-flex items-center gap-2 text-sm text-[#A0A4AE]">
              <Lock className="w-4 h-4 text-[#B83227]" />
              <span>Your session is encrypted</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Right Form Panel: Fits 768px+ comfortably without top clipping */}
      <main className="flex-1 lg:col-span-6 lg:min-h-screen bg-[#14161A] lg:border-l lg:border-white/[0.08] flex flex-col px-6 py-6 sm:px-10 lg:px-14 overflow-y-auto">
        <div className="my-auto w-full max-w-[420px] mx-auto py-2">
          {children}
        </div>
      </main>
    </div>
  );
}
