import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { formatPriceCents } from "@/lib/api/catalog.api";
import type { CatalogProduct } from "@/types/catalog.types";

interface ProductCardProps {
  product: CatalogProduct;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const sortedImages = [...(product.images || [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const primaryImage =
    sortedImages.find((img) => img.isPrimary)?.url || sortedImages[0]?.url;
  const secondaryImage =
    sortedImages.length > 1
      ? sortedImages.find((img) => img.url !== primaryImage)?.url
      : undefined;

  const brandName =
    typeof product.brand === "object" && product.brand !== null
      ? product.brand.name
      : "";
  const categoryName =
    typeof product.category === "object" && product.category !== null
      ? product.category.name
      : "";

  const available = product.availableStock ?? 0;
  const isOutOfStock =
    product.status === "out_of_stock" || available <= 0;
  const isLowStock =
    !isOutOfStock && available <= (product.lowStockThreshold ?? 5);

  const primaryFitment = product.compatibility?.[0];
  const fitmentText = primaryFitment
    ? `${primaryFitment.make} ${primaryFitment.model} (${primaryFitment.yearFrom}–${primaryFitment.yearTo})`
    : null;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group border border-white/10 bg-[#0D0D0F] hover:border-white/30 transition-colors flex flex-col rounded-none focus-visible:outline-2 focus-visible:outline-[#F5F5F3]"
    >
      {/* Media Container (Stable 4:3 Aspect Ratio) */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
        {primaryImage ? (
          <>
            <Image
              src={primaryImage}
              alt={product.images?.[0]?.alt || product.name}
              fill
              priority={priority}
              quality={80}
              sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, (min-width: 640px) 46vw, 94vw"
              className={`object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${
                secondaryImage ? "group-hover:opacity-0 transition-opacity" : ""
              } ${isOutOfStock ? "opacity-55" : ""}`}
            />
            {secondaryImage && (
              <Image
                src={secondaryImage}
                alt={`${product.name} alternate view`}
                fill
                quality={80}
                sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, (min-width: 640px) 46vw, 94vw"
                className="object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 motion-reduce:hidden"
              />
            )}
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[10px] tracking-[0.22em] uppercase text-zinc-600">
            No Image
          </div>
        )}

        {/* Stock Status Badge */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/75 border border-white/10 px-2.5 py-1 text-[9px] tracking-[0.2em] uppercase text-zinc-200">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOutOfStock
                ? "bg-zinc-500"
                : isLowStock
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }`}
          />
          <span>
            {isOutOfStock
              ? "Out of Stock"
              : isLowStock
                ? `Low Stock (${available})`
                : "In Stock"}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 flex flex-col p-5 gap-3">
        <div className="flex items-center justify-between gap-2 text-[10px] tracking-[0.22em] uppercase text-zinc-400">
          <span className="truncate">
            {[brandName, categoryName].filter(Boolean).join(" · ") ||
              product.sku}
          </span>
          {product.isFeatured && (
            <span className="text-[#C81E1E] shrink-0">Featured</span>
          )}
        </div>

        <h2 className="font-serif text-xl sm:text-2xl font-light leading-snug text-[#F5F5F3] line-clamp-2">
          {product.name}
        </h2>

        {fitmentText && (
          <p className="text-xs text-zinc-400 truncate">{fitmentText}</p>
        )}

        {/* Hairline Price & View Footer */}
        <div className="mt-auto pt-3.5 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base font-medium text-[#F5F5F3]">
              {formatPriceCents(product.price, product.currency)}
            </span>
            {product.compareAtPrice &&
              product.compareAtPrice > product.price && (
                <span className="text-xs text-zinc-500 line-through">
                  {formatPriceCents(product.compareAtPrice, product.currency)}
                </span>
              )}
          </div>

          <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase text-zinc-400 group-hover:text-[#F5F5F3] transition-colors">
            <span>View</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
