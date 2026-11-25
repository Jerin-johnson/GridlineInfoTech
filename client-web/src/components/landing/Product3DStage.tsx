"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Rotate3d, ShieldCheck, ArrowUpRight } from "lucide-react";
import type { ProductSummary } from "@/types/store-front.types";

const ForgedWheel3D = dynamic(() => import("./ForgedWheel3D"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] md:h-[540px] w-full flex items-center justify-center bg-[#0B0B0D] border border-white/10">
      <span className="text-[10px] tracking-[0.25em] uppercase text-zinc-500 animate-pulse">
        Initializing 3D Studio...
      </span>
    </div>
  ),
});

export function Product3DStage({ spotlight }: { spotlight?: ProductSummary }) {
  return (
    <section
      id="studio-3d"
      className="relative w-full bg-[#080808] border-t border-white/10 py-24 px-6 md:px-16"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left: Interactive 3D Viewport */}
        <div className="lg:col-span-7 relative border border-white/10 bg-[#080808]">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/70 border border-white/10 px-3 py-1.5 backdrop-blur-sm">
            <Rotate3d className="w-3.5 h-3.5 text-[#C81E1E]" />
            <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-300">
              Drag to Inspect 360°
            </span>
          </div>
          <ForgedWheel3D />
        </div>

        {/* Right: Technical Specs + Direct Storefront Action */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <span className="text-[10px] tracking-[0.28em] uppercase text-[#C81E1E]">
            Interactive Hardware Spotlight
          </span>
          <h2 className="font-serif text-4xl md:text-6xl font-light leading-[1.04]">
            {spotlight?.name ?? 'FI-R Evo 21" Forged Monoblock'}
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Machined from aerospace-grade T6-6061 forged aluminum with milled
            spoke pockets for minimum rotational inertia. Verified for direct
            center-lock and 6-piston carbon-ceramic caliper clearance.
          </p>

          <div className="grid grid-cols-2 gap-4 py-5 border-y border-white/10 text-xs">
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-500">
                Fitment
              </p>
              <p className="text-zinc-200 mt-1">
                {spotlight?.fitment ?? "992 GT3 / Turbo S"}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-500">
                Price (USD / Crypto)
              </p>
              <p className="text-zinc-200 mt-1 font-medium">
                ${(spotlight?.price ?? 8950).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href={spotlight ? `/products/${spotlight.slug}` : "/shop"}
              className="btn-atelier"
            >
              <span>Inspect Specifications</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>On-chain verified checkout</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
