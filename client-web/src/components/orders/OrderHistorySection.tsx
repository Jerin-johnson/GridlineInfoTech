"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { formatPriceCents } from "@/lib/api/catalog.api";
import { ApiError } from "@/lib/api/client";
import { cancelUserOrder, getUserOrders } from "@/lib/api/orders.api";
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
import type {
  FormattedOrder,
  OrderFulfilmentStatus,
  OrderPaymentStatus,
} from "@/types/order.types";

type OrderFilterKey =
  | "all"
  | "pending_payment"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

const FILTER_OPTIONS: Array<{
  key: OrderFilterKey;
  label: string;
  fulfilmentStatus?: OrderFulfilmentStatus;
  paymentStatus?: OrderPaymentStatus;
}> = [
  { key: "all", label: "All Orders" },
  { key: "pending_payment", label: "Pending Payment", paymentStatus: "pending" },
  { key: "processing", label: "Processing", fulfilmentStatus: "processing" },
  { key: "shipped", label: "Shipped", fulfilmentStatus: "shipped" },
  { key: "delivered", label: "Delivered", fulfilmentStatus: "delivered" },
  { key: "cancelled", label: "Cancelled", fulfilmentStatus: "cancelled" },
];

const PAGE_LIMIT = 8;

export function OrderHistorySection() {
  const [filterKey, setFilterKey] = useState<OrderFilterKey>("all");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<FormattedOrder[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const requestSeqRef = useRef(0);

  const fetchOrders = useCallback(
    async (targetPage: number, targetFilter: OrderFilterKey) => {
      const seq = ++requestSeqRef.current;
      const activeFilter =
        FILTER_OPTIONS.find((f) => f.key === targetFilter) ?? FILTER_OPTIONS[0];

      setLoading(true);
      setError(null);

      try {
        const res = await getUserOrders({
          page: targetPage,
          limit: PAGE_LIMIT,
          fulfilmentStatus: activeFilter.fulfilmentStatus,
          paymentStatus: activeFilter.paymentStatus,
        });

        if (seq !== requestSeqRef.current) return;
        setOrders(res.data ?? []);
        setMeta(
          res.meta ?? {
            page: targetPage,
            limit: PAGE_LIMIT,
            total: 0,
            totalPages: 0,
          },
        );
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load your orders. Please try again.",
        );
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const seq = ++requestSeqRef.current;
    const activeFilter =
      FILTER_OPTIONS.find((f) => f.key === filterKey) ?? FILTER_OPTIONS[0];

    getUserOrders({
      page,
      limit: PAGE_LIMIT,
      fulfilmentStatus: activeFilter.fulfilmentStatus,
      paymentStatus: activeFilter.paymentStatus,
    })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        setOrders(res.data ?? []);
        setMeta(
          res.meta ?? {
            page,
            limit: PAGE_LIMIT,
            total: 0,
            totalPages: 0,
          },
        );
        setError(null);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load your orders. Please try again.",
        );
      })
      .finally(() => {
        if (seq === requestSeqRef.current) {
          setLoading(false);
        }
      });
  }, [filterKey, page]);

  const handleFilterChange = (nextKey: OrderFilterKey) => {
    if (nextKey === filterKey) return;
    setLoading(true);
    setError(null);
    setFilterKey(nextKey);
    setPage(1);
    setConfirmCancelId(null);
    setActionError(null);
  };

  const handleConfirmCancel = async (orderId: string) => {
    if (cancellingId) return;
    setCancellingId(orderId);
    setActionError(null);
    try {
      await cancelUserOrder(orderId);
      setConfirmCancelId(null);
      await fetchOrders(page, filterKey);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Unable to cancel order right now.",
      );
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <section
      aria-labelledby="order-history-heading"
      className="border border-white/10 bg-[#0D0D0F] p-6 sm:p-8 space-y-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <h2
            id="order-history-heading"
            className="font-serif text-2xl font-normal text-[#F5F5F3]"
          >
            Order Management
          </h2>
          <p className="text-xs text-[#A1A1AA] tabular-nums">
            {meta.total} {meta.total === 1 ? "order" : "orders"}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        role="tablist"
        aria-label="Filter orders by status"
        className="flex flex-wrap gap-2"
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = opt.key === filterKey;
          return (
            <button
              key={opt.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleFilterChange(opt.key)}
              className={`px-3.5 py-2 text-[10px] tracking-[0.2em] uppercase border transition-colors cursor-pointer min-h-[36px] ${
                active
                  ? "border-[#C81E1E] bg-[#C81E1E] text-[#F5F5F3]"
                  : "border-white/10 bg-[#080808] text-[#A1A1AA] hover:border-white/30 hover:text-[#F5F5F3]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

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

      {/* Loading / Error / Empty / List */}
      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 border border-white/10 bg-[#141417]"
            />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#141417] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <p className="text-sm text-[#A1A1AA]">{error}</p>
          <button
            type="button"
            onClick={() => void fetchOrders(page, filterKey)}
            className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 cursor-pointer min-h-[40px]"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="border border-white/10 bg-[#080808] p-8 text-center space-y-4">
          <p className="text-sm text-[#A1A1AA]">
            {filterKey === "all"
              ? "You have not placed any orders yet."
              : "No orders match the selected filter."}
          </p>
          {filterKey === "all" ? (
            <Link
              href="/shop"
              className="inline-flex items-center justify-center bg-[#F5F5F3] text-[#080808] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-white transition-colors min-h-[44px]"
            >
              Browse Catalogue
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
              className="border border-white/15 px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 cursor-pointer min-h-[44px]"
            >
              Show All Orders
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => {
            const itemCount = ord.items.reduce((sum, i) => sum + i.quantity, 0);
            const previewItems = ord.items.slice(0, 3);
            const overflowCount = Math.max(0, ord.items.length - 3);
            const effectivePaymentStatus = getEffectivePaymentStatus(ord);
            const showPayOnline = canPayOrderOnline(ord);
            const showCancel = canCancelOrder(ord);
            const isConfirming = confirmCancelId === ord.id;

            return (
              <article
                key={ord.id}
                className="border border-white/10 bg-[#080808] p-5 sm:p-6 space-y-4 hover:border-white/20 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Compact Product Thumbnails (from order summary snapshot — zero N+1) */}
                    <div className="flex items-center -space-x-2 shrink-0 pt-0.5">
                      {previewItems.map((item) => (
                        <div
                          key={item.productId}
                          className="relative w-12 h-10 border border-white/15 bg-[#141417] overflow-hidden"
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              unoptimized
                              sizes="48px"
                              className="object-contain p-0.5"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] tracking-[0.12em] text-[#A1A1AA]">
                              APEX
                            </div>
                          )}
                        </div>
                      ))}
                      {overflowCount > 0 && (
                        <div className="w-10 h-10 border border-white/15 bg-[#141417] flex items-center justify-center text-[10px] text-[#A1A1AA] tabular-nums">
                          +{overflowCount}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                          href={`/profile/orders/${ord.id}`}
                          className="font-serif text-lg sm:text-xl text-[#F5F5F3] hover:text-[#C81E1E] transition-colors tabular-nums"
                        >
                          {ord.orderNumber}
                        </Link>
                        <span
                          className={`border px-2 py-0.5 text-[10px] tracking-[0.16em] uppercase ${getFulfilmentToneClass(ord.fulfilmentStatus)}`}
                        >
                          {formatFulfilmentLabel(ord.fulfilmentStatus)}
                        </span>
                        <span
                          className={`border px-2 py-0.5 text-[10px] tracking-[0.16em] uppercase ${getPaymentToneClass(effectivePaymentStatus)}`}
                        >
                          {formatPaymentStatusLabel(effectivePaymentStatus)}
                        </span>
                      </div>
                      <p className="text-xs text-[#A1A1AA] truncate">
                        {ord.items.map((i) => `${i.name} × ${i.quantity}`).join(" · ")}
                      </p>
                      <p className="text-[11px] text-[#71717A] tabular-nums">
                        {ord.createdAt
                          ? new Date(ord.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Recent"}{" "}
                        · {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
                        {ord.paymentMethod === "cod"
                          ? "Cash on Delivery"
                          : "Crypto Wallet"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0">
                    <span className="text-base sm:text-lg font-medium text-[#F5F5F3] tabular-nums mr-1">
                      {formatPriceCents(ord.totalAmount, ord.currency)}
                    </span>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {showPayOnline && (
                        <Link
                          href={`/profile/orders/${ord.id}?pay=1`}
                          className="bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-4 py-2 text-[10px] tracking-[0.18em] uppercase font-medium transition-colors min-h-[40px] inline-flex items-center"
                        >
                          {getPayOnlineActionLabel(ord)}
                        </Link>
                      )}

                      <Link
                        href={`/profile/orders/${ord.id}`}
                        className="border border-white/15 bg-[#141417] px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] hover:border-white/40 transition-colors min-h-[40px] inline-flex items-center"
                      >
                        View Details
                      </Link>

                      {showCancel && !isConfirming && (
                        <button
                          type="button"
                          onClick={() => setConfirmCancelId(ord.id)}
                          className="border border-white/15 px-3.5 py-2 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#C81E1E] hover:border-[#C81E1E]/60 transition-colors cursor-pointer min-h-[40px]"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isConfirming && (
                  <div className="border-t border-white/10 pt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-[#A1A1AA]">
                      Cancel order {ord.orderNumber} and release reserved stock?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={cancellingId === ord.id}
                        onClick={() => void handleConfirmCancel(ord.id)}
                        className="bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-3.5 py-1.5 text-[10px] tracking-[0.18em] uppercase cursor-pointer min-h-[36px] disabled:opacity-60"
                      >
                        {cancellingId === ord.id
                          ? "Cancelling..."
                          : "Confirm Cancel"}
                      </button>
                      <button
                        type="button"
                        disabled={cancellingId === ord.id}
                        onClick={() => setConfirmCancelId(null)}
                        className="border border-white/15 px-3.5 py-1.5 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer min-h-[36px]"
                      >
                        Keep Order
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Server-Side Pagination Controls */}
      {meta.totalPages > 1 && (
        <nav
          aria-label="Order history pagination"
          className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10"
        >
          <p className="text-xs text-[#A1A1AA] tabular-nums">
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={meta.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1.5 border border-white/15 bg-[#141417] px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Previous
            </button>
            <button
              type="button"
              disabled={meta.page >= meta.totalPages || loading}
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              className="inline-flex items-center gap-1.5 border border-white/15 bg-[#141417] px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}
