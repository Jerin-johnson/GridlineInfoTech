interface CatalogueHeaderProps {
  totalProducts: number;
  activeCategoryName?: string;
}

export function CatalogueHeader({
  totalProducts,
  activeCategoryName,
}: CatalogueHeaderProps) {
  return (
    <section className="pt-28 pb-8 md:pt-32 md:pb-10 border-b border-white/10 bg-[#080808] bg-noise">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2.5 max-w-2xl">
          <p className="text-[10px] tracking-[0.28em] uppercase text-[#C81E1E]">
            Performance Hardware Catalogue
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light leading-[1.04] tracking-tight text-[#F5F5F3]">
            {activeCategoryName || "Engineered Components."}
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
            Track-proven forged wheels, titanium exhausts, carbon-ceramic
            braking systems, and dry-carbon aero curated for direct fitment.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 tabular-nums shrink-0">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C81E1E]" />
          <span>
            {totalProducts} {totalProducts === 1 ? "component" : "components"}{" "}
            available
          </span>
        </div>
      </div>
    </section>
  );
}
