"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, Check, AlertCircle, ShoppingBag } from "lucide-react";
import { addToCart } from "@/lib/api/cart.api";
import { ApiError } from "@/lib/api/client";
import { formatPriceCents } from "@/lib/api/catalog.api";
import type { CatalogProduct } from "@/types/catalog.types";

interface ProductPurchasePanelProps {
  product: CatalogProduct;
}

type CartFeedback =
  | { type: "idle" }
  | { type: "success"; message: string; totalQuantity: number }
  | { type: "auth_required" }
  | { type: "error"; message: string };

export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const maxStock = Math.max(0, product.availableStock ?? 0);
  const isOutOfStock =
    product.status === "out_of_stock" ||
    product.status === "draft" ||
    product.status === "archived" ||
    maxStock <= 0;
  const isLowStock =
    !isOutOfStock && maxStock <= (product.lowStockThreshold ?? 5);

  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<CartFeedback>({ type: "idle" });

  const brandName =
    typeof product.brand === "object" && product.brand !== null
      ? product.brand.name
      : "APEX ATELIER";
  const categoryObj =
    typeof product.category === "object" && product.category !== null
      ? product.category
      : null;

  const hasDiscount =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price;

  const clampedQuantity = Math.min(Math.max(1, quantity), Math.max(1, maxStock));

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(maxStock, prev + 1));
  };

  const handleAddToCart = async () => {
    if (isOutOfStock || submitting) return;
    setSubmitting(true);
    setFeedback({ type: "idle" });

    try {
      const updatedCart = await addToCart({
        productId: product._id,
        quantity: clampedQuantity,
      });
      setFeedback({
        type: "success",
        message: `Added ${clampedQuantity} × ${product.name} to your bag.`,
        totalQuantity: updatedCart.totalQuantity,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setFeedback({ type: "auth_required" });
      } else if (err instanceof ApiError) {
        setFeedback({ type: "error", message: err.message });
      } else {
        setFeedback({
          type: "error",
          message: "Unable to add item to bag. Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const loginRedirectUrl = `/login?redirect=${encodeURIComponent(`/products/${product.slug}`)}`;

  return (
    <div className="lg:sticky lg:top-24 space-y-6 border border-[#222228] bg-[#0D0D0F] p-6 sm:p-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-[11px] text-[#A1A1AA]">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/shop"
              className="hover:text-[#F5F5F3] transition-colors tracking-[0.14em] uppercase"
            >
              Catalogue
            </Link>
          </li>
          {categoryObj && (
            <>
              <li aria-hidden="true" className="text-[#A1A1AA]/50">
                /
              </li>
              <li>
                <Link
                  href={`/shop?category=${encodeURIComponent(categoryObj.slug)}`}
                  className="hover:text-[#F5F5F3] transition-colors tracking-[0.14em] uppercase"
                >
                  {categoryObj.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true" className="text-[#A1A1AA]/50">
            /
          </li>
          <li
            aria-current="page"
            className="text-[#F5F5F3] truncate max-w-[200px]"
          >
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Brand, Category & SKU */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#222228]">
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#A1A1AA]">
          {brandName}
          {categoryObj ? ` · ${categoryObj.name}` : ""}
        </p>
        <span className="text-[11px] tracking-[0.18em] uppercase text-[#A1A1AA] tabular-nums">
          SKU: {product.sku}
        </span>
      </div>

      {/* Product Title */}
      <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#F5F5F3] leading-[1.15]">
        {product.name}
      </h1>

      {/* Price & Stock Status */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-5 border-b border-[#222228]">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-medium tracking-tight text-[#F5F5F3] tabular-nums">
            {formatPriceCents(product.price, product.currency)}
          </span>
          {hasDiscount && product.compareAtPrice && (
            <span className="text-sm text-[#A1A1AA] line-through tabular-nums">
              {formatPriceCents(product.compareAtPrice, product.currency)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 ${
              isOutOfStock
                ? "bg-[#C81E1E]"
                : isLowStock
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }`}
            aria-hidden="true"
          />
          <span className="text-[11px] tracking-[0.18em] uppercase text-[#A1A1AA] tabular-nums">
            {isOutOfStock
              ? "Out of Stock"
              : isLowStock
                ? `Low Stock · ${maxStock} Left`
                : `In Stock · ${maxStock} Available`}
          </span>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <p className="text-sm leading-relaxed text-[#A1A1AA]">
          {product.description}
        </p>
      )}

      {/* Quantity & Add to Cart Controls */}
      <div className="space-y-4 pt-2">
        <div className="flex items-stretch gap-3">
          {/* Quantity Stepper */}
          <div
            className="inline-flex items-center border border-[#222228] bg-[#141417]"
            role="group"
            aria-label="Quantity selector"
          >
            <button
              type="button"
              onClick={handleDecrement}
              disabled={isOutOfStock || clampedQuantity <= 1 || submitting}
              aria-label="Decrease quantity"
              className="w-11 h-12 flex items-center justify-center text-[#F5F5F3] hover:bg-[#1E1E24] disabled:text-[#A1A1AA]/35 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
            >
              <Minus className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <span
              aria-live="polite"
              aria-label={`Quantity: ${clampedQuantity}`}
              className="w-11 text-center text-sm font-medium text-[#F5F5F3] tabular-nums select-none"
            >
              {isOutOfStock ? 0 : clampedQuantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={
                isOutOfStock || clampedQuantity >= maxStock || submitting
              }
              aria-label="Increase quantity"
              className="w-11 h-12 flex items-center justify-center text-[#F5F5F3] hover:bg-[#1E1E24] disabled:text-[#A1A1AA]/35 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Primary Add to Cart CTA */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || submitting}
            className={`flex-1 min-h-[48px] px-6 flex items-center justify-center gap-2.5 text-[11px] tracking-[0.22em] uppercase font-medium transition-colors focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-2 ${
              isOutOfStock
                ? "bg-[#141417] text-[#A1A1AA]/60 border border-[#222228] cursor-not-allowed"
                : "bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] cursor-pointer disabled:opacity-70 disabled:cursor-wait"
            }`}
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            {isOutOfStock
              ? "Out of Stock"
              : submitting
                ? "Adding to Bag..."
                : "Add to Cart"}
          </button>
        </div>

        {/* Accessible Live Feedback Region */}
        <div aria-live="polite" className="min-h-[20px]">
          {feedback.type === "success" && (
            <div className="border border-[#222228] border-l-2 border-l-[#F5F5F3] bg-[#141417] p-4 space-y-2">
              <p className="flex items-center gap-2 text-xs text-[#F5F5F3]">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>{feedback.message}</span>
              </p>
              <div className="flex items-center gap-4 pt-1">
                <Link
                  href="/cart"
                  className="text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] underline underline-offset-4 hover:text-[#C81E1E] transition-colors"
                >
                  View Bag ({feedback.totalQuantity})
                </Link>
                <Link
                  href="/shop"
                  className="text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          )}

          {feedback.type === "auth_required" && (
            <div className="border border-[#222228] border-l-2 border-l-[#C81E1E] bg-[#141417] p-4 space-y-2.5">
              <p className="flex items-start gap-2 text-xs text-[#F5F5F3]">
                <AlertCircle
                  className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>Sign in to reserve hardware in your bag.</span>
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-0.5">
                <Link
                  href={loginRedirectUrl}
                  className="inline-flex items-center justify-center bg-[#F5F5F3] text-[#080808] px-4 py-2 text-[10px] tracking-[0.2em] uppercase font-medium hover:bg-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href={`/register?redirect=${encodeURIComponent(`/products/${product.slug}`)}`}
                  className="text-[10px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}

          {feedback.type === "error" && (
            <div
              role="alert"
              className="border border-[#222228] border-l-2 border-l-[#C81E1E] bg-[#141417] p-4 flex items-start gap-2 text-xs text-[#F5F5F3]"
            >
              <AlertCircle
                className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{feedback.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
