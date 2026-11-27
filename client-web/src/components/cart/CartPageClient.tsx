"use client";

import { useState, useEffect } from "react";
import { AlertCircle, RotateCcw, X } from "lucide-react";
import { CartEmptyState } from "@/components/cart/CartEmptyState";
import { CartErrorState } from "@/components/cart/CartErrorState";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartSkeleton } from "@/components/cart/CartSkeleton";
import { CartSummaryCard } from "@/components/cart/CartSummaryCard";
import { ClearCartConfirmation } from "@/components/cart/ClearCartConfirmation";
import { useCartStore } from "@/store/cart.store";

export function CartPageClient() {
  const mode = useCartStore((s) => s.mode);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const authChecked = useCartStore((s) => s.authChecked);
  const items = useCartStore((s) => s.items);
  const totalQuantity = useCartStore((s) => s.totalQuantity);
  const subtotal = useCartStore((s) => s.subtotal);
  const estimatedShipping = useCartStore((s) => s.estimatedShipping);
  const estimatedTax = useCartStore((s) => s.estimatedTax);
  const total = useCartStore((s) => s.total);
  const currency = useCartStore((s) => s.currency);
  const isLoading = useCartStore((s) => s.isLoading);
  const isMigrating = useCartStore((s) => s.isMigrating);
  const isClearing = useCartStore((s) => s.isClearing);
  const pendingProductIds = useCartStore((s) => s.pendingProductIds);
  const error = useCartStore((s) => s.error);
  const rowErrors = useCartStore((s) => s.rowErrors);
  const migrationError = useCartStore((s) => s.migrationError);
  const migrationWarnings = useCartStore((s) => s.migrationWarnings);

  const refreshCart = useCartStore((s) => s.refreshCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const migrateGuestCart = useCartStore((s) => s.migrateGuestCart);
  const dismissMigrationWarnings = useCartStore(
    (s) => s.dismissMigrationWarnings,
  );

  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (hasHydrated && authChecked && mode === "guest") {
      void refreshCart();
    }
  }, [hasHydrated, authChecked, mode, refreshCart]);

  if (!hasHydrated || !authChecked || (isLoading && items.length === 0)) {
    return <CartSkeleton />;
  }

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    await updateQuantity(productId, quantity);
    setAnnouncement(`Updated item quantity to ${quantity}.`);
  };

  const handleRemoveItem = async (productId: string) => {
    const target = items.find((i) => i.productId === productId);
    await removeItem(productId);
    setAnnouncement(
      target ? `Removed ${target.name} from your bag.` : "Item removed from bag.",
    );
  };

  const handleClearCart = async () => {
    await clearCart();
    setAnnouncement("Your bag has been cleared.");
  };

  return (
    <main className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 pt-32 pb-20 space-y-10">
      {/* Accessible Live Status Region */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Editorial Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.26em] uppercase text-[#A1A1AA]">
            {mode === "authenticated" ? "Account Allocation" : "Guest Bag"}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#F5F5F3]">
            Your Bag
          </h1>
        </div>

        {items.length > 0 && (
          <ClearCartConfirmation
            isClearing={isClearing}
            onConfirmClear={handleClearCart}
          />
        )}
      </header>

      {/* Migration Failure Banner (preserves guest cart) */}
      {migrationError && (
        <div
          role="alert"
          className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="w-5 h-5 text-[#C81E1E] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="text-xs tracking-[0.18em] uppercase text-[#F5F5F3]">
                Guest Bag Merge Pending
              </p>
              <p className="text-sm text-[#A1A1AA]">{migrationError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void migrateGuestCart()}
            disabled={isMigrating}
            className="inline-flex items-center justify-center gap-2 bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium transition-colors cursor-pointer min-h-[44px] shrink-0 disabled:opacity-60"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            {isMigrating ? "Merging..." : "Retry Merge"}
          </button>
        </div>
      )}

      {/* Migration Warnings Banner (e.g. stock adjustments or unavailable items) */}
      {migrationWarnings.length > 0 && (
        <div
          role="status"
          className="border border-white/10 bg-[#0D0D0F] p-5 flex items-start justify-between gap-4"
        >
          <div className="space-y-1.5">
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3]">
              Bag Merge Adjustments
            </p>
            <ul className="space-y-1 text-xs text-[#A1A1AA]">
              {migrationWarnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={dismissMigrationWarnings}
            aria-label="Dismiss merge warnings"
            className="p-2 text-[#A1A1AA] hover:text-[#F5F5F3] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Recoverable API / Revalidation Error */}
      {error && (
        <CartErrorState message={error} onRetry={() => void refreshCart()} />
      )}

      {/* Empty State vs Active Cart */}
      {items.length === 0 ? (
        <CartEmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <section
            aria-label="Cart items"
            className="lg:col-span-8 space-y-4"
          >
            {items.map((item) => (
              <CartItemRow
                key={item.productId}
                item={item}
                currency={currency}
                isPending={Boolean(pendingProductIds[item.productId])}
                rowError={rowErrors[item.productId]}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
              />
            ))}
          </section>

          <div className="lg:col-span-4">
            <CartSummaryCard
              mode={mode}
              items={items}
              totalQuantity={totalQuantity}
              subtotal={subtotal}
              estimatedShipping={estimatedShipping}
              estimatedTax={estimatedTax}
              total={total}
              currency={currency}
              isBusy={isLoading || isMigrating || isClearing}
            />
          </div>
        </div>
      )}
    </main>
  );
}
