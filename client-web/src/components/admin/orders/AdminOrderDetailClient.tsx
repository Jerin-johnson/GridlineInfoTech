"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ExternalLink,
  RotateCcw,
  Truck,
} from "lucide-react";
import { AdminPanel } from "@/components/admin/AdminPrimitives";
import {
  getAdminOrderById,
  updateAdminOrderStatus,
} from "@/lib/api/admin-orders.api";
import { formatPriceCents } from "@/lib/api/catalog.api";
import { ApiError } from "@/lib/api/client";
import {
  getAvailableAdminTransitions,
  type AdminTransitionOption,
} from "@/lib/orders/admin-order-transitions";
import {
  formatFulfilmentLabel,
  formatPaymentStatusLabel,
  getEffectivePaymentStatus,
  getFulfilmentToneClass,
  getPaymentToneClass,
} from "@/lib/orders/order-eligibility";
import type { FormattedOrder } from "@/types/order.types";

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

interface AdminOrderDetailClientProps {
  orderId: string;
}

export function AdminOrderDetailClient({
  orderId,
}: AdminOrderDetailClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [order, setOrder] = useState<FormattedOrder | null>(null);

  const [selectedTransition, setSelectedTransition] =
    useState<AdminTransitionOption | null>(null);
  const [shippingProvider, setShippingProvider] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getAdminOrderById(orderId);
      setOrder(data);
      setShippingProvider(data.shippingProvider || "");
      setTrackingNumber(data.trackingNumber || "");
      setTrackingUrl(data.trackingUrl || "");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace(
          `/login?redirect=${encodeURIComponent(`/admin/orders/${orderId}`)}`,
        );
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        router.replace("/admin/unauthorized");
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        return;
      }
      setError(
        err instanceof ApiError ? err.message : "Unable to load order details.",
      );
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    let active = true;
    getAdminOrderById(orderId)
      .then((data) => {
        if (!active) return;
        setOrder(data);
        setShippingProvider(data.shippingProvider || "");
        setTrackingNumber(data.trackingNumber || "");
        setTrackingUrl(data.trackingUrl || "");
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(
            `/login?redirect=${encodeURIComponent(`/admin/orders/${orderId}`)}`,
          );
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/admin/unauthorized");
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
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

  const handleTransitionSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!order || !selectedTransition || submitting) return;

    setActionError(null);
    setActionSuccess(null);

    const providerTrimmed = shippingProvider.trim();
    const trackingTrimmed = trackingNumber.trim();
    const urlTrimmed = trackingUrl.trim();
    const noteTrimmed = note.trim();

    if (selectedTransition.requiresShipping) {
      if (!providerTrimmed || !trackingTrimmed) {
        setActionError(
          "Carrier and tracking number are required when marking an order as shipped.",
        );
        return;
      }
      if (urlTrimmed && !isValidHttpUrl(urlTrimmed)) {
        setActionError("Tracking URL must start with http:// or https://.");
        return;
      }
    }

    const isUnpaidCodDelivery =
      order.paymentMethod === "cod" &&
      order.paymentStatus !== "paid" &&
      selectedTransition.target === "delivered";

    setSubmitting(true);
    try {
      const updated = await updateAdminOrderStatus(order.id, {
        fulfilmentStatus: selectedTransition.target,
        ...(isUnpaidCodDelivery ? { codPaymentReceived: true } : {}),
        ...(noteTrimmed ? { note: noteTrimmed } : {}),
        ...(providerTrimmed ? { shippingProvider: providerTrimmed } : {}),
        ...(trackingTrimmed ? { trackingNumber: trackingTrimmed } : {}),
        ...(urlTrimmed ? { trackingUrl: urlTrimmed } : {}),
      });

      setOrder(updated);
      setShippingProvider(updated.shippingProvider || "");
      setTrackingNumber(updated.trackingNumber || "");
      setTrackingUrl(updated.trackingUrl || "");
      setNote("");
      setSelectedTransition(null);
      router.refresh();
      setActionSuccess(
        isUnpaidCodDelivery
          ? `Order ${updated.orderNumber} marked as Delivered and COD payment confirmed.`
          : `Order ${updated.orderNumber} updated to ${formatFulfilmentLabel(updated.fulfilmentStatus)}.`,
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Failed to update order status.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-9 w-56 bg-[#141417]" />
        <div className="h-44 border border-white/10 bg-[#0D0D0F]" />
        <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="border border-white/10 bg-[#0D0D0F] p-8 max-w-lg space-y-4">
        <p className="text-[10px] tracking-[0.24em] uppercase text-[#C81E1E]">
          404 · Not Found
        </p>
        <h1 className="font-serif text-2xl text-[#F5F5F3]">Order Not Found</h1>
        <p className="text-sm text-[#A1A1AA]">
          The requested order ID does not exist in the system.
        </p>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 border border-white/15 px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to Orders
        </Link>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div
        role="alert"
        className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-8 max-w-lg space-y-4"
      >
        <h1 className="font-serif text-2xl text-[#F5F5F3]">
          Unable to Load Order
        </h1>
        <p className="text-sm text-[#A1A1AA]">
          {error || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={() => void loadOrder()}
          className="inline-flex items-center gap-2 bg-[#C81E1E] text-[#F5F5F3] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase cursor-pointer min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  const effPayStatus = getEffectivePaymentStatus(order);
  const transitions = getAvailableAdminTransitions(order);
  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
    : order.shippingAddress.fullName;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="border-b border-white/10 pb-6 space-y-4">
        <Link
          href="/admin/orders"
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
                className={`border px-2.5 py-1 text-[10px] tracking-[0.16em] uppercase ${getFulfilmentToneClass(order.fulfilmentStatus)}`}
              >
                {formatFulfilmentLabel(order.fulfilmentStatus)}
              </span>
              <span
                className={`border px-2.5 py-1 text-[10px] tracking-[0.16em] uppercase ${getPaymentToneClass(effPayStatus)}`}
              >
                {formatPaymentStatusLabel(effPayStatus)}
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] tabular-nums">
              {order.createdAt
                ? `Created ${new Date(order.createdAt).toLocaleString()}`
                : ""}{" "}
              · {order.paymentMethod === "cod" ? "Cash on Delivery" : "Crypto Wallet"}{" "}
              · Ref: {order.paymentReference}
            </p>
          </div>

          {/* Available Admin Transitions */}
          {transitions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              {transitions.map((opt) => (
                <button
                  key={opt.target}
                  type="button"
                  onClick={() => {
                    setSelectedTransition(opt);
                    setActionError(null);
                    setActionSuccess(null);
                  }}
                  className={`px-4 py-2.5 text-[10px] tracking-[0.18em] uppercase font-medium transition-colors cursor-pointer min-h-[40px] ${
                    opt.isDanger
                      ? "border border-[#C81E1E]/60 text-[#C81E1E] hover:bg-[#C81E1E] hover:text-[#F5F5F3]"
                      : "bg-[#F5F5F3] text-[#080808] hover:bg-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {actionSuccess && (
          <div
            role="status"
            className="border border-emerald-500/40 bg-[#0D0D0F] p-4 flex items-center gap-2.5 text-xs text-emerald-400"
          >
            <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-4 flex items-start gap-2.5 text-xs text-[#F5F5F3]"
          >
            <AlertCircle
              className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{actionError}</span>
          </div>
        )}
      </header>

      {/* Transition Confirmation / Shipping Form */}
      {selectedTransition && (
        <form
          onSubmit={handleTransitionSubmit}
          className="border border-[#C81E1E]/50 bg-[#0D0D0F] p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-serif text-lg text-[#F5F5F3]">
              Confirm Action: {selectedTransition.label}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedTransition(null)}
              className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {selectedTransition.requiresShipping && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Carrier / Provider *
                </span>
                <input
                  type="text"
                  required
                  value={shippingProvider}
                  onChange={(e) => setShippingProvider(e.target.value)}
                  placeholder="DHL Express / FedEx"
                  className="w-full h-10 bg-[#141417] border border-white/15 px-3 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Tracking Number *
                </span>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Tracking code"
                  className="w-full h-10 bg-[#141417] border border-white/15 px-3 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Tracking URL (Optional)
                </span>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-10 bg-[#141417] border border-white/15 px-3 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>
            </div>
          )}

          <label className="block space-y-1.5 text-xs">
            <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
              {selectedTransition.isDanger
                ? "Cancellation Reason (Optional)"
                : "Admin Note (Optional)"}
            </span>
            <input
              type="text"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional internal / timeline note..."
              className="w-full h-10 bg-[#141417] border border-white/15 px-3 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
            />
          </label>

          {order.paymentMethod === "cod" &&
          order.paymentStatus !== "paid" &&
          selectedTransition.target === "delivered" ? (
            <div className="space-y-4">
              <div className="border border-white/15 bg-[#080808] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[10px] tracking-[0.16em] uppercase text-[#71717A]">
                    Order Number
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#F5F5F3]">
                    {order.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.16em] uppercase text-[#71717A]">
                    COD Amount Due
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#F5F5F3] tabular-nums">
                    {formatPriceCents(order.totalAmount, order.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.16em] uppercase text-[#71717A]">
                    Payment Method
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#F5F5F3]">
                    Cash on Delivery
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#A1A1AA]">
                Explicit confirmation required: Has the full Cash on Delivery
                payment been received for this order? Delivery cannot be
                completed until COD payment is confirmed.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#F5F5F3] hover:bg-white text-[#080808] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium cursor-pointer min-h-[44px] disabled:opacity-60"
                >
                  {submitting
                    ? "Confirming..."
                    : "Payment Received — Confirm Delivery"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setSelectedTransition(null);
                    setNote("");
                    setActionError(
                      "Payment has not been received. This COD order cannot be marked as delivered.",
                    );
                  }}
                  className="bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium cursor-pointer min-h-[44px] disabled:opacity-60"
                >
                  Payment Not Received
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setSelectedTransition(null)}
                  className="border border-white/15 px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className={`px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium cursor-pointer min-h-[44px] disabled:opacity-60 ${
                  selectedTransition.isDanger
                    ? "bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3]"
                    : "bg-[#F5F5F3] hover:bg-white text-[#080808]"
                }`}
              >
                {submitting
                  ? "Updating..."
                  : `Confirm ${selectedTransition.label}`}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <AdminPanel title="Order Items" subtitle={`${order.items.length} line items`}>
            <ul className="divide-y divide-white/10">
              {order.items.map((item) => (
                <li
                  key={item.productId}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-4"
                >
                  <div className="relative w-16 aspect-[4/3] shrink-0 border border-white/10 bg-[#141417] overflow-hidden">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        unoptimized
                        sizes="64px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-[#71717A]">
                        APEX
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#F5F5F3] truncate">
                      {item.name}
                    </p>
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
          </AdminPanel>

          {/* Status History Timeline */}
          <AdminPanel title="Order Timeline" subtitle="Recorded backend status history">
            {order.statusHistory.length === 0 ? (
              <p className="text-xs text-[#A1A1AA]">
                Current state: {formatFulfilmentLabel(order.fulfilmentStatus)}.
              </p>
            ) : (
              <ol className="space-y-4">
                {order.statusHistory.map((entry, idx) => (
                  <li
                    key={`${entry.status}-${idx}`}
                    className="border-l-2 border-white/15 pl-4 space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#F5F5F3]">
                        {entry.status.replaceAll("_", " ")}
                      </span>
                      <span className="text-[11px] text-[#71717A] tabular-nums">
                        {new Date(entry.changedAt).toLocaleString()}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-xs text-[#A1A1AA]">{entry.note}</p>
                    )}
                    <p className="text-[10px] tracking-[0.14em] uppercase text-[#71717A]">
                      Actor: {entry.actor}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </AdminPanel>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <AdminPanel title="Financial Summary">
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
          </AdminPanel>

          <AdminPanel title="Customer & Delivery">
            <div className="space-y-4 text-xs text-[#A1A1AA]">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#F5F5F3]">
                  {customerName}
                </p>
                <p>{order.customerEmail}</p>
                {(order.customer?.phone || order.shippingAddress.phone) && (
                  <p>{order.customer?.phone || order.shippingAddress.phone}</p>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 space-y-1 leading-relaxed">
                <p className="text-[10px] tracking-[0.18em] uppercase text-[#71717A]">
                  Shipping Address ({order.shippingAddress.label})
                </p>
                <p className="text-[#F5F5F3]">
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
                <p>{order.shippingAddress.country}</p>
                {order.notes && (
                  <p className="pt-1 text-[#F5F5F3]">Notes: {order.notes}</p>
                )}
              </div>

              {order.trackingNumber && (
                <div className="pt-3 border-t border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-[#F5F5F3]">
                    <Truck className="w-3.5 h-3.5 text-[#C81E1E]" aria-hidden="true" />
                    <span>{order.shippingProvider || "Carrier"}</span>
                  </div>
                  <p className="tabular-nums">
                    Tracking: <span className="text-[#F5F5F3]">{order.trackingNumber}</span>
                  </p>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#F5F5F3] underline underline-offset-4 hover:text-[#C81E1E]"
                    >
                      Open Tracking Link
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </AdminPanel>

          <AdminPanel title="Payment Details">
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
                <dt className="text-[#A1A1AA]">Payment Status</dt>
                <dd className="text-[#F5F5F3]">
                  {formatPaymentStatusLabel(effPayStatus)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#A1A1AA]">Reference</dt>
                <dd className="text-[#F5F5F3] tabular-nums">
                  {order.paymentReference}
                </dd>
              </div>
              {order.paymentExpiresAt && order.paymentMethod !== "cod" && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#A1A1AA]">Window Expires</dt>
                  <dd className="text-[#F5F5F3] tabular-nums">
                    {new Date(order.paymentExpiresAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
