"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { AddressSelector } from "@/components/checkout/AddressSelector";
import { CryptoPaymentPanel } from "@/components/checkout/CryptoPaymentPanel";
import { OrderConfirmationView } from "@/components/checkout/OrderConfirmationView";
import {
  OrderSummaryPanel,
  type SummaryLineItem,
} from "@/components/checkout/OrderSummaryPanel";
import { getAddresses } from "@/lib/api/addresses.api";
import { getCurrentUser } from "@/lib/api/auth.api";
import { ApiError } from "@/lib/api/client";
import { createCheckoutOrder, getOrderById } from "@/lib/api/orders.api";
import { getPaymentByOrder, getPaymentConfig } from "@/lib/api/payments.api";
import { useCartStore } from "@/store/cart.store";
import type { UserAddress } from "@/types/address.types";
import type { FormattedOrder, OrderPaymentMethod } from "@/types/order.types";
import type {
  CryptoPaymentConfig,
  FormattedPayment,
} from "@/types/payment.types";

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ck_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeOrderId = searchParams.get("orderId");

  const cartMode = useCartStore((s) => s.mode);
  const cartItems = useCartStore((s) => s.items);
  const cartSubtotal = useCartStore((s) => s.subtotal);
  const cartShipping = useCartStore((s) => s.estimatedShipping);
  const cartTax = useCartStore((s) => s.estimatedTax);
  const cartTotal = useCartStore((s) => s.total);
  const cartCurrency = useCartStore((s) => s.currency);
  const initForUser = useCartStore((s) => s.initForUser);
  const refreshCart = useCartStore((s) => s.refreshCart);

  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [paymentConfig, setPaymentConfig] =
    useState<CryptoPaymentConfig | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<OrderPaymentMethod>("crypto_wallet");
  const [notes, setNotes] = useState("");

  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    generateIdempotencyKey(),
  );
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [activeOrder, setActiveOrder] = useState<FormattedOrder | null>(null);
  const [activePayment, setActivePayment] = useState<FormattedPayment | null>(
    null,
  );
  const [confirmed, setConfirmed] = useState(false);

  const runLoad = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.replace("/login?redirect=%2Fcheckout");
        return;
      }

      await initForUser(user);

      const [fetchedAddresses, fetchedConfig] = await Promise.all([
        getAddresses(),
        getPaymentConfig().catch(() => null),
      ]);

      setAddresses(fetchedAddresses);
      const defaultAddr =
        fetchedAddresses.find((a) => a.isDefault) ?? fetchedAddresses[0];
      setSelectedAddressId(defaultAddr?._id ?? null);
      setPaymentConfig(fetchedConfig);

      if (resumeOrderId) {
        const existingOrder = await getOrderById(resumeOrderId);
        const existingPayment = await getPaymentByOrder(resumeOrderId).catch(
          () => null,
        );
        setActiveOrder(existingOrder);
        setActivePayment(existingPayment);

        if (
          existingOrder.paymentMethod === "cod" ||
          existingOrder.paymentStatus === "paid" ||
          existingPayment?.verificationStatus === "verified"
        ) {
          setConfirmed(true);
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?redirect=%2Fcheckout");
        return;
      }
      setBootError(
        err instanceof Error
          ? err.message
          : "Unable to initialize checkout. Please try again.",
      );
    } finally {
      setBooting(false);
    }
  }, [initForUser, resumeOrderId, router]);

  const loadCheckoutContext = useCallback(async () => {
    setBooting(true);
    setBootError(null);
    await runLoad();
  }, [runLoad]);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(async (user) => {
        if (!active) return;
        if (!user) {
          router.replace("/login?redirect=%2Fcheckout");
          return;
        }

        await initForUser(user);

        const [fetchedAddresses, fetchedConfig] = await Promise.all([
          getAddresses(),
          getPaymentConfig().catch(() => null),
        ]);
        if (!active) return;

        setAddresses(fetchedAddresses);
        const defaultAddr =
          fetchedAddresses.find((a) => a.isDefault) ?? fetchedAddresses[0];
        setSelectedAddressId(defaultAddr?._id ?? null);
        setPaymentConfig(fetchedConfig);

        if (resumeOrderId) {
          const existingOrder = await getOrderById(resumeOrderId);
          const existingPayment = await getPaymentByOrder(resumeOrderId).catch(
            () => null,
          );
          if (!active) return;
          setActiveOrder(existingOrder);
          setActivePayment(existingPayment);

          if (
            existingOrder.paymentMethod === "cod" ||
            existingOrder.paymentStatus === "paid" ||
            existingPayment?.verificationStatus === "verified"
          ) {
            setConfirmed(true);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login?redirect=%2Fcheckout");
          return;
        }
        setBootError(
          err instanceof Error
            ? err.message
            : "Unable to initialize checkout. Please try again.",
        );
      })
      .finally(() => {
        if (active) setBooting(false);
      });

    return () => {
      active = false;
    };
  }, [initForUser, resumeOrderId, router]);

  const handlePlaceOrder = async () => {
    if (submittingOrder) return;
    if (!selectedAddressId) {
      setCheckoutError("Please select or add a delivery address.");
      return;
    }

    setSubmittingOrder(true);
    setCheckoutError(null);

    try {
      const order = await createCheckoutOrder({
        addressId: selectedAddressId,
        paymentMethod,
        notes: notes.trim() || undefined,
        idempotencyKey,
      });

      setActiveOrder(order);
      // Backend clears cart on successful order creation; sync Zustand now
      await refreshCart();
      // Rotate idempotency key for any future separate checkout
      setIdempotencyKey(generateIdempotencyKey());

      if (order.paymentMethod === "cod") {
        setConfirmed(true);
      } else {
        router.replace(`/checkout?orderId=${encodeURIComponent(order.id)}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?redirect=%2Fcheckout");
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        setCheckoutError(
          err.message ||
            "Duplicate checkout detected. Refreshing your latest cart state.",
        );
        await refreshCart();
      } else {
        setCheckoutError(
          err instanceof Error
            ? err.message
            : "Unable to place order. Please review your bag and try again.",
        );
      }
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (booting) {
    return (
      <main className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 pt-32 pb-20 space-y-8">
        <div className="h-10 w-64 bg-[#141417]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-56 border border-white/10 bg-[#0D0D0F]" />
            <div className="h-44 border border-white/10 bg-[#0D0D0F]" />
          </div>
          <div className="lg:col-span-5 h-80 border border-white/10 bg-[#0D0D0F]" />
        </div>
      </main>
    );
  }

  if (bootError) {
    return (
      <main className="max-w-[800px] mx-auto px-5 sm:px-8 pt-32 pb-20">
        <div className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-8 space-y-4">
          <h1 className="font-serif text-2xl text-[#F5F5F3]">
            Checkout Unavailable
          </h1>
          <p className="text-sm text-[#A1A1AA]">{bootError}</p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => void loadCheckoutContext()}
              className="bg-[#C81E1E] text-[#F5F5F3] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase cursor-pointer min-h-[44px]"
            >
              Retry
            </button>
            <Link
              href="/cart"
              className="border border-white/15 px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] min-h-[44px] inline-flex items-center"
            >
              Return to Bag
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (confirmed && activeOrder) {
    return (
      <OrderConfirmationView order={activeOrder} payment={activePayment} />
    );
  }

  if (!activeOrder && cartMode === "authenticated" && cartItems.length === 0) {
    return (
      <main className="max-w-[720px] mx-auto px-5 sm:px-8 pt-32 pb-20">
        <div className="border border-white/10 bg-[#0D0D0F] p-10 text-center space-y-5">
          <h1 className="font-serif text-3xl text-[#F5F5F3]">
            Your Bag Is Empty
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            Add hardware components to your bag before proceeding to checkout.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center bg-[#F5F5F3] text-[#080808] px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium min-h-[44px]"
          >
            Browse Catalogue
          </Link>
        </div>
      </main>
    );
  }

  const summaryItems: SummaryLineItem[] = activeOrder
    ? activeOrder.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        sku: i.sku,
        image: i.image,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      }))
    : cartItems.map((i) => ({
        productId: i.productId,
        name: i.name,
        sku: i.sku,
        image: i.image,
        quantity: i.quantity,
        lineTotal: i.itemTotal,
      }));

  const hasUnavailableCartItem =
    !activeOrder && cartItems.some((item) => !item.isAvailable);

  return (
    <main className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 pt-28 pb-20 space-y-10">
      {/* Header & Breadcrumb */}
      <header className="space-y-3 border-b border-white/10 pb-6">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to Bag
        </Link>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#F5F5F3]">
          {activeOrder ? `Complete Payment · ${activeOrder.orderNumber}` : "Checkout"}
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-8">
          {!activeOrder ? (
            <>
              <AddressSelector
                addresses={addresses}
                selectedAddressId={selectedAddressId}
                onSelectAddress={(id) => {
                  setSelectedAddressId(id);
                  setIdempotencyKey(generateIdempotencyKey());
                }}
                onAddressesChange={setAddresses}
                disabled={submittingOrder}
              />

              {/* Payment Method Selection */}
              <section
                aria-labelledby="payment-method-heading"
                className="border border-white/10 bg-[#0D0D0F] p-6 sm:p-8 space-y-5"
              >
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
                  <ShieldCheck
                    className="w-4 h-4 text-[#C81E1E]"
                    aria-hidden="true"
                  />
                  <h2
                    id="payment-method-heading"
                    className="font-serif text-xl sm:text-2xl font-normal text-[#F5F5F3]"
                  >
                    Payment Method
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    disabled={submittingOrder}
                    onClick={() => setPaymentMethod("crypto_wallet")}
                    className={`text-left border p-5 space-y-2 transition-colors cursor-pointer ${
                      paymentMethod === "crypto_wallet"
                        ? "border-[#C81E1E] bg-[#141417]"
                        : "border-white/10 bg-[#080808] hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-[#F5F5F3]">
                      <Wallet className="w-4 h-4 text-[#C81E1E]" aria-hidden="true" />
                      Crypto Wallet (MetaMask)
                    </div>
                    <p className="text-xs text-[#A1A1AA]">
                      {paymentConfig
                        ? `Pay in ${paymentConfig.token} on ${paymentConfig.network} with on-chain verification.`
                        : "On-chain EVM settlement via MetaMask."}
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={submittingOrder}
                    onClick={() => setPaymentMethod("cod")}
                    className={`text-left border p-5 space-y-2 transition-colors cursor-pointer ${
                      paymentMethod === "cod"
                        ? "border-[#C81E1E] bg-[#141417]"
                        : "border-white/10 bg-[#080808] hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-[#F5F5F3]">
                      <Banknote className="w-4 h-4 text-[#C81E1E]" aria-hidden="true" />
                      Cash on Delivery (COD)
                    </div>
                    <p className="text-xs text-[#A1A1AA]">
                      Reserve stock immediately and settle payment upon physical
                      delivery.
                    </p>
                  </button>
                </div>

                {/* Delivery Notes */}
                <label className="block space-y-1.5 pt-2">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#A1A1AA] block">
                    Delivery / Garage Notes (Optional)
                  </span>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Gate code, lift-gate instructions, or delivery window..."
                    className="w-full bg-[#141417] border border-white/15 px-3.5 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
                  />
                </label>

                {hasUnavailableCartItem && (
                  <div
                    role="alert"
                    className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#141417] p-4 text-xs text-[#F5F5F3]"
                  >
                    One or more items in your bag are unavailable or exceed
                    stock.{" "}
                    <Link href="/cart" className="underline">
                      Return to your bag
                    </Link>{" "}
                    to adjust them before placing your order.
                  </div>
                )}

                {checkoutError && (
                  <div
                    role="alert"
                    className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#141417] p-4 flex items-start gap-2.5 text-xs text-[#F5F5F3]"
                  >
                    <AlertCircle
                      className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{checkoutError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handlePlaceOrder()}
                  disabled={
                    submittingOrder ||
                    !selectedAddressId ||
                    hasUnavailableCartItem
                  }
                  className="w-full min-h-[48px] bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-6 text-[11px] tracking-[0.22em] uppercase font-medium transition-colors cursor-pointer disabled:bg-[#141417] disabled:text-[#71717A] disabled:border disabled:border-white/10 disabled:cursor-not-allowed"
                >
                  {submittingOrder
                    ? "Creating Order..."
                    : paymentMethod === "cod"
                      ? "Place Cash on Delivery Order"
                      : "Create Order & Proceed to Crypto Payment"}
                </button>
              </section>
            </>
          ) : (
            /* Active Pending Crypto Order */
            paymentConfig && (
              <CryptoPaymentPanel
                order={activeOrder}
                config={paymentConfig}
                initialPayment={activePayment}
                onOrderPaid={(paidOrder, verifiedPayment) => {
                  setActiveOrder(paidOrder);
                  setActivePayment(verifiedPayment);
                  setConfirmed(true);
                }}
              />
            )
          )}
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-5">
          <OrderSummaryPanel
            items={summaryItems}
            subtotal={activeOrder ? activeOrder.subtotal : cartSubtotal}
            shippingCost={activeOrder ? activeOrder.shippingCost : cartShipping}
            taxAmount={activeOrder ? activeOrder.taxAmount : cartTax}
            totalAmount={activeOrder ? activeOrder.totalAmount : cartTotal}
            currency={activeOrder ? activeOrder.currency : cartCurrency}
            orderNumber={activeOrder?.orderNumber}
          />
        </div>
      </div>
    </main>
  );
}
