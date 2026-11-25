"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HOMEPAGE_EDITORIAL } from "@/config/home-page";

gsap.registerPlugin(ScrollTrigger);

export function CinematicInterlude() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".interlude-wipe",
          { clipPath: "inset(100% 0% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            ease: "none",
            scrollTrigger: {
              trigger: ref.current,
              start: "top center",
              end: "center center",
              scrub: true,
            },
          },
        );
      });
    },
    { scope: ref },
  );

  const { interlude } = HOMEPAGE_EDITORIAL;

  return (
    <section
      ref={ref}
      className="relative w-full bg-[#080808] overflow-hidden border-t border-white/10"
    >
      {/* Top Word */}
      <div className="h-[55vh] flex items-center justify-center px-6">
        <h2 className="font-serif text-6xl sm:text-8xl md:text-[7.5rem] font-light tracking-tight text-[#F5F5F3]">
          {interlude.topWord}
        </h2>
      </div>

      {/* Full-Bleed Top-Down Wipe Image */}
      <div className="interlude-wipe relative h-[70vh] w-full overflow-hidden">
        <img
          src={interlude.wipeImage}
          alt="Top-down performance silhouette"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080808] via-transparent to-[#080808]" />
      </div>

      {/* Bottom Word + Subcopy */}
      <div className="h-[55vh] flex flex-col items-center justify-center text-center px-6 gap-5">
        <h2 className="font-serif text-6xl sm:text-8xl md:text-[7.5rem] font-light tracking-tight text-[#F5F5F3]">
          {interlude.bottomWord}
        </h2>
        <p className="text-xs md:text-sm text-zinc-400 max-w-md leading-relaxed">
          {interlude.subcopy}
        </p>
      </div>
    </section>
  );
}
