"use client";

import { useState, useMemo, useCallback, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Box,
  ImageIcon,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ProductImageLightbox } from "@/components/product/ProductImageLightbox";
import type { CatalogImage, CatalogProduct } from "@/types/catalog.types";

const OPTIMIZED_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
  "res.cloudinary.com",
]);

function isOptimizedHost(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    const parsed = new URL(src);
    return OPTIMIZED_IMAGE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function isWheelEligibleProduct(product: CatalogProduct): boolean {
  const categorySlug =
    typeof product.category === "object" && product.category !== null
      ? product.category.slug.toLowerCase()
      : "";
  const categoryName =
    typeof product.category === "object" && product.category !== null
      ? product.category.name.toLowerCase()
      : "";
  const isWheelCategory =
    categorySlug.includes("wheel") || categoryName.includes("wheel");
  if (!isWheelCategory) return false;

  return /\b(wheel|wheels|rim|rims|monoblock)\b/i.test(product.name);
}

function formatImageCounter(index: number, total: number): string {
  const current = String(index + 1).padStart(2, "0");
  const max = String(total).padStart(2, "0");
  return `${current} / ${max}`;
}

function Wheel3DLoadingFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0D0D0F] text-[#A1A1AA] gap-3">
      <div className="w-8 h-8 border border-[#222228] border-t-[#C81E1E] animate-spin motion-reduce:animate-none" />
      <p className="text-[11px] tracking-[0.22em] uppercase">
        Initializing 3D Studio
      </p>
    </div>
  );
}

const LazyForgedWheel3D = dynamic(
  () => import("@/components/landing/ForgedWheel3D"),
  {
    ssr: false,
    loading: () => <Wheel3DLoadingFallback />,
  },
);

interface ProductMediaGalleryProps {
  product: CatalogProduct;
}

