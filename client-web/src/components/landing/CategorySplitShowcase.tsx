"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import type { CategorySummary } from "@/types/store-front.types";

const pad = (n: number) => String(n + 1).padStart(2, "0");

const WIPE_DURATION = 0.85;
const WIPE_EASE = "power4.inOut";

export function CategorySplitShowcase({
  categories,
}: {
  categories: CategorySummary[];
}) {
  const rootRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const pinnedRef = useRef(false);
  const activeRef = useRef(0); // what the UI currently shows
  const prevRef = useRef(0); // last index we animated to
  const busyRef = useRef(false); // a transition is running
  const queuedRef = useRef<number | null>(null); // latest request during a transition

  const last = Math.max(categories.length - 1, 0);
  const [active, setActive] = useState(0);

  /**
   * Request a category. If a transition is running, remember only the latest
   * request and apply it when the current one finishes. No jumps, no flicker.
   */
  const select = (idx: number) => {
    if (busyRef.current) {
      queuedRef.current = idx;
      return;
    }
    if (idx === activeRef.current) return;
    activeRef.current = idx;
    setActive(idx);
  };

  /* 1. Desktop pin + snap (unchanged behaviour) */
  useGSAP(
    () => {
      if (last < 1) return;
      const mm = gsap.matchMedia();

      mm.add(
        "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        () => {
          pinnedRef.current = true;

          stRef.current = ScrollTrigger.create({
            trigger: rootRef.current,
            start: "top top",
            end: () => `+=${Math.round(window.innerHeight * 0.6 * last)}`,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            snap: {
              snapTo: 1 / last,
              duration: { min: 0.12, max: 0.3 },
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
    { scope: rootRef, dependencies: [last] },
  );

  /* 2. Transition. Runs only when `active` changes, one at a time. */
  useGSAP(
    () => {
      const from = prevRef.current;
      const to = active;
      if (from === to || !rootRef.current) return;

      const q = gsap.utils.selector(rootRef);
      const imgWraps = q("[data-cat-img]") as HTMLElement[];
      const copyPanels = q("[data-cat-copy]") as HTMLElement[];
      const masks = q("[data-mask]") as HTMLElement[];
      const mark = q("[data-mark]")[0] as HTMLElement | undefined;
      const edge = q("[data-edge]")[0] as HTMLElement | undefined;

      const inWrap = imgWraps[to];
      const outWrap = imgWraps[from];
      const inCopy = copyPanels[to];
      const outCopy = copyPanels[from];
      if (!inWrap || !outWrap || !inCopy || !outCopy) return;

      prevRef.current = to;
      busyRef.current = true;

      // Release the lock and apply the newest queued request, if any.
      const done = () => {
        busyRef.current = false;
        const next = queuedRef.current;
        queuedRef.current = null;
        if (next !== null) select(next);
      };

      const dir = to > from ? 1 : -1;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (!pinnedRef.current && progressRef.current && last > 0) {
        progressRef.current.style.transform = `scaleX(${to / last})`;
      }

      /* Reduced motion: quick crossfade, no movement */
      if (reduce) {
        gsap.set(inCopy.querySelectorAll("[data-reveal],[data-mask]"), {
          clearProps: "transform,opacity,visibility",
        });
        gsap.set(inWrap, { zIndex: 2, clipPath: "inset(0% 0% 0% 0%)" });
        gsap.set(outWrap, { zIndex: 1 });
        gsap.to([outWrap, outCopy], { autoAlpha: 0, duration: 0.18 });
        gsap.fromTo(
          [inWrap, inCopy],
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.22, onComplete: done },
        );
        return;
      }

      const inImg = inWrap.querySelector("img");
      const outImg = outWrap.querySelector("img");
      const inMask = masks[to];
      const outMask = masks[from];
      const stageH = (inWrap.parentElement as HTMLElement).clientHeight;
      const startClip =
        dir > 0 ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 100% 0%)";

      // Promote layers only while they animate.
      const layers = [inWrap, inImg, outImg].filter(Boolean) as HTMLElement[];
      gsap.set(layers, { willChange: "transform, clip-path" });

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(layers, { willChange: "auto" });
          done();
        },
      });

      /* IMAGE: directional curtain wipe + depth */
      tl.set(inWrap, { autoAlpha: 1, zIndex: 2, clipPath: startClip }, 0)
        .set(outWrap, { zIndex: 1 }, 0)
        .to(
          inWrap,
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: WIPE_DURATION,
            ease: WIPE_EASE,
          },
          0,
        )
        .fromTo(
          inImg,
          { scale: 1.14, yPercent: 5 * dir },
          { scale: 1, yPercent: 0, duration: 1, ease: "power3.out" },
          0,
        )
        .to(
          outImg,
          {
            scale: 1.05,
            yPercent: -8 * dir,
            duration: WIPE_DURATION,
            ease: "power2.inOut",
          },
          0,
        )
        .set(outWrap, { autoAlpha: 0 }, WIPE_DURATION)
        .set(outImg, { scale: 1, yPercent: 0 }, WIPE_DURATION);

      /* Crimson hairline riding the leading edge of the wipe */
      if (edge) {
        tl.fromTo(
          edge,
          { y: dir > 0 ? stageH : 0, autoAlpha: 1 },
          { y: dir > 0 ? 0 : stageH, duration: WIPE_DURATION, ease: WIPE_EASE },
          0,
        ).set(edge, { autoAlpha: 0 }, WIPE_DURATION);
      }

      /* COPY: heading slides out of a mask; supporting lines lift in */
      tl.to(
        outCopy.querySelectorAll("[data-reveal]"),
        {
          autoAlpha: 0,
          y: -12 * dir,
          duration: 0.25,
          ease: "power2.in",
          stagger: 0.02,
        },
        0,
      )
        .to(
          outMask,
          { yPercent: -110 * dir, duration: 0.4, ease: "power3.in" },
          0,
        )
        .set(outCopy, { autoAlpha: 0 }, 0.4)
        .set(inCopy, { autoAlpha: 1 }, 0.3)
        .fromTo(
          inMask,
          { yPercent: 110 * dir },
          { yPercent: 0, duration: 0.7, ease: "expo.out" },
          0.3,
        )
        .fromTo(
          inCopy.querySelectorAll("[data-reveal]"),
          { autoAlpha: 0, y: 20 * dir },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            ease: "power3.out",
            stagger: 0.05,
          },
          0.34,
        );

      /* Watermark number rolls in with the rest */
      if (mark) {
        tl.fromTo(
          mark,
          { yPercent: 10 * dir, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out" },
          0.1,
        );
      }
    },
    { dependencies: [active], scope: rootRef },
  );

  const goTo = (idx: number) => {
    const st = stRef.current;
    if (st && last > 0) {
      const y = st.start + (st.end - st.start) * (idx / last);
      window.scrollTo({ top: y });
    } else {
      select(idx);
    }
  };

  if (categories.length === 0) return null;

  return (
    <section
      id="categories"
      ref={rootRef}
      aria-label="Product Categories"
      className="relative isolate w-full bg-[#080808] overflow-hidden lg:h-svh"
    >
      {/* Announces the change for screen readers */}
      <p className="sr-only" aria-live="polite">
        {categories[active]?.name}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
        {/* LEFT: editorial stage */}
        <div className="relative order-2 lg:order-1 flex flex-col justify-center px-6 sm:px-10 md:px-16 lg:px-20 py-16 lg:py-0 bg-[#080808] bg-noise overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_18%_45%,rgba(200,30,30,0.11),transparent_68%)]"
          />

          <span
            data-mark
            aria-hidden="true"
            className="pointer-events-none select-none absolute -right-6 top-1/2 -translate-y-1/2 font-serif text-[13rem] xl:text-[17rem] leading-none text-white/[0.025] tabular-nums"
          >
            {pad(active)}
          </span>

          <div className="relative z-10 max-w-md w-full flex flex-col">
            <div className="grid">
              {categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  data-cat-copy
                  inert={idx !== active}
                  aria-hidden={idx !== active}
                  className={`col-start-1 row-start-1 flex flex-col gap-6 ${
                    idx === 0 ? "" : "invisible opacity-0"
                  }`}
                >
                  <div
                    data-reveal
                    className="flex items-center justify-between text-[10px] tracking-[0.26em] uppercase text-zinc-500"
                  >
                    <span className="tabular-nums">
                      Department {pad(idx)} / {pad(last)}
                    </span>
                    <span className="text-zinc-200 tabular-nums">
                      {cat.productCount} Parts In Stock
                    </span>
                  </div>

                  {/* Mask: heading slides up from behind a clip line.
                      Negative margin cancels the padding so layout is unchanged. */}
                  <div className="overflow-hidden py-[0.08em] -my-[0.08em]">
                    <h2
                      data-mask
                      className="font-serif text-5xl sm:text-6xl xl:text-[4.75rem] font-normal leading-[1.02] tracking-[-0.015em] text-metallic text-metallic-active"
                    >
                      {cat.name}
                    </h2>
                  </div>

                  <p
                    data-reveal
                    className="text-sm text-zinc-400 leading-relaxed min-h-[68px]"
                  >
                    {cat.description}
                  </p>

                  <div data-reveal className="pt-2">
                    <Link
                      href={`/shop?category=${cat.slug}`}
                      className="btn-atelier"
                    >
                      <span>Explore {cat.name}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <nav
              aria-label="Category selector"
              className="mt-12 pt-6 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-3"
            >
              {categories.map((cat, idx) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => goTo(idx)}
                  aria-current={idx === active ? "true" : undefined}
                  className={`relative pb-1.5 text-[10px] tracking-[0.22em] uppercase transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-4 ${
                    idx === active
                      ? "text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {cat.name}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0 inset-x-0 h-[1.5px] bg-[#C81E1E] origin-left transition-transform duration-300 ${
                      idx === active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* RIGHT: full-bleed image stage */}
        <div className="relative order-1 lg:order-2 h-[52vh] sm:h-[60vh] lg:h-full w-full overflow-hidden bg-[#080808]">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              data-cat-img
              className={`absolute inset-0 ${idx === 0 ? "" : "invisible opacity-0"}`}
            >
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}

          {/* Wipe leading edge (hidden until a transition runs) */}
          <div
            data-edge
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px] invisible bg-[#C81E1E] shadow-[0_0_14px_rgba(200,30,30,0.85)]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 hidden lg:block bg-gradient-to-r from-[#080808] via-[#080808]/40 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#080808]/70 via-transparent to-[#080808]/20"
          />
        </div>
      </div>

      <div
        aria-hidden="true"
        className="hidden lg:block absolute bottom-0 inset-x-0 z-20 h-[2px] bg-white/10 pointer-events-none"
      >
        <div
          ref={progressRef}
          className="h-full bg-[#C81E1E] origin-left scale-x-0 will-change-transform"
        />
      </div>
    </section>
  );
}
