import type { CatalogProduct } from "@/types/catalog.types";

interface ProductSpecsAndFitmentProps {
  product: CatalogProduct;
}

export function ProductSpecsAndFitment({
  product,
}: ProductSpecsAndFitmentProps) {
  const specs = product.specifications ?? [];
  const compatibility = product.compatibility ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-10 border-t border-[#222228]">
      {/* Technical Specifications */}
      <section aria-labelledby="specs-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2
            id="specs-heading"
            className="font-serif text-xl sm:text-2xl font-normal text-[#F5F5F3]"
          >
            Technical Specifications
          </h2>
          <span className="text-[10px] tracking-[0.22em] uppercase text-[#A1A1AA]">
            Engineering Data
          </span>
        </div>

        {specs.length > 0 ? (
          <dl className="border border-[#222228] bg-[#0D0D0F] divide-y divide-[#222228]">
            {specs.map((spec, idx) => (
              <div
                key={`${spec.key}-${idx}`}
                className="px-5 py-3.5 flex items-baseline justify-between gap-6"
              >
                <dt className="text-xs tracking-[0.14em] uppercase text-[#A1A1AA]">
                  {spec.key}
                </dt>
                <dd className="text-sm text-[#F5F5F3] text-right tabular-nums">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="border border-[#222228] bg-[#0D0D0F] px-5 py-6 text-xs text-[#A1A1AA]">
            Detailed dimensional specifications are verified per SKU upon order
            allocation.
          </div>
        )}
      </section>

      {/* Vehicle Fitment */}
      <section aria-labelledby="fitment-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2
            id="fitment-heading"
            className="font-serif text-xl sm:text-2xl font-normal text-[#F5F5F3]"
          >
            Vehicle Fitment
          </h2>
          <span className="text-[10px] tracking-[0.22em] uppercase text-[#A1A1AA]">
            Chassis Compatibility
          </span>
        </div>

        {compatibility.length > 0 ? (
          <div className="border border-[#222228] bg-[#0D0D0F] divide-y divide-[#222228]">
            {compatibility.map((fitment, idx) => {
              const yearRange =
                fitment.yearFrom === fitment.yearTo
                  ? String(fitment.yearFrom)
                  : `${fitment.yearFrom}–${fitment.yearTo}`;
              return (
                <div
                  key={`${fitment.make}-${fitment.model}-${idx}`}
                  className="px-5 py-3.5 space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm font-medium text-[#F5F5F3]">
                      {fitment.make} {fitment.model}
                    </span>
                    <span className="text-xs tracking-[0.14em] text-[#A1A1AA] tabular-nums shrink-0">
                      {yearRange}
                    </span>
                  </div>
                  {fitment.notes && (
                    <p className="text-xs text-[#A1A1AA]">{fitment.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-[#222228] bg-[#0D0D0F] px-5 py-6 text-xs text-[#A1A1AA]">
            Universal or chassis-specific fitment — confirm SKU{" "}
            <span className="text-[#F5F5F3] tabular-nums">{product.sku}</span>{" "}
            against your build sheet before installation.
          </div>
        )}
      </section>
    </div>
  );
}