export function ProductMediaGallery({ product }: ProductMediaGalleryProps) {
  const sortedImages = useMemo<CatalogImage[]>(() => {
    if (!product.images || product.images.length === 0) return [];
    return [...product.images].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }, [product.images]);

  const isWheel = useMemo(() => isWheelEligibleProduct(product), [product]);
  const [viewMode, setViewMode] = useState<"images" | "3d">("images");
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  const safeIndex =
    sortedImages.length > 0
      ? Math.min(activeIndex, sortedImages.length - 1)
      : 0;
  const activeImage = sortedImages[safeIndex];
  const hasValidActiveImage =
    Boolean(activeImage?.url) && !failedUrls[activeImage.url];

  const brandName =
    typeof product.brand === "object" && product.brand !== null
      ? product.brand.name
      : "APEX ATELIER";

  const handleImageError = useCallback((url: string) => {
    setFailedUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  }, []);

  const handlePrevImage = () => {
    if (sortedImages.length <= 1) return;
    setActiveIndex(
      (prev) => (prev - 1 + sortedImages.length) % sortedImages.length,
    );
  };

  const handleNextImage = () => {
    if (sortedImages.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % sortedImages.length);
  };

  const handleThumbnailKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActiveIndex((idx + 1) % sortedImages.length);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveIndex((idx - 1 + sortedImages.length) % sortedImages.length);
    }
  };

  return (
    <div className="space-y-4">
      {/* Studio Inspection Bar: Counter + Optional 3D Toggle */}
      {(isWheel || sortedImages.length > 0) && (
        <div className="flex items-center justify-between border border-[#222228] bg-[#0D0D0F] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-[0.22em] uppercase text-[#A1A1AA]">
              Studio Inspection
            </span>
            {viewMode === "images" && sortedImages.length > 0 && (
              <span className="text-[11px] tracking-[0.18em] uppercase text-[#F5F5F3] tabular-nums border-l border-[#222228] pl-3">
                {formatImageCounter(safeIndex, sortedImages.length)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {viewMode === "images" && hasValidActiveImage && (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="Open fullscreen image zoom"
                className="inline-flex items-center gap-1.5 border border-[#222228] bg-[#141417] px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-[#F5F5F3]/40 transition-colors cursor-pointer min-h-[36px] focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-2"
              >
                <Maximize2 className="w-3 h-3" aria-hidden="true" />
                Zoom
              </button>
            )}

            {isWheel && (
              <div
                role="tablist"
                aria-label="Product media view mode"
                className="inline-flex border border-[#222228] bg-[#080808]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "images"}
                  onClick={() => setViewMode("images")}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-colors cursor-pointer min-h-[36px] focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-2 ${
                    viewMode === "images"
                      ? "bg-[#F5F5F3] text-[#080808] font-medium"
                      : "text-[#A1A1AA] hover:text-[#F5F5F3]"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  Images
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "3d"}
                  onClick={() => setViewMode("3d")}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-colors cursor-pointer min-h-[36px] focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-2 ${
                    viewMode === "3d"
                      ? "bg-[#C81E1E] text-[#F5F5F3] font-medium"
                      : "text-[#A1A1AA] hover:text-[#F5F5F3]"
                  }`}
                >
                  <Box className="w-3.5 h-3.5" aria-hidden="true" />
                  3D View
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Primary Media Viewport */}
      <div className="relative aspect-[4/3] w-full overflow-hidden border border-[#222228] bg-[#0D0D0F]">
        {isWheel && viewMode === "3d" ? (
          <div className="w-full h-full">
            <LazyForgedWheel3D fallbackSrc={activeImage?.url} />
          </div>
        ) : hasValidActiveImage && activeImage ? (
          <>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={`Inspect ${product.name} image ${safeIndex + 1} in fullscreen zoom`}
              className="group relative w-full h-full block cursor-zoom-in focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-[-2px]"
            >
              <Image
                key={activeImage.url}
                src={activeImage.url}
                alt={activeImage.alt || product.name}
                fill
                priority
                unoptimized={!isOptimizedHost(activeImage.url)}
                sizes="(max-width: 1024px) 100vw, 58vw"
                onError={() => handleImageError(activeImage.url)}
                className="object-contain p-2 sm:p-4 transition-opacity duration-200 motion-reduce:transition-none"
              />
            </button>

            {sortedImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous product image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center border border-[#222228] bg-[#080808]/85 text-[#F5F5F3] hover:border-[#F5F5F3]/50 transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next product image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center border border-[#222228] bg-[#080808]/85 text-[#F5F5F3] hover:border-[#F5F5F3]/50 transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </>
            )}
          </>
        ) : (
          /* Deliberate Branded Fallback when images are missing or fail */
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#111115] to-[#080808]">
            <div className="w-12 h-12 border border-[#222228] flex items-center justify-center mb-5">
              <svg
                width="22"
                height="18"
                viewBox="0 0 28 22"
                fill="none"
                aria-hidden="true"
                className="text-[#F5F5F3]/70"
              >
                <path
                  d="M14 2L26 20H20.5L14 10L7.5 20H2L14 2Z"
                  fill="currentColor"
                />
                <path d="M14 14L18 20H10L14 14Z" fill="#C81E1E" />
              </svg>
            </div>
            <p className="text-[10px] tracking-[0.28em] uppercase text-[#A1A1AA]">
              {brandName}
            </p>
            <p className="mt-2 font-serif text-xl text-[#F5F5F3] max-w-sm">
              {product.name}
            </p>
            <p className="mt-2 text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA]/70 tabular-nums">
              SKU: {product.sku}
            </p>
          </div>
        )}
      </div>

      {/* Thumbnail Navigation Strip (shown whenever product has images; single image stays clean) */}
      {viewMode === "images" && sortedImages.length > 1 && (
        <div
          className="grid grid-cols-4 sm:grid-cols-5 gap-3"
          role="list"
          aria-label="Product gallery thumbnails"
        >
          {sortedImages.map((img, idx) => {
            const isActive = idx === safeIndex;
            const isBroken = Boolean(failedUrls[img.url]);
            return (
              <button
                key={`${img.url}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                onKeyDown={(e) => handleThumbnailKeyDown(e, idx)}
                aria-label={`View image ${idx + 1} of ${sortedImages.length}${img.alt ? `: ${img.alt}` : ""}`}
                aria-current={isActive ? "true" : undefined}
                className={`relative aspect-[4/3] w-full overflow-hidden border bg-[#0D0D0F] transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-2 ${
                  isActive
                    ? "border-[#C81E1E]"
                    : "border-[#222228] hover:border-[#F5F5F3]/40"
                }`}
              >
                {!isBroken ? (
                  <Image
                    src={img.url}
                    alt={img.alt || `${product.name} view ${idx + 1}`}
                    fill
                    loading="lazy"
                    unoptimized={!isOptimizedHost(img.url)}
                    sizes="160px"
                    onError={() => handleImageError(img.url)}
                    className="object-contain p-1"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] tracking-[0.18em] uppercase text-[#A1A1AA]">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Zoom & Pan Lightbox */}
      <ProductImageLightbox
        images={sortedImages}
        activeIndex={safeIndex}
        productName={product.name}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onSelectIndex={(idx) => setActiveIndex(idx)}
        isOptimizedHost={isOptimizedHost}
      />
    </div>
  );
}
