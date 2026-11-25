"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { HOMEPAGE_EDITORIAL } from "@/config/home-page";
import type { CategorySummary } from "@/types/store-front.types";

export function CinematicFooter({
  categories,
}: {
  categories: CategorySummary[];
}) {
  const footerRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const xTo = useRef<gsap.QuickToFunc | null>(null);
  const yTo = useRef<gsap.QuickToFunc | null>(null);

  const [cursorActive, setCursorActive] = useState(false);
  const [cursorLabel, setCursorLabel] = useState<string>("");

  const { footer } = HOMEPAGE_EDITORIAL;

  // 1. GSAP Entrance + Smooth Cursor Tracking Setup
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Entrance choreography
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 72%",
            once: true,
          },
        });

        tl.fromTo(
          ".footer-bg-scale",
          { scale: 1.08 },
          { scale: 1, duration: 1.2, ease: "power3.out" },
          0,
        )
          .fromTo(
            ".footer-overline",
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
            0.05,
          )
          .fromTo(
            ".footer-title-line",
            { yPercent: 108, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              stagger: 0.1,
              duration: 0.85,
              ease: "power3.out",
            },
            0.12,
          )
          .fromTo(
            ".footer-cta-fade",
            { y: 18, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              stagger: 0.08,
              duration: 0.6,
              ease: "power3.out",
            },
            0.35,
          )
          .fromTo(
            ".footer-divider",
            { scaleX: 0 },
            { scaleX: 1, duration: 0.8, ease: "power3.inOut" },
            0.3,
          );
      });

      // Custom cursor quickTo (desktop pointer devices only)
      mm.add("(min-width: 1024px) and (pointer: fine)", () => {
        if (!cursorRef.current) return;
        xTo.current = gsap.quickTo(cursorRef.current, "x", {
          duration: 0.22,
          ease: "power3.out",
        });
        yTo.current = gsap.quickTo(cursorRef.current, "y", {
          duration: 0.22,
          ease: "power3.out",
        });
      });
    },
    { scope: footerRef },
  );

  // Zero-re-render mouse tracking for spotlight & custom cursor
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update CSS variables directly to light up that side of the car
    stage.style.setProperty("--mx", `${x}px`);
    stage.style.setProperty("--my", `${y}px`);

    xTo.current?.(x);
    yTo.current?.(y);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer
      ref={footerRef}
      className="relative w-full bg-[#080808] border-t border-white/10 overflow-hidden"
    >
      {/* Closing Cinematic Banner with Interactive Spotlight & Custom Cursor */}
      <div
        ref={stageRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setCursorActive(true)}
        onMouseLeave={() => {
          setCursorActive(false);
          setCursorLabel("");
        }}
        style={
          {
            "--mx": "50%",
            "--my": "50%",
          } as React.CSSProperties
        }
        className="relative min-h-[84vh] flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden lg:cursor-none"
      >
        {/* Base Layer: Dimmed Silhouette */}
        <div className="footer-bg-scale pointer-events-none absolute inset-0 z-0 will-change-transform">
          <Image
            src={footer.image}
            alt="Rear silhouette of dark performance car"
            fill
            sizes="100vw"
            className="object-cover opacity-22"
          />
        </div>

        {/* Illuminated Layer: Lights up whichever side the mouse is on */}
        <div
          aria-hidden="true"
          className={`footer-bg-scale pointer-events-none absolute inset-0 z-[1] transition-opacity duration-500 will-change-transform ${
            cursorActive ? "opacity-100" : "opacity-0"
          }`}
          style={{
            WebkitMaskImage:
              "radial-gradient(460px circle at var(--mx) var(--my), rgba(0,0,0,1) 0%, rgba(0,0,0,0.45) 45%, transparent 78%)",
            maskImage:
              "radial-gradient(460px circle at var(--mx) var(--my), rgba(0,0,0,1) 0%, rgba(0,0,0,0.45) 45%, transparent 78%)",
          }}
        >
          <Image
            src={footer.image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-80 brightness-125 contrast-110"
          />
        </div>

        {/* Interactive Crimson + Studio Rim Glow following pointer */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 z-[2] transition-opacity duration-500 ${
            cursorActive ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "radial-gradient(520px circle at var(--mx) var(--my), rgba(200, 30, 30, 0.22), rgba(255, 255, 255, 0.05) 35%, transparent 70%)",
          }}
        />

        {/* Studio Top & Bottom Vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-[#080808] via-[#080808]/45 to-[#080808]"
        />

        {/* Custom Reticle Cursor (Desktop Pointer Only) */}
        <div
          ref={cursorRef}
          aria-hidden="true"
          className={`hidden lg:flex pointer-events-none absolute top-0 left-0 z-30 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-[width,height,opacity,border-color,background-color] duration-300 ease-out will-change-transform ${
            cursorActive ? "opacity-100" : "opacity-0"
          } ${
            cursorLabel
              ? "w-20 h-20 border-[#C81E1E] bg-[#080808]/75 backdrop-blur-sm"
              : "w-10 h-10 border-white/40 bg-white/[0.03]"
          }`}
        >
          {cursorLabel ? (
            <span className="text-[9px] tracking-[0.26em] uppercase text-white">
              {cursorLabel}
            </span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-[#C81E1E]" />
          )}
        </div>

        {/* Center Editorial Content */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          <span className="footer-overline text-[10px] tracking-[0.34em] uppercase text-[#C81E1E]">
            {footer.overline}
          </span>

          <h2 className="font-serif text-6xl sm:text-8xl md:text-9xl font-normal leading-[0.94] tracking-[-0.02em] text-[#F5F5F3]">
            <span className="block overflow-hidden">
              <span className="footer-title-line block">
                {footer.titleLine1}
              </span>
            </span>
            <span className="block overflow-hidden">
              <span className="footer-title-line block">
                {footer.titleLine2}
              </span>
            </span>
          </h2>

          <div className="footer-cta-fade pt-4">
            <Link
              href="/shop"
              onMouseEnter={() => setCursorLabel("ENTER")}
              onMouseLeave={() => setCursorLabel("")}
              className="btn-atelier bg-[#080808]/60 backdrop-blur-sm lg:cursor-none"
            >
              <span>Start Your Build</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Back To Top Trigger */}
        <button
          type="button"
          onClick={scrollToTop}
          onMouseEnter={() => setCursorLabel("TOP")}
          onMouseLeave={() => setCursorLabel("")}
          className="footer-cta-fade relative z-10 mt-16 inline-flex items-center gap-2.5 text-[10px] tracking-[0.28em] uppercase text-zinc-400 hover:text-white transition-colors cursor-pointer lg:cursor-none"
        >
          <span>Back To Top</span>
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Storefront Sitemap Bar */}
      <div className="relative px-6 md:px-16 py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-[11px] tracking-[0.18em] uppercase text-zinc-500">
        <div
          aria-hidden="true"
          className="footer-divider absolute top-0 inset-x-0 h-px bg-white/10 origin-left"
        />

        <span>© 2026 APEX ATELIER. All Rights Reserved.</span>

        <div className="flex flex-wrap items-center justify-center gap-6">
          {categories.slice(0, 4).map((c) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.slug}`}
              className="hover:text-white transition-colors"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/account/orders"
            className="hover:text-white transition-colors"
          >
            Track Order
          </Link>
        </div>
      </div>
    </footer>
  );
}
