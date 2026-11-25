"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { HOMEPAGE_EDITORIAL } from "@/config/home-page";

const pad = (i: number) => String(i + 1).padStart(2, "0");

export function PillarsPinned() {
  const root = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const pinnedRef = useRef(false);
  const activeRef = useRef(0);
  const prevRef = useRef(0);

  const pillars = HOMEPAGE_EDITORIAL.pillars;
  const last = pillars.length - 1;
  const [active, setActive] = useState(0);

  const select = (i: number) => {
    if (i === activeRef.current) return;
    activeRef.current = i;
    setActive(i);
  };

  /* 1. Fast Pin + Snap (desktop, motion allowed). */
  useGSAP(
    () => {
      if (last < 1) return;
      const mm = gsap.matchMedia();
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          pinnedRef.current = true;
          stRef.current = ScrollTrigger.create({
            trigger: root.current,
            start: "top top",
            // Shorter runway (0.55vh per step) keeps scrolling fast & effortless
            end: () => `+=${Math.round(window.innerHeight * 0.55 * last)}`,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            snap: {
              snapTo: 1 / last,
              duration: { min: 0.12, max: 0.28 },
              delay: 0.02,
              ease: "power2.out",
            },
            onUpdate: (self) => {
              if (progressRef.current) {
                progressRef.current.style.transform = `scaleX(${self.progress})`;
              }
              select(Math.round(self.progress * last));
            },
          });
          return () => {
            pinnedRef.current = false;
            stRef.current = null;
          };
        },
      );
    },
    { scope: root, dependencies: [last] },
  );

  /* 2. Snappy, overlapping transition between pillars. */
  useGSAP(
    () => {
      const from = prevRef.current;
      const to = active;
      if (from === to || !root.current) return;
      prevRef.current = to;

      tlRef.current?.progress(1).kill();

      const q = gsap.utils.selector(root);
      const imgs = q("[data-img]") as HTMLElement[];
      const copies = q("[data-copy]") as HTMLElement[];
      const inWrap = imgs[to];
      const outWrap = imgs[from];
      const inCopy = copies[to];
      const outCopy = copies[from];
      const dir = to > from ? 1 : -1;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (!pinnedRef.current && progressRef.current) {
        progressRef.current.style.transform = `scaleX(${to / Math.max(last, 1)})`;
      }

      if (reduce) {
        gsap.to([outWrap, outCopy], { autoAlpha: 0, duration: 0.15 });
        gsap.set([inWrap, inCopy], { zIndex: 2 });
        gsap.fromTo(
          [inWrap, inCopy],
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.2 },
        );
        gsap.set(inCopy.querySelectorAll("[data-reveal]"), {
          autoAlpha: 1,
          y: 0,
        });
        return;
      }

      const inImg = inWrap.querySelector("img");
      const outImg = outWrap.querySelector("img");
      const hidden = dir > 0 ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 100% 0%)";

      const tl = gsap.timeline();
      tlRef.current = tl;

      // Foreground image: crisp 0.55s directional wipe + subtle scale settle
      tl.set(inWrap, { autoAlpha: 1, zIndex: 2, clipPath: hidden }, 0)
        .set(outWrap, { zIndex: 1 }, 0)
        .to(
          inWrap,
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.55,
            ease: "power3.inOut",
          },
          0,
        )
        .fromTo(
          inImg,
          { scale: 1.12 },
          { scale: 1, duration: 0.75, ease: "power3.out" },
          0,
        )
        .to(outImg, { scale: 1.04, duration: 0.5, ease: "power2.inOut" }, 0)
        .set(outWrap, { autoAlpha: 0 }, 0.55);

      // Copy: rapid exit (0.2s) overlapped with incoming reveal at 0.18s
      tl.to(
        outCopy.querySelectorAll("[data-reveal]"),
        {
          autoAlpha: 0,
          y: -14 * dir,
          duration: 0.2,
          ease: "power2.in",
          stagger: 0.02,
        },
        0,
      )
        .set(outCopy, { autoAlpha: 0 }, 0.2)
        .set(inCopy, { autoAlpha: 1 }, 0.18)
        .fromTo(
          inCopy.querySelectorAll("[data-reveal]"),
          { autoAlpha: 0, y: 18 * dir },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.45,
            ease: "power3.out",
            stagger: 0.045,
          },
          0.18,
        );
    },
    { dependencies: [active], scope: root },
  );

  const goTo = (i: number) => {
    const st = stRef.current;
    if (st) {
      const y = st.start + (st.end - st.start) * (i / last);
      window.scrollTo({ top: y });
    } else {
      select(i);
    }
  };

  return (
    <section
      ref={root}
      aria-label="Pillars"
      className="relative isolate w-full overflow-hidden border-t border-white/10 bg-[#080808] md:h-svh"
    >
      {/* Atmospheric Background Image + Studio Gradient (GPU opacity-only crossfade) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {pillars.map((p, i) => (
          <div
            key={`bg-${p.title}`}
            className={`absolute inset-0 transition-opacity duration-500 ease-out ${
              i === active ? "opacity-35" : "opacity-0"
            }`}
          >
            <Image
              src={p.image}
              alt=""
              fill
              sizes="20vw"
              className="object-cover scale-110 blur-2xl"
            />
          </div>
        ))}
        {/* Studio obsidian vignette + subtle crimson rim glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/85 via-[#080808]/65 to-[#080808]/95" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080808] via-transparent to-[#080808]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_22%_50%,rgba(200,30,30,0.14),transparent_65%)]" />
      </div>

      <div className="mx-auto grid h-full max-w-7xl grid-cols-1 items-center gap-10 px-6 py-20 md:grid-cols-12 md:gap-12 md:px-12 md:py-0">
        {/* IMAGE: tall panel, all images stacked and wiped */}
        <div className="md:col-span-6">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden bg-zinc-900 ring-1 ring-white/15 md:mx-0 md:aspect-auto md:h-[min(72svh,640px)] md:max-w-none">
            {pillars.map((p, i) => (
              <div
                key={p.title}
                data-img
                className={`absolute inset-0 will-change-transform ${
                  i === 0 ? "" : "invisible opacity-0"
                }`}
              >
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/50 via-transparent to-transparent"
            />
          </div>
        </div>

        {/* COPY: all panels share one grid cell, zero layout shift */}
        <div className="flex flex-col md:col-span-5 md:col-start-8">
          <div className="mb-6 flex justify-end text-[11px] uppercase tracking-[0.28em] text-zinc-400">
            <span aria-live="polite" className="tabular-nums">
              {pad(active)} / {pad(last)}
            </span>
          </div>

          <div className="grid">
            {pillars.map((p, i) => (
              <div
                key={p.title}
                data-copy
                inert={i !== active}
                aria-hidden={i !== active}
                className={`col-start-1 row-start-1 flex flex-col gap-6 ${
                  i === 0 ? "" : "invisible opacity-0"
                }`}
              >
                <span
                  data-reveal
                  className="text-[11px] uppercase tracking-[0.28em] text-[#C81E1E]"
                >
                  {p.index}
                </span>
                <h2
                  data-reveal
                  className="font-serif text-5xl font-light text-[#F5F5F3] md:text-7xl"
                >
                  {p.title}
                </h2>
                <p
                  data-reveal
                  className="max-w-md text-sm leading-relaxed text-zinc-300 md:text-base"
                >
                  {p.description}
                </p>
                <div data-reveal className="pt-2">
                  <Link href={p.ctaHref} className="btn-atelier">
                    {p.ctaLabel}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <nav
            aria-label="Pillars"
            className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-5"
          >
            {pillars.map((p, i) => (
              <button
                key={p.title}
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === active}
                aria-label={`Show ${p.title}`}
                className={`relative text-[10px] uppercase tracking-[0.22em] transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600 ${
                  i === active
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-x-0 -top-5 h-px origin-left bg-white transition-transform duration-300 ${
                    i === active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
                {pad(i)}
                <span className="hidden md:inline"> &nbsp;{p.title}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Progress track (desktop only) */}
      <div className="absolute inset-x-6 bottom-8 hidden h-px bg-white/15 md:inset-x-12 md:block">
        <div
          ref={progressRef}
          className="h-full origin-left scale-x-0 bg-white"
        />
      </div>
    </section>
  );
}
