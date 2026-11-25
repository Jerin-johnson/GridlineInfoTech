"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight } from "lucide-react";
import { HOMEPAGE_EDITORIAL } from "@/config/home-page";

export function HeroSection() {
  const wrapperRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // 1. Crisp Entrance Timeline (runs once on mount)
        const intro = gsap.timeline({ defaults: { ease: "power4.out" } });

        intro
          .fromTo(
            ".hero-bg-img",
            { scale: 1.08, opacity: 0 },
            { scale: 1, opacity: 0.78, duration: 1.4 },
          )
          .fromTo(
            ".hero-title-line",
            { yPercent: 110, opacity: 0 },
            { yPercent: 0, opacity: 1, stagger: 0.12, duration: 1.05 },
            "-=1.0",
          )
          .fromTo(
            ".hero-fade",
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.08, duration: 0.75 },
            "-=0.6",
          );

        // 2. Scroll-Driven "Dolly Into The Car" Experience
        const scrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });

        scrollTl
          // Push camera smoothly into the car's center mass
          .to(
            ".hero-dolly-layer",
            {
              scale: 1.28,
              yPercent: -4,
              ease: "none",
            },
            0,
          )
          // Deepen vignette so the transition into the next section feels seamless
          .to(
            ".hero-scroll-vignette",
            {
              opacity: 0.85,
              ease: "none",
            },
            0,
          )
          // Part the headline upward out of the windshield view
          .to(
            ".hero-headline-group",
            {
              y: -70,
              scale: 0.96,
              opacity: 0,
              ease: "power1.in",
            },
            0,
          )
          // Part the bottom CTAs downward
          .to(
            ".hero-bottom-group",
            {
              y: 36,
              opacity: 0,
              ease: "power1.in",
            },
            0,
          );
      });
    },
    { scope: wrapperRef },
  );

  const { hero } = HOMEPAGE_EDITORIAL;

  return (
    <section
      ref={wrapperRef}
      // Extra 40vh scroll runway gives room for the dolly-in without trapping the user
      className="relative h-[140vh] motion-reduce:h-screen w-full bg-[#080808]"
    >
      {/* Sticky Full-Viewport Stage (zero GSAP pin reparenting overhead) */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center justify-between pt-28 md:pt-32 pb-10 md:pb-14 px-6">
        {/* Camera Dolly Backdrop Layer */}
        <div
          className="hero-dolly-layer absolute inset-0 z-0 will-change-transform"
          style={{ transformOrigin: "50% 58%" }}
        >
          <img
            src={hero.image}
            alt="Luxury performance vehicle in dark studio"
            fetchPriority="high"
            decoding="async"
            className="hero-bg-img w-full h-full object-cover object-center opacity-78"
          />
          {/* Base Studio Lighting Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#080808]/95 via-[#080808]/25 to-[#080808]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,transparent_22%,#080808_88%)]" />
        </div>

        {/* Dynamic Scroll Vignette (darkens smoothly as you push inside) */}
        <div
          aria-hidden="true"
          className="hero-scroll-vignette pointer-events-none absolute inset-0 z-[1] bg-[#080808] opacity-0 will-change-opacity"
        />

        {/* Centered Editorial Headline */}
        <div className="hero-headline-group relative z-10 text-center max-w-4xl mx-auto mt-4 md:mt-8 will-change-transform">
          <p className="hero-fade text-[10px] tracking-[0.32em] uppercase text-zinc-400 mb-4">
            Precision Automotive Hardware
          </p>
          <h1 className="font-serif text-5xl sm:text-7xl md:text-[5.5rem] leading-[0.98] font-light tracking-[-0.02em] text-[#F5F5F3]">
            <span className="block overflow-hidden">
              <span className="hero-title-line block">{hero.titleLine1}</span>
            </span>
            <span className="block overflow-hidden">
              <span className="hero-title-line block">{hero.titleLine2}</span>
            </span>
          </h1>
        </div>

        {/* Bottom Subcopy + Dual CTAs + Scroll Cue */}
        <div className="hero-bottom-group relative z-10 flex flex-col items-center text-center gap-6 max-w-xl mx-auto will-change-transform">
          <p className="hero-fade text-xs md:text-sm text-zinc-400 leading-relaxed tracking-wide">
            {hero.subtitle}
          </p>

          <div className="hero-fade flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/shop"
              className="btn-atelier bg-white/5 backdrop-blur-sm"
            >
              <span>Explore Catalogue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a
              href="#categories"
              className="text-[11px] tracking-[0.22em] uppercase text-zinc-400 hover:text-white px-4 py-3 transition-colors"
            >
              Browse Categories
            </a>
          </div>

          {/* Minimal Scroll-to-Enter Indicator */}
          <div className="hero-fade hidden sm:flex flex-col items-center gap-2 pt-2">
            <span className="text-[9px] tracking-[0.3em] uppercase text-zinc-500">
              Scroll to Enter
            </span>
            <span className="w-[1px] h-7 bg-gradient-to-b from-white/50 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
