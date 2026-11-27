"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Lock } from "lucide-react";
import { formatPriceCents } from "@/lib/api/catalog.api";
import type { CartItem, CartMode } from "@/types/cart.types";

interface CartSummaryCardProps {
  mode: CartMode;
  items: CartItem[];
  totalQuantity: number;
  subtotal: number;
  estimatedShipping: number;
  estimatedTax: number;
  total: number;
  currency: string;
  isBusy: boolean;
}

export function CartSummaryCard({
  mode,
  items,
  totalQuantity,
  subtotal,
  estimatedShipping,
  estimatedTax,
  total,
  currency,
  isBusy,
}: CartSummaryCardProps) {
  const router = useRouter();
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  const hasUnavailableItems = items.some(
    (item) => !item.isAvailable || item.quantity < 1,
  );
  const isCheckoutDisabled =
    items.length === 0 || hasUnavailableItems || isBusy;

  const handleCheckoutClick = () => {
    if (isCheckoutDisabled) return;

    if (mode === "guest") {
      // Preserve guest bag and gate checkout through login
      router.push("/login?redirect=%2Fcheckout");
      return;
    }

    // /checkout route is not yet implemented in client-web/src/app
    setCheckoutNotice(
      "Your bag is validated and ready. The /checkout flow is scheduled for the next milestone.",
    );
  };

  return (
    <aside
      aria-label="Order summary"
      className="lg:sticky lg:top-24 border border-white/10 bg-[#0D0D0F] p-6 sm:p-8 space-y-6"
    >
      <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
        <h2 className="font-serif text-2xl font-normal text-[#F5F5F3]">
          Order Summary
        </h2>
        <span className="text-[11px] tracking-[0.18em] uppercase text-[#A1A1AA] tabular-nums">
          {totalQuantity} {totalQuantity === 1 ? "Item" : "Items"}
        </span>
      </div>

      <dl className="space-y-3.5 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[#A1A1AA]">Subtotal</dt>
          <dd className="text-[#F5F5F3] font-medium tabular-nums">
            {formatPriceCents(subtotal, currency)}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[#A1A1AA]">Shipping</dt>
          <dd className="text-[#A1A1AA] text-xs uppercase tracking-[0.12em]">
            {estimatedShipping > 0
              ? formatPriceCents(estimatedShipping, currency)
              : "Calculated at checkout"}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[#A1A1AA]">Estimated Tax</dt>
          <dd className="text-[#A1A1AA] text-xs uppercase tracking-[0.12em]">
            {estimatedTax > 0
              ? formatPriceCents(estimatedTax, currency)
              : "Calculated at checkout"}
          </dd>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-baseline justify-between gap-4">
          <dt className="text-xs tracking-[0.2em] uppercase text-[#F5F5F3]">
            Estimated Total
          </dt>
          <dd className="text-xl font-medium text-[#F5F5F3] tabular-nums">
            {formatPriceCents(total, currency)}
          </dd>
        </div>
      </dl>

      {hasUnavailableItems && (
        <div
          role="alert"
          className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#141417] p-3.5 flex items-start gap-2.5 text-xs text-[#F5F5F3]"
        >
          <AlertCircle
            className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span>
            Resolve unavailable or over-stock items before proceeding to
            checkout.
          </span>
        </div>
      )}

      <div className="space-y-3 pt-1">
        <button
          type="button"
          onClick={handleCheckoutClick}
          disabled={isCheckoutDisabled}
          className={`w-full min-h-[48px] px-6 flex items-center justify-center gap-2.5 text-[11px] tracking-[0.22em] uppercase font-medium transition-colors focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-2 ${
            isCheckoutDisabled
              ? "bg-[#141417] text-[#71717A] border border-white/10 cursor-not-allowed"
              : "bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] cursor-pointer"
          }`}
        >
          {mode === "guest" && (
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          Proceed to Checkout
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        {mode === "guest" && !hasUnavailableItems && items.length > 0 && (
          <p className="text-[11px] text-[#A1A1AA] text-center">
            Sign in at the next step to finalize checkout. Your bag will be
            preserved.
          </p>
        )}

        {checkoutNotice && (
          <div
            role="status"
            className="border border-white/10 bg-[#141417] p-3.5 text-xs text-[#A1A1AA]"
          >
            {checkoutNotice}
          </div>
        )}

        <Link
          href="/shop"
          className="w-full min-h-[44px] flex items-center justify-center border border-white/15 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </aside>
  );
}
