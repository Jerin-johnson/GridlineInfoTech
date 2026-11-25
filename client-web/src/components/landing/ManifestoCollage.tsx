"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { HOMEPAGE_EDITORIAL } from "@/config/home-page";

const TILE_POSITIONS = [
  "left-[8%] top-[24%] w-36 md:w-52",
  "left-[24%] top-[14%] w-44 md:w-64",
  "left-[42%] top-[10%] w-48 md:w-72",
  "right-[20%] top-[18%] w-44 md:w-64",
  "right-[8%] top-[28%] w-40 md:w-56",
];

export function ManifestoCollage() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".cascade-tile",
          { y: 120, opacity: 0, scale: 0.88 },
          {
            y: 0,
            opacity: 0.85,
            scale: 1,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 65%",
              end: "center center",
              scrub: 1.1,
            },
          },
        );
      });
    },
    { scope: sectionRef },
  );

  const { manifesto } = HOMEPAGE_EDITORIAL;

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[85vh] w-full bg-[#080808] bg-noise flex items-center justify-center px-6 py-28 overflow-hidden"
    >
      {/* Cascading Depth Tiles Behind Headline */}
      <div className="absolute inset-0 max-w-6xl mx-auto pointer-events-none md:pointer-events-auto">
        {manifesto.tiles.map((tile, idx) => (
          <Link
            key={tile.label}
            href={`/shop?category=${tile.slug}`}
            className={`cascade-tile group absolute aspect-[4/3] overflow-hidden border border-white/10 shadow-2xl ${TILE_POSITIONS[idx]}`}
          >
            <img
              src={tile.image}
              alt={tile.label}
              className="w-full h-full object-cover brightness-75 group-hover:scale-105 group-hover:brightness-100 transition-all duration-700"
            />
            <span className="absolute bottom-2 left-2.5 text-[9px] tracking-[0.22em] uppercase text-white/80 bg-black/60 px-2 py-0.5 backdrop-blur-sm">
              {tile.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Centered Editorial Manifesto */}
      <div className="relative z-10 text-center max-w-4xl mx-auto pointer-events-none">
        <h2 className="font-serif text-4xl sm:text-6xl md:text-7xl font-light leading-[1.06] tracking-tight text-[#F5F5F3] drop-shadow-[0_12px_32px_rgba(0,0,0,0.95)]">
          {manifesto.line1}
          <br />
          {manifesto.line2}
        </h2>
      </div>
    </section>
  );
}
