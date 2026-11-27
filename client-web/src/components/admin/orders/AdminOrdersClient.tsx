"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import { getAdminOrders } from "@/lib/api/admin-orders.api";
import { formatPriceCents } from "@/lib/api/catalog.api";
import { ApiError } from "@/lib/api/client";
import {
  formatFulfilmentLabel,
  formatPaymentStatusLabel,
  getEffectivePaymentStatus,
  getFulfilmentToneClass,
  getPaymentToneClass,
} from "@/lib/orders/order-eligibility";
import type {
  FormattedOrder,
  OrderFulfilmentStatus,
  OrderPaymentStatus,
} from "@/types/order.types";

const FULFILMENT_FILTERS: Array<{
  value: "" | OrderFulfilmentStatus;
  label: string;
}> = [
  { value: "", label: "All Fulfilment" },
  { value: "placed", label: "Placed" },
  { value: "payment_confirmed", label: "Payment Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_FILTERS: Array<{
  value: "" | OrderPaymentStatus;
  label: string;
}> = [
  { value: "", label: "All Payment Status" },
  { value: "pending", label: "Payment Pending" },
  { value: "confirming", label: "Confirming" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Payment Failed" },
  { value: "expired", label: "Expired" },
];

const LIMIT_OPTIONS = [10, 20, 50] as const;

export function AdminOrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const initialLimit = LIMIT_OPTIONS.includes(
    Number(searchParams.get("limit")) as 10 | 20 | 50,
  )
    ? (Number(searchParams.get("limit")) as 10 | 20 | 50)
    : 10;
  const initialSearch = searchParams.get("search") || "";
  const initialFulfilment = (searchParams.get("fulfilmentStatus") || "") as
    | ""
    | OrderFulfilmentStatus;
  const initialPayment = (searchParams.get("paymentStatus") || "") as
    | ""
    | OrderPaymentStatus;

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [fulfilmentStatus, setFulfilmentStatus] = useState<
    "" | OrderFulfilmentStatus
  >(initialFulfilment);
  const [paymentStatus, setPaymentStatus] = useState<"" | OrderPaymentStatus>(
    initialPayment,
  );
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState<10 | 20 | 50>(initialLimit);

  const [orders, setOrders] = useState<FormattedOrder[]>([]);
  const [meta, setMeta] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestSeqRef = useRef(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() !== debouncedSearch) {
        setDebouncedSearch(searchInput.trim());
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [debouncedSearch, searchInput]);

  // Sync query params to URL cleanly
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (limit !== 10) params.set("limit", String(limit));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (fulfilmentStatus) params.set("fulfilmentStatus", fulfilmentStatus);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);

    const qs = params.toString();
    router.replace(qs ? `/admin/orders?${qs}` : "/admin/orders", {
      scroll: false,
    });
  }, [debouncedSearch, fulfilmentStatus, limit, page, paymentStatus, router]);

  // Fetch paginated orders
  useEffect(() => {
    const seq = ++requestSeqRef.current;

    getAdminOrders({
      page,
      limit,
      search: debouncedSearch || undefined,
      fulfilmentStatus: fulfilmentStatus || undefined,
      paymentStatus: paymentStatus || undefined,
    })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        const nextMeta = res.meta ?? {
          page,
          limit,
          total: 0,
          totalPages: 0,
        };
        // Recover cleanly if current page became out of range
        if (
          (res.data ?? []).length === 0 &&
          page > 1 &&
          nextMeta.totalPages > 0 &&
          page > nextMeta.totalPages
        ) {
          setPage(nextMeta.totalPages);
          return;
        }
        setOrders(res.data ?? []);
        setMeta(nextMeta);
        setError(null);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login?redirect=%2Fadmin%2Forders");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/admin/unauthorized");
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load orders. Please try again.",
        );
      })
      .finally(() => {
        if (seq === requestSeqRef.current) {
          setLoading(false);
        }
      });
  }, [debouncedSearch, fulfilmentStatus, limit, page, paymentStatus, router]);

  const handleRetry = useCallback(() => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    getAdminOrders({
      page,
      limit,
      search: debouncedSearch || undefined,
      fulfilmentStatus: fulfilmentStatus || undefined,
      paymentStatus: paymentStatus || undefined,
    })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        setOrders(res.data ?? []);
        setMeta(res.meta ?? { page, limit, total: 0, totalPages: 0 });
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        setError(
          err instanceof ApiError ? err.message : "Unable to load orders.",
        );
      })
      .finally(() => {
        if (seq === requestSeqRef.current) setLoading(false);
      });
  }, [debouncedSearch, fulfilmentStatus, limit, page, paymentStatus]);

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setFulfilmentStatus("");
    setPaymentStatus("");
    setPage(1);
    setLoading(true);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch || fulfilmentStatus || paymentStatus,
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="COMMERCE OPERATIONS"
        title="Orders"
        description="Inspect customer orders, verify settlement status, and manage fulfilment transitions."
        actions={
          <AdminStatusBadge label={`${meta.total} Total Orders`} />
        }
      />

      {/* Search & Filters */}
      <div className="border border-white/10 bg-[#0D0D0F] p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search
              className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by order #, email, or payment ref..."
              aria-label="Search orders"
              className="w-full h-11 bg-[#141417] border border-white/15 pl-10 pr-4 text-sm text-[#F5F5F3] placeholder:text-[#71717A] focus:outline-none focus:border-[#F5F5F3]"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by fulfilment status"
              value={fulfilmentStatus}
              onChange={(e) => {
                setLoading(true);
                setFulfilmentStatus(
                  e.target.value as "" | OrderFulfilmentStatus,
                );
                setPage(1);
              }}
              className="w-full h-11 bg-[#141417] border border-white/15 px-3 text-xs tracking-[0.12em] uppercase text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
            >
              {FULFILMENT_FILTERS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by payment status"
              value={paymentStatus}
              onChange={(e) => {
                setLoading(true);
                setPaymentStatus(e.target.value as "" | OrderPaymentStatus);
                setPage(1);
              }}
              className="w-full h-11 bg-[#141417] border border-white/15 px-3 text-xs tracking-[0.12em] uppercase text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
            >
              {PAYMENT_FILTERS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <select
              aria-label="Orders per page"
              value={limit}
              onChange={(e) => {
                setLoading(true);
                setLimit(Number(e.target.value) as 10 | 20 | 50);
                setPage(1);
              }}
              className="w-full h-11 bg-[#141417] border border-white/15 px-2.5 text-xs text-[#F5F5F3] tabular-nums focus:outline-none focus:border-[#F5F5F3]"
            >
              {LIMIT_OPTIONS.map((val) => (
                <option key={val} value={val}>
                  {val}/pg
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-[#A1A1AA]">
              Filtered results: {meta.total}
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 border border-white/10 bg-[#0D0D0F]"
            />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <p className="text-sm text-[#A1A1AA]">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-4 py-2 text-[10px] tracking-[0.2em] uppercase cursor-pointer min-h-[40px]"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <AdminEmptyState
          title="No Orders Found"
          description={
            hasActiveFilters
              ? "No orders match the current search or status filters."
              : "Customer orders will appear here once checkout allocations are placed."
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="border border-white/15 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 cursor-pointer min-h-[40px]"
              >
                Reset Filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block border border-white/10 bg-[#0D0D0F] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] tracking-[0.2em] uppercase text-[#71717A]">
                  <th className="py-3.5 px-4 font-normal">Order</th>
                  <th className="py-3.5 px-4 font-normal">Customer</th>
                  <th className="py-3.5 px-4 font-normal">Items</th>
                  <th className="py-3.5 px-4 font-normal">Method</th>
                  <th className="py-3.5 px-4 font-normal">Payment</th>
                  <th className="py-3.5 px-4 font-normal">Fulfilment</th>
                  <th className="py-3.5 px-4 font-normal text-right">Total</th>
                  <th className="py-3.5 px-4 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {orders.map((ord) => {
                  const itemCount = ord.items.reduce(
                    (sum, i) => sum + i.quantity,
                    0,
                  );
                  const effPay = getEffectivePaymentStatus(ord);
                  const customerName = ord.customer
                    ? `${ord.customer.firstName} ${ord.customer.lastName}`.trim()
                    : ord.shippingAddress.fullName;

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-[#141417]/50 transition-colors"
                    >
                      <td className="py-4 px-4 align-middle">
                        <Link
                          href={`/admin/orders/${ord.id}`}
                          className="font-medium text-[#F5F5F3] hover:text-[#C81E1E] transition-colors tabular-nums block"
                        >
                          {ord.orderNumber}
                        </Link>
                        <span className="text-[11px] text-[#71717A] tabular-nums">
                          {ord.createdAt
                            ? new Date(ord.createdAt).toLocaleDateString()
                            : "—"}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-middle max-w-[220px]">
                        <p className="text-[#F5F5F3] truncate">{customerName}</p>
                        <p className="text-xs text-[#71717A] truncate">
                          {ord.customerEmail}
                        </p>
                      </td>

                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="flex -space-x-1.5">
                            {ord.items.slice(0, 2).map((item) => (
                              <div
                                key={item.productId}
                                className="relative w-9 h-7 border border-white/15 bg-[#141417] overflow-hidden"
                              >
                                {item.image ? (
                                  <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    unoptimized
                                    sizes="36px"
                                    className="object-contain p-0.5"
                                  />
                                ) : (
                                  <span className="text-[7px] text-[#71717A] flex items-center justify-center h-full">
                                    APX
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-[#A1A1AA] tabular-nums">
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-middle text-xs text-[#A1A1AA]">
                        {ord.paymentMethod === "cod" ? "COD" : "Crypto"}
                      </td>

                      <td className="py-4 px-4 align-middle">
                        <span
                          className={`inline-block border px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase ${getPaymentToneClass(effPay)}`}
                        >
                          {formatPaymentStatusLabel(effPay)}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-middle">
                        <span
                          className={`inline-block border px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase ${getFulfilmentToneClass(ord.fulfilmentStatus)}`}
                        >
                          {formatFulfilmentLabel(ord.fulfilmentStatus)}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-middle text-right font-medium text-[#F5F5F3] tabular-nums">
                        {formatPriceCents(ord.totalAmount, ord.currency)}
                      </td>

                      <td className="py-4 px-4 align-middle text-right">
                        <Link
                          href={`/admin/orders/${ord.id}`}
                          className="inline-flex items-center border border-white/15 bg-[#141417] px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] hover:border-white/40 transition-colors"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Stacked Cards */}
          <div className="lg:hidden space-y-3">
            {orders.map((ord) => {
              const effPay = getEffectivePaymentStatus(ord);
              const itemCount = ord.items.reduce(
                (sum, i) => sum + i.quantity,
                0,
              );
              const customerName = ord.customer
                ? `${ord.customer.firstName} ${ord.customer.lastName}`.trim()
                : ord.shippingAddress.fullName;

              return (
                <article
                  key={ord.id}
                  className="border border-white/10 bg-[#0D0D0F] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/admin/orders/${ord.id}`}
                        className="font-medium text-sm text-[#F5F5F3] tabular-nums"
                      >
                        {ord.orderNumber}
                      </Link>
                      <p className="text-xs text-[#A1A1AA] mt-0.5">
                        {customerName} · {ord.customerEmail}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-[#F5F5F3] tabular-nums shrink-0">
                      {formatPriceCents(ord.totalAmount, ord.currency)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`border px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase ${getFulfilmentToneClass(ord.fulfilmentStatus)}`}
                    >
                      {formatFulfilmentLabel(ord.fulfilmentStatus)}
                    </span>
                    <span
                      className={`border px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase ${getPaymentToneClass(effPay)}`}
                    >
                      {formatPaymentStatusLabel(effPay)}
                    </span>
                    <span className="text-[11px] text-[#71717A] tabular-nums">
                      {ord.paymentMethod === "cod" ? "COD" : "Crypto"} ·{" "}
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-[#71717A] tabular-nums">
                      {ord.createdAt
                        ? new Date(ord.createdAt).toLocaleDateString()
                        : "—"}
                    </span>
                    <Link
                      href={`/admin/orders/${ord.id}`}
                      className="border border-white/15 bg-[#141417] px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] min-h-[40px] inline-flex items-center"
                    >
                      Manage Order
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Server-Side Pagination */}
          {meta.totalPages > 1 && (
            <nav
              aria-label="Admin orders pagination"
              className="flex flex-wrap items-center justify-between gap-4 border border-white/10 bg-[#0D0D0F] px-5 py-3.5"
            >
              <p className="text-xs text-[#A1A1AA] tabular-nums">
                Page {meta.page} of {meta.totalPages} · {meta.total} orders
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={meta.page <= 1 || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  className="inline-flex items-center gap-1.5 border border-white/15 bg-[#141417] px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={meta.page >= meta.totalPages || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.min(meta.totalPages, p + 1));
                  }}
                  className="inline-flex items-center gap-1.5 border border-white/15 bg-[#141417] px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
