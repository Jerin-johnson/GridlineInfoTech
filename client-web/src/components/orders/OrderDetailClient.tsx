"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ExternalLink,
  RotateCcw,
  Truck,
  Wallet,
} from "lucide-react";
import { CryptoPaymentPanel } from "@/components/checkout/CryptoPaymentPanel";
import { getCurrentUser } from "@/lib/api/auth.api";
import { formatPriceCents } from "@/lib/api/catalog.api";
import { ApiError } from "@/lib/api/client";
import { cancelUserOrder, getOrderById } from "@/lib/api/orders.api";
import { getPaymentByOrder, getPaymentConfig } from "@/lib/api/payments.api";
import {
  canCancelOrder,
  canPayOrderOnline,
  formatFulfilmentLabel,
  formatPaymentStatusLabel,
  getEffectivePaymentStatus,
  getFulfilmentToneClass,
  getPayOnlineActionLabel,
  getPaymentToneClass,
} from "@/lib/orders/order-eligibility";
import type { FormattedOrder, OrderFulfilmentStatus } from "@/types/order.types";
import type {
  CryptoPaymentConfig,
  FormattedPayment,
} from "@/types/payment.types";

const TIMELINE_STEPS: Array<{
  key: OrderFulfilmentStatus;
  label: string;
}> = [
  { key: "placed", label: "Order Placed" },
  { key: "payment_confirmed", label: "Payment Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
];

function getStepOrderIndex(status: OrderFulfilmentStatus): number {
  return TIMELINE_STEPS.findIndex((s) => s.key === status);
}

interface OrderDetailClientProps {
  orderId: string;
}

export function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoOpenPay = searchParams.get("pay") === "1";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<FormattedOrder | null>(null);
  const [payment, setPayment] = useState<FormattedPayment | null>(null);
  const [paymentConfig, setPaymentConfig] =
    useState<CryptoPaymentConfig | null>(null);

  const [showCryptoPanel, setShowCryptoPanel] = useState(autoOpenPay);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadOrderData = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) {
      router.replace(
        `/login?redirect=${encodeURIComponent(`/profile/orders/${orderId}`)}`,
      );
      return;
    }

    const [fetchedOrder, fetchedPayment, fetchedConfig] = await Promise.all([
      getOrderById(orderId),
      getPaymentByOrder(orderId).catch(() => null),
      getPaymentConfig().catch(() => null),
    ]);

    setOrder(fetchedOrder);
    setPayment(fetchedPayment);
    setPaymentConfig(fetchedConfig);
  }, [orderId, router]);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(async (user) => {
        if (!active) return;
        if (!user) {
          router.replace(
            `/login?redirect=${encodeURIComponent(`/profile/orders/${orderId}`)}`,
          );
          return;
        }

        const [fetchedOrder, fetchedPayment, fetchedConfig] = await Promise.all([
          getOrderById(orderId),
          getPaymentByOrder(orderId).catch(() => null),
          getPaymentConfig().catch(() => null),
        ]);
        if (!active) return;

        setOrder(fetchedOrder);
        setPayment(fetchedPayment);
        setPaymentConfig(fetchedConfig);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(
            `/login?redirect=${encodeURIComponent(`/profile/orders/${orderId}`)}`,
          );
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load order details.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, router]);

  const handleRetryLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      await loadOrderData();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to load order details.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || cancelling) return;
    setCancelling(true);
    setActionError(null);
    try {
      const updated = await cancelUserOrder(order.id);
      setOrder(updated);
      setConfirmCancel(false);
      setShowCryptoPanel(false);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Unable to cancel this order.",
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-[1200px] mx-auto px-5 sm:px-8 md:px-12 pt-32 pb-20 space-y-6">
        <div className="h-8 w-48 bg-[#141417]" />
        <div className="h-44 border border-white/10 bg-[#0D0D0F]" />
        <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="max-w-[760px] mx-auto px-5 sm:px-8 pt-32 pb-20">
        <div className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-8 space-y-4">
          <h1 className="font-serif text-2xl text-[#F5F5F3]">
            Order Unavailable
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            {error || "The requested order could not be found."}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void handleRetryLoad()}
              className="inline-flex items-center gap-2 bg-[#C81E1E] text-[#F5F5F3] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase cursor-pointer min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry
            </button>
            <Link
              href="/profile"
              className="border border-white/15 px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] min-h-[44px] inline-flex items-center"
            >
              Back to Profile
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const effectivePaymentStatus = getEffectivePaymentStatus(order);
  const eligibleToPay = canPayOrderOnline(order);
  const eligibleToCancel = canCancelOrder(order);
  const isCancelled = order.fulfilmentStatus === "cancelled";
  const currentStepIdx = getStepOrderIndex(order.fulfilmentStatus);

  const getTimestampForStep = (stepKey: OrderFulfilmentStatus): string | null => {
    if (stepKey === "placed" && order.createdAt) return order.createdAt;
    if (stepKey === "shipped" && order.shippedAt) return order.shippedAt;
    if (stepKey === "delivered" && order.deliveredAt) return order.deliveredAt;
    const match = order.statusHistory.find((h) => h.status === stepKey);
    return match?.changedAt ?? null;
  };

  return (
    <main className="max-w-[1200px] mx-auto px-5 sm:px-8 md:px-12 pt-28 pb-20 space-y-8">
      {/* Header */}
      <header className="border-b border-white/10 pb-6 space-y-4">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to Orders
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#F5F5F3] tabular-nums">
                {order.orderNumber}
              </h1>
              <span
                className={`border px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase ${getFulfilmentToneClass(order.fulfilmentStatus)}`}
              >
                {formatFulfilmentLabel(order.fulfilmentStatus)}
              </span>
              <span
                className={`border px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase ${getPaymentToneClass(effectivePaymentStatus)}`}
              >
                {formatPaymentStatusLabel(effectivePaymentStatus)}
              </span>
            </div>
            {order.createdAt && (
              <p className="text-xs text-[#A1A1AA]">
                Placed on{" "}
                {new Date(order.createdAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {eligibleToPay && !showCryptoPanel && (
              <button
                type="button"
                onClick={() => setShowCryptoPanel(true)}
                className="inline-flex items-center gap-2 bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium transition-colors cursor-pointer min-h-[44px]"
              >
                <Wallet className="w-4 h-4" aria-hidden="true" />
                {getPayOnlineActionLabel(order)}
              </button>
            )}

            {eligibleToCancel && !confirmCancel && (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="border border-white/15 px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#C81E1E] hover:border-[#C81E1E]/60 transition-colors cursor-pointer min-h-[44px]"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {confirmCancel && (
          <div className="border border-white/10 bg-[#0D0D0F] p-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-[#F5F5F3]">
              Confirm cancellation of {order.orderNumber}? Reserved stock will
              be released immediately.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => void handleCancelOrder()}
                className="bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-4 py-2 text-[10px] tracking-[0.18em] uppercase cursor-pointer min-h-[36px] disabled:opacity-60"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancel"}
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setConfirmCancel(false)}
                className="border border-white/15 px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer min-h-[36px]"
              >
                Keep Order
              </button>
            </div>
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#141417] p-4 flex items-start gap-2.5 text-xs text-[#F5F5F3]"
          >
            <AlertCircle
              className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{actionError}</span>
          </div>
        )}
      </header>

      {/* Inline Pay Online Now / Payment Recovery Panel */}
      {eligibleToPay && showCryptoPanel && paymentConfig && (
        <CryptoPaymentPanel
          order={order}
          config={paymentConfig}
          initialPayment={payment}
          onOrderPaid={(paidOrder, verifiedPayment) => {
            setOrder(paidOrder);
            setPayment(verifiedPayment);
            setShowCryptoPanel(false);
          }}
        />
      )}

      {/* Order Timeline */}
      <section
        aria-labelledby="timeline-heading"
        className="border border-white/10 bg-[#0D0D0F] p-6 sm:p-8 space-y-5"
      >
        <h2
          id="timeline-heading"
          className="font-serif text-xl font-normal text-[#F5F5F3] border-b border-white/10 pb-4"
        >
          Fulfilment Progress
        </h2>

        {isCancelled ? (
          <div className="border border-[#C81E1E]/40 bg-[#141417] p-4 space-y-1">
            <p className="text-xs tracking-[0.18em] uppercase text-[#C81E1E]">
              Order Cancelled
            </p>
            {order.cancelledAt && (
              <p className="text-xs text-[#A1A1AA]">
                Cancelled on {new Date(order.cancelledAt).toLocaleString()}
              </p>
            )}
            {order.cancellationReason && (
              <p className="text-xs text-[#F5F5F3]">
                Reason: {order.cancellationReason}
              </p>
            )}
          </div>
        ) : (
          <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {TIMELINE_STEPS.map((step, idx) => {
              const completed = currentStepIdx >= idx;
              const isCurrent = currentStepIdx === idx;
              const ts = completed ? getTimestampForStep(step.key) : null;

              return (
                <li
                  key={step.key}
                  className={`border p-3.5 space-y-2 ${
                    isCurrent
                      ? "border-[#C81E1E] bg-[#141417]"
                      : completed
                        ? "border-white/25 bg-[#080808]"
                        : "border-white/10 bg-[#080808] opacity-55"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-2.5 h-2.5 ${
                        isCurrent
                          ? "bg-[#C81E1E]"
                          : completed
                            ? "bg-[#F5F5F3]"
                            : "border border-white/30"
                      }`}
                      aria-hidden="true"
                    />
                    {completed && (
                      <Check className="w-3.5 h-3.5 text-[#F5F5F3]" aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-xs font-medium text-[#F5F5F3]">
                    {step.label}
                  </p>
                  {ts && (
                    <p className="text-[10px] text-[#A1A1AA] tabular-nums">
                      {new Date(ts).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Items + Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Items */}
        <section
          aria-labelledby="items-heading"
          className="lg:col-span-7 border border-white/10 bg-[#0D0D0F] p-6 sm:p-8 space-y-5"
        >
          <h2
            id="items-heading"
            className="font-serif text-xl font-normal text-[#F5F5F3] border-b border-white/10 pb-4"
          >
            Order Items
          </h2>

          <ul className="divide-y divide-white/10">
            {order.items.map((item) => (
              <li
                key={item.productId}
                className="py-4 first:pt-0 last:pb-0 flex items-center gap-4"
              >
                <div className="relative w-20 aspect-[4/3] shrink-0 border border-white/10 bg-[#141417] overflow-hidden">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      unoptimized
                      sizes="80px"
                      className="object-contain p-1"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-[#A1A1AA]">
                      APEX
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  {item.slug ? (
                    <Link
                      href={`/products/${item.slug}`}
                      className="text-sm font-medium text-[#F5F5F3] hover:text-[#C81E1E] transition-colors truncate block"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-[#F5F5F3] truncate">
                      {item.name}
                    </p>
                  )}
                  <p className="text-xs text-[#A1A1AA] tabular-nums">
                    {item.sku} · Qty {item.quantity} ×{" "}
                    {formatPriceCents(item.unitPrice, order.currency)}
                  </p>
                </div>
                <p className="text-sm font-medium text-[#F5F5F3] tabular-nums shrink-0">
                  {formatPriceCents(item.lineTotal, order.currency)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Summary & Payment + Tracking */}
        <div className="lg:col-span-5 space-y-6">
          <section
            aria-labelledby="summary-heading"
            className="border border-white/10 bg-[#0D0D0F] p-6 sm:p-8 space-y-4"
          >
            <h2
              id="summary-heading"
              className="font-serif text-xl font-normal text-[#F5F5F3] border-b border-white/10 pb-4"
            >
              Order Summary
            </h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#A1A1AA]">Subtotal</dt>
                <dd className="text-[#F5F5F3] tabular-nums">
                  {formatPriceCents(order.subtotal, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#A1A1AA]">Shipping</dt>
                <dd className="text-[#F5F5F3] tabular-nums">
                  {order.shippingCost > 0
                    ? formatPriceCents(order.shippingCost, order.currency)
                    : "Complimentary"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#A1A1AA]">Tax</dt>
                <dd className="text-[#F5F5F3] tabular-nums">
                  {formatPriceCents(order.taxAmount, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-white/10">
                <dt className="text-xs tracking-[0.2em] uppercase text-[#F5F5F3]">
                  Total
                </dt>
                <dd className="text-lg font-medium text-[#F5F5F3] tabular-nums">
                  {formatPriceCents(order.totalAmount, order.currency)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Payment Details */}
          <section
            aria-labelledby="payment-details-heading"
            className="border border-white/10 bg-[#0D0D0F] p-6 sm:p-8 space-y-3"
          >
            <h2
              id="payment-details-heading"
              className="font-serif text-xl font-normal text-[#F5F5F3] border-b border-white/10 pb-3"
            >
              Payment Details
            </h2>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-[#A1A1AA]">Method</dt>
                <dd className="text-[#F5F5F3]">
                  {order.paymentMethod === "cod"
                    ? "Cash on Delivery"
                    : "Crypto Wallet"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#A1A1AA]">Status</dt>
                <dd className="text-[#F5F5F3]">
                  {formatPaymentStatusLabel(order.paymentStatus)}
                </dd>
              </div>
              {payment?.network && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#A1A1AA]">Network / Token</dt>
                  <dd className="text-[#F5F5F3]">
                    {payment.network} · {payment.token}
                  </dd>
                </div>
              )}
              {payment?.verifiedAt && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#A1A1AA]">Verified At</dt>
                  <dd className="text-[#F5F5F3] tabular-nums">
                    {new Date(payment.verifiedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {payment?.transactionHash && (
                <div className="pt-2 space-y-1">
                  <dt className="text-[#A1A1AA]">Transaction Hash</dt>
                  <dd className="text-[#F5F5F3] break-all font-mono text-[11px] bg-[#080808] border border-white/10 p-2.5">
                    {payment.transactionHash}
                  </dd>
                </div>
              )}
              {payment?.failureReason && (
                <div className="pt-2 text-[#C81E1E]">
                  <dt className="uppercase tracking-[0.14em] text-[10px]">
                    Failure Reason
                  </dt>
                  <dd className="mt-0.5">{payment.failureReason}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Delivery & Tracking */}
          <section
            aria-labelledby="delivery-heading"
            className="border border-white/10 bg-[#0D0D0F] p-6 sm:p-8 space-y-4"
          >
            <h2
              id="delivery-heading"
              className="font-serif text-xl font-normal text-[#F5F5F3] border-b border-white/10 pb-3"
            >
              Delivery & Tracking
            </h2>
            <div className="text-xs text-[#A1A1AA] space-y-1 leading-relaxed">
              <p className="text-sm text-[#F5F5F3] font-medium">
                {order.shippingAddress.fullName}
              </p>
              <p>
                {order.shippingAddress.line1}
                {order.shippingAddress.line2
                  ? `, ${order.shippingAddress.line2}`
                  : ""}
              </p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}
              </p>
              <p>
                {order.shippingAddress.country} · {order.shippingAddress.phone}
              </p>
              {order.notes && (
                <p className="pt-1 text-[#F5F5F3]">Notes: {order.notes}</p>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#F5F5F3]">
                <Truck className="w-4 h-4 text-[#C81E1E]" aria-hidden="true" />
                <span>Shipment Tracking</span>
              </div>
              {order.trackingNumber ? (
                <div className="space-y-1 text-[#A1A1AA]">
                  <p>
                    Carrier:{" "}
                    <span className="text-[#F5F5F3]">
                      {order.shippingProvider || "Assigned Carrier"}
                    </span>
                  </p>
                  <p className="tabular-nums">
                    Tracking #:{" "}
                    <span className="text-[#F5F5F3]">
                      {order.trackingNumber}
                    </span>
                  </p>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#F5F5F3] underline underline-offset-4 hover:text-[#C81E1E]"
                    >
                      Track Shipment
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-[#A1A1AA]">
                  Tracking details will appear once your order is dispatched.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
