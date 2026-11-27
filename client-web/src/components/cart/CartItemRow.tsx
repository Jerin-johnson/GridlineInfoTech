"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, AlertCircle } from "lucide-react";
import { formatPriceCents } from "@/lib/api/catalog.api";
import type { CartItem } from "@/types/cart.types";

const OPTIMIZED_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
  "res.cloudinary.com",
]);

function isOptimizedHost(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    return OPTIMIZED_IMAGE_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

interface CartItemRowProps {
  item: CartItem;
  currency: string;
  isPending: boolean;
  rowError?: string;
  onUpdateQuantity: (productId: string, quantity: number) => Promise<void>;
  onRemoveItem: (productId: string) => Promise<void>;
}

export function CartItemRow({
  item,
  currency,
  isPending,
  rowError,
  onUpdateQuantity,
  onRemoveItem,
}: CartItemRowProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const hasExceedingStock =
    !item.isAvailable &&
    item.availableStock > 0 &&
    item.quantity > item.availableStock;
  const isCompletelyUnavailable = !item.isAvailable && !hasExceedingStock;
  const isLowStock =
    item.isAvailable && item.availableStock > 0 && item.availableStock <= 5;

  const productHref = item.slug ? `/products/${item.slug}` : null;
  const maxSelectable = Math.max(1, item.availableStock);

  return (
    <article
      aria-label={item.name}
      className={`border bg-[#0D0D0F] p-5 sm:p-6 transition-colors ${
        !item.isAvailable ? "border-[#C81E1E]/50" : "border-white/10"
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
        {/* Thumbnail */}
        <div className="relative w-full sm:w-32 aspect-[4/3] shrink-0 overflow-hidden border border-white/10 bg-[#141417]">
          {item.image && !imgFailed ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              unoptimized={!isOptimizedHost(item.image)}
              sizes="(max-width: 640px) 100vw, 128px"
              onError={() => setImgFailed(true)}
              className="object-contain p-1.5"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
              <svg
                width="20"
                height="16"
                viewBox="0 0 28 22"
                fill="none"
                aria-hidden="true"
                className="text-[#F5F5F3]/50"
              >
                <path
                  d="M14 2L26 20H20.5L14 10L7.5 20H2L14 2Z"
                  fill="currentColor"
                />
                <path d="M14 14L18 20H10L14 14Z" fill="#C81E1E" />
              </svg>
            </div>
          )}
        </div>

        {/* Details & Controls */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              {productHref ? (
                <Link
                  href={productHref}
                  className="font-serif text-lg sm:text-xl text-[#F5F5F3] hover:text-[#C81E1E] transition-colors block truncate focus-visible:outline-1 focus-visible:outline-white/70"
                >
                  {item.name}
                </Link>
              ) : (
                <p className="font-serif text-lg sm:text-xl text-[#F5F5F3] truncate">
                  {item.name}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tracking-[0.16em] uppercase text-[#A1A1AA] tabular-nums">
                {item.sku && <span>SKU: {item.sku}</span>}
                <span>
                  Unit: {formatPriceCents(item.price, currency)}
                </span>
              </div>

              {/* Availability & Stock Feedback */}
              {hasExceedingStock && (
                <div className="pt-1 flex flex-wrap items-center gap-3">
                  <span className="text-xs text-[#C81E1E]">
                    Only {item.availableStock} available in stock (you selected{" "}
                    {item.quantity}).
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      onUpdateQuantity(item.productId, item.availableStock)
                    }
                    className="border border-white/20 bg-[#141417] px-3 py-1 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] hover:border-white/50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Adjust to {item.availableStock}
                  </button>
                </div>
              )}

              {isCompletelyUnavailable && (
                <p className="pt-1 text-xs text-[#C81E1E]">
                  Currently unavailable — remove this item to proceed.
                </p>
              )}

              {isLowStock && (
                <p className="pt-0.5 text-[11px] tracking-[0.14em] uppercase text-amber-400/90 tabular-nums">
                  Low stock · {item.availableStock} remaining
                </p>
              )}
            </div>

            {/* Line Total */}
            <div className="sm:text-right shrink-0">
              <p className="text-base sm:text-lg font-medium text-[#F5F5F3] tabular-nums">
                {item.isAvailable
                  ? formatPriceCents(item.itemTotal, currency)
                  : "—"}
              </p>
            </div>
          </div>

          {/* Bottom Row: Quantity Stepper + Remove */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
            <div
              className="inline-flex items-center border border-white/10 bg-[#141417]"
              role="group"
              aria-label={`Quantity controls for ${item.name}`}
            >
              <button
                type="button"
                onClick={() =>
                  onUpdateQuantity(item.productId, item.quantity - 1)
                }
                disabled={isPending || item.quantity <= 1}
                aria-label={`Decrease quantity for ${item.name}`}
                className="w-11 h-11 flex items-center justify-center text-[#F5F5F3] hover:bg-[#1E1E24] disabled:text-[#71717A] disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
              >
                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <span
                aria-label={`Quantity: ${item.quantity}`}
                className="w-11 text-center text-sm font-medium text-[#F5F5F3] tabular-nums select-none"
              >
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateQuantity(item.productId, item.quantity + 1)
                }
                disabled={
                  isPending ||
                  !item.isAvailable ||
                  item.quantity >= maxSelectable
                }
                aria-label={`Increase quantity for ${item.name}`}
                className="w-11 h-11 flex items-center justify-center text-[#F5F5F3] hover:bg-[#1E1E24] disabled:text-[#71717A] disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onRemoveItem(item.productId)}
              disabled={isPending}
              aria-label={`Remove ${item.name} from bag`}
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#C81E1E] transition-colors cursor-pointer min-h-[44px] px-2 disabled:opacity-50 focus-visible:outline-1 focus-visible:outline-white/70"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              {isPending ? "Updating..." : "Remove"}
            </button>
          </div>

          {rowError && (
            <div
              role="alert"
              className="flex items-start gap-2 text-xs text-[#C81E1E] pt-1"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{rowError}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
