"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { HOMEPAGE_EDITORIAL } from "@/config/home-page";
import type { BrandSummary } from "@/types/store-front.types";

export function BrandShowcase({ brands }: { brands: BrandSummary[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const { approach } = HOMEPAGE_EDITORIAL;
  const headingLines = approach.heading.split("\n");

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // 1. Subtle GPU-only parallax on the macro texture backdrop
        gsap.fromTo(
          ".brand-bg-parallax",
          { yPercent: -6, scale: 1.12 },
          {
            yPercent: 6,
            scale: 1.12,
            ease: "none",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.8,
            },
          },
        );

        // 2. Crisp entrance choreography (plays once when entering view)
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 72%",
            once: true,
          },
        });

        tl.fromTo(
          ".brand-overline",
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
          0,
        )
          .fromTo(
            ".brand-heading-line",
            { yPercent: 108, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              stagger: 0.1,
              duration: 0.75,
              ease: "power3.out",
            },
            0.08,
          )
          .fromTo(
            ".brand-divider",
            { scaleX: 0 },
            { scaleX: 1, duration: 0.8, ease: "power3.inOut" },
            0.22,
          )
          .fromTo(
            ".brand-item",
            { y: 18, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              stagger: 0.06,
              duration: 0.55,
              ease: "power3.out",
            },
            0.35,
          )
          .fromTo(
            ".brand-cta-block",
            { y: 16, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
            0.42,
          );
      });
    },
    { scope: sectionRef, dependencies: [brands.length] },
  );

  return (
    <section
      id="brands"
      ref={sectionRef}
      className="relative min-h-[78vh] w-full flex flex-col justify-between px-6 md:px-16 py-20 md:py-24 overflow-hidden border-t border-white/10 bg-[#080808]"
    >
      {/* Full-bleed Macro Texture Backdrop */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="brand-bg-parallax relative w-full h-full will-change-transform">
          <Image
            src={approach.backgroundImage}
            alt="Automotive leather and carbon stitching detail"
            fill
            sizes="100vw"
            className="object-cover opacity-50"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/50 to-[#080808]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_15%_20%,rgba(200,30,30,0.10),transparent_65%)]" />
      </div>

      {/* Top Left Editorial Title */}
      <div className="relative z-10 max-w-2xl">
        <p className="brand-overline text-[10px] tracking-[0.28em] uppercase text-[#C81E1E] mb-4">
          Authorized Performance Partners
        </p>
        <h2 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light leading-[1.02] text-[#F5F5F3]">
          {headingLines.map((line) => (
            <span key={line} className="block overflow-hidden">
              <span className="brand-heading-line block">{line}</span>
            </span>
          ))}
        </h2>
      </div>

      {/* Bottom Row: Animated Hairline + Dynamic Brand Strip + Editorial CTA */}
      <div className="relative z-10 mt-20 pt-10">
        {/* Hairline Divider (draws left-to-right on scroll) */}
        <div
          aria-hidden="true"
          className="brand-divider absolute top-0 inset-x-0 h-px bg-white/15 origin-left"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          {/* Dynamic Brand Roster with Pure-CSS Sibling Dimming */}
          <div className="group/brands lg:col-span-8 flex flex-wrap items-center gap-x-10 gap-y-7">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/shop?brand=${brand.slug}`}
                className="brand-item group/brand relative flex flex-col pb-2 transition-opacity duration-300 group-hover/brands:opacity-35 hover:!opacity-100 focus-visible:!opacity-100 focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-4"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-xl md:text-2xl tracking-[0.16em] text-zinc-200 group-hover/brand:text-white transition-colors">
                    {brand.name}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 opacity-0 -translate-x-1 group-hover/brand:opacity-100 group-hover/brand:translate-x-0 group-hover/brand:text-white transition-all duration-300" />
                </div>
                <span className="text-[9px] tracking-[0.2em] uppercase text-zinc-500 group-hover/brand:text-zinc-300 transition-colors mt-0.5">
                  {brand.tagline}
                </span>
                {/* Crimson Accent Underline */}
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 inset-x-0 h-px bg-[#C81E1E] origin-left scale-x-0 group-hover/brand:scale-x-100 transition-transform duration-300 ease-out"
                />
              </Link>
            ))}
          </div>

          {/* Right Editorial Copy + CTA */}
          <div className="brand-cta-block lg:col-span-4 flex flex-col items-start lg:items-end gap-5">
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed lg:text-right max-w-sm">
              {approach.copy}
            </p>
            <Link href="/shop" className="btn-atelier">
              Explore All Brands
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
