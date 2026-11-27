"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import {
  getAdminPaymentById,
  getAdminPayments,
  getAdminPaymentsSummary,
  type AdminPaymentDetail,
  type AdminPaymentsSummary,
  type AdminPaymentStatusFilter,
  type AdminPaymentTransactionItem,
} from "@/lib/api/admin-payments.api";
import { ApiError } from "@/lib/api/client";

function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format((cents || 0) / 100);
}

function formatCryptoAmount(
  raw?: string,
  decimals = 18,
  token?: string,
): string {
  if (!raw) return "—";
  try {
    const val = BigInt(raw);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = val / divisor;
    const rem = (val % divisor).toString().padStart(decimals, "0");
    const trimmed = rem.slice(0, 6).replace(/0+$/, "");
    const numStr = trimmed ? `${whole}.${trimmed}` : `${whole}`;
    return token ? `${numStr} ${token}` : numStr;
  } catch {
    return token ? `${raw} ${token}` : raw;
  }
}

function getStatusTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" {
  if (status === "verified" || status === "paid") return "success";
  if (status === "pending" || status === "confirming") return "warning";
  if (
    status === "failed" ||
    status === "expired" ||
    status === "underpaid" ||
    status === "overpaid" ||
    status === "reverted" ||
    status === "wrong_token" ||
    status === "wrong_network"
  ) {
    return "danger";
  }
  return "neutral";
}

function truncateHash(hash?: string): string {
  if (!hash) return "—";
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function AdminPaymentsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || "",
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get("search") || "",
  );
  const [statusFilter, setStatusFilter] = useState<AdminPaymentStatusFilter>(
    (searchParams.get("status") || "all") as AdminPaymentStatusFilter,
  );
  const [methodFilter, setMethodFilter] = useState<
    "all" | "crypto_wallet" | "cod"
  >(
    (searchParams.get("paymentMethod") || "all") as
      | "all"
      | "crypto_wallet"
      | "cod",
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [page, setPage] = useState(initialPage);
  const limit = 15;

  const [summary, setSummary] = useState<AdminPaymentsSummary>({
    collectedRevenue: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedExpiredPayments: 0,
    cryptoRevenue: 0,
    codCollected: 0,
  });
  const [transactions, setTransactions] = useState<
    AdminPaymentTransactionItem[]
  >([]);
  const [meta, setMeta] = useState({
    page: initialPage,
    limit,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment details modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] =
    useState<AdminPaymentDetail | null>(null);

  const requestSeqRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() !== debouncedSearch) {
        setDebouncedSearch(searchInput.trim());
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [debouncedSearch, searchInput]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (methodFilter !== "all") params.set("paymentMethod", methodFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString();
    router.replace(qs ? `/admin/payments?${qs}` : "/admin/payments", {
      scroll: false,
    });
  }, [dateFrom, dateTo, debouncedSearch, methodFilter, page, router, statusFilter]);

  const fetchPayments = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    try {
      const [summaryRes, listRes] = await Promise.all([
        getAdminPaymentsSummary(),
        getAdminPayments({
          page,
          limit,
          search: debouncedSearch || undefined,
          status: statusFilter,
          paymentMethod: methodFilter,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      ]);
      if (seq !== requestSeqRef.current) return;
      if (
        listRes.data.length === 0 &&
        page > 1 &&
        listRes.meta.totalPages > 0 &&
        page > listRes.meta.totalPages
      ) {
        setPage(listRes.meta.totalPages);
        return;
      }
      setSummary(summaryRes);
      setTransactions(listRes.data);
      setMeta(listRes.meta);
      setError(null);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?redirect=%2Fadmin%2Fpayments");
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        router.replace("/admin/unauthorized");
        return;
      }
      setError(
        err instanceof ApiError ? err.message : "Unable to load payments.",
      );
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, methodFilter, page, router, statusFilter]);

  useEffect(() => {
    const seq = ++requestSeqRef.current;
    Promise.all([
      getAdminPaymentsSummary(),
      getAdminPayments({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter,
        paymentMethod: methodFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    ])
      .then(([summaryRes, listRes]) => {
        if (seq !== requestSeqRef.current) return;
        if (
          listRes.data.length === 0 &&
          page > 1 &&
          listRes.meta.totalPages > 0 &&
          page > listRes.meta.totalPages
        ) {
          setPage(listRes.meta.totalPages);
          return;
        }
        setSummary(summaryRes);
        setTransactions(listRes.data);
        setMeta(listRes.meta);
        setError(null);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login?redirect=%2Fadmin%2Fpayments");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/admin/unauthorized");
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "Unable to load payments.",
        );
      })
      .finally(() => {
        if (seq === requestSeqRef.current) setLoading(false);
      });
  }, [dateFrom, dateTo, debouncedSearch, methodFilter, page, router, statusFilter]);

  const openDetailModal = async (transactionId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedDetail(null);
    try {
      const detail = await getAdminPaymentById(transactionId);
      setSelectedDetail(detail);
    } catch (err) {
      setDetailError(
        err instanceof ApiError
          ? err.message
          : "Unable to load payment details.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      statusFilter !== "all" ||
      methodFilter !== "all" ||
      dateFrom ||
      dateTo,
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="FINANCE & SETTLEMENT"
        title="Payments"
        description="Read-only ledger of blockchain-verified crypto payments and Cash on Delivery collections."
        actions={<AdminStatusBadge label={`${meta.total} Transactions`} />}
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Collected Revenue",
            value: formatCents(summary.collectedRevenue),
            tone: "default",
          },
          {
            label: "Successful Payments",
            value: summary.successfulPayments,
            tone: "success",
          },
          {
            label: "Pending Payments",
            value: summary.pendingPayments,
            tone: summary.pendingPayments > 0 ? "warning" : "default",
          },
          {
            label: "Failed / Expired",
            value: summary.failedExpiredPayments,
            tone: summary.failedExpiredPayments > 0 ? "danger" : "default",
          },
          {
            label: "Crypto Revenue",
            value: formatCents(summary.cryptoRevenue),
            tone: "default",
          },
          {
            label: "COD Collected",
            value: formatCents(summary.codCollected),
            tone: "default",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="border border-white/10 bg-[#0D0D0F] px-4 py-3.5"
          >
            <p className="text-[10px] tracking-[0.18em] uppercase text-[#71717A]">
              {card.label}
            </p>
            <p
              className={`mt-1 text-lg font-medium tabular-nums ${
                card.tone === "success"
                  ? "text-emerald-400"
                  : card.tone === "warning"
                    ? "text-amber-400"
                    : card.tone === "danger"
                      ? "text-[#C81E1E]"
                      : "text-[#F5F5F3]"
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="border border-white/10 bg-[#0D0D0F] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="sm:col-span-2 relative">
          <Search
            className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search ref, order #, customer, or tx hash..."
            aria-label="Search payments"
            className="w-full h-11 bg-[#141417] border border-white/15 pl-10 pr-4 text-sm text-[#F5F5F3] placeholder:text-[#71717A] focus:outline-none focus:border-[#F5F5F3]"
          />
        </div>

        <select
          aria-label="Filter by payment status"
          value={statusFilter}
          onChange={(e) => {
            setLoading(true);
            setStatusFilter(e.target.value as AdminPaymentStatusFilter);
            setPage(1);
          }}
          className="h-11 bg-[#141417] border border-white/15 px-3 text-xs uppercase tracking-[0.12em] text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
        >
          <option value="all">All Statuses</option>
          <option value="verified">Paid / Verified</option>
          <option value="pending">Pending</option>
          <option value="confirming">Confirming</option>
          <option value="failed">Failed</option>
          <option value="expired">Expired</option>
        </select>

        <select
          aria-label="Filter by payment method"
          value={methodFilter}
          onChange={(e) => {
            setLoading(true);
            setMethodFilter(
              e.target.value as "all" | "crypto_wallet" | "cod",
            );
            setPage(1);
          }}
          className="h-11 bg-[#141417] border border-white/15 px-3 text-xs uppercase tracking-[0.12em] text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
        >
          <option value="all">All Methods</option>
          <option value="crypto_wallet">Crypto Wallet</option>
          <option value="cod">Cash on Delivery</option>
        </select>

        <input
          type="date"
          aria-label="Filter from date"
          value={dateFrom}
          onChange={(e) => {
            setLoading(true);
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="h-11 bg-[#141417] border border-white/15 px-3 text-xs text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
        />

        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Filter to date"
            value={dateTo}
            onChange={(e) => {
              setLoading(true);
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="flex-1 h-11 bg-[#141417] border border-white/15 px-3 text-xs text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setDebouncedSearch("");
                setStatusFilter("all");
                setMethodFilter("all");
                setDateFrom("");
                setDateTo("");
                setPage(1);
                setLoading(true);
              }}
              aria-label="Clear filters"
              className="inline-flex items-center justify-center border border-white/15 px-3 h-11 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 border border-white/10 bg-[#0D0D0F]" />
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
            onClick={() => {
              setLoading(true);
              setError(null);
              void fetchPayments();
            }}
            className="inline-flex items-center gap-2 bg-[#C81E1E] text-[#F5F5F3] px-4 py-2 text-[10px] tracking-[0.2em] uppercase cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <AdminEmptyState
          title="No Payment Transactions"
          description={
            hasActiveFilters
              ? "No transactions match your current search or filters."
              : "Transactions will appear here once customers initiate payments or place COD orders."
          }
        />
      ) : (
        <>
          <div className="border border-white/10 bg-[#0D0D0F] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] tracking-[0.2em] uppercase text-[#71717A]">
                  <th className="py-3.5 px-4 font-normal">Payment Ref</th>
                  <th className="py-3.5 px-4 font-normal">Order</th>
                  <th className="py-3.5 px-4 font-normal">Customer</th>
                  <th className="py-3.5 px-4 font-normal">Method</th>
                  <th className="py-3.5 px-4 font-normal text-right">
                    Expected
                  </th>
                  <th className="py-3.5 px-4 font-normal text-right">
                    Received
                  </th>
                  <th className="py-3.5 px-4 font-normal">Status</th>
                  <th className="py-3.5 px-4 font-normal">Tx Hash</th>
                  <th className="py-3.5 px-4 font-normal">Created / Paid</th>
                  <th className="py-3.5 px-4 font-normal text-right">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-xs">
                {transactions.map((tx) => (
                  <tr
                    key={`${tx.source}-${tx.id}`}
                    className="hover:bg-[#141417]/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 align-middle font-medium text-[#F5F5F3]">
                      <button
                        type="button"
                        onClick={() => void openDetailModal(tx.id)}
                        className="hover:text-[#C81E1E] text-left cursor-pointer"
                      >
                        {tx.paymentReference}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 align-middle">
                      <Link
                        href={`/admin/orders/${tx.orderId}`}
                        className="text-[#F5F5F3] hover:text-[#C81E1E] underline-offset-4 hover:underline"
                      >
                        {tx.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 align-middle">
                      <Link
                        href={`/admin/customers/${tx.customerId}`}
                        className="text-[#F5F5F3] hover:text-[#C81E1E] block truncate max-w-[160px]"
                      >
                        {tx.customerName || tx.customerEmail}
                      </Link>
                      <p className="text-[11px] text-[#71717A] truncate max-w-[160px]">
                        {tx.customerEmail}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 align-middle text-[#A1A1AA] uppercase tracking-wider">
                      {tx.paymentMethod === "cod" ? "COD" : "Crypto"}
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right tabular-nums text-[#F5F5F3]">
                      <p>{formatCents(tx.orderTotalAmount, tx.currency)}</p>
                      {tx.expectedAmount && (
                        <p className="text-[11px] text-[#71717A]">
                          {formatCryptoAmount(
                            tx.expectedAmount,
                            tx.tokenDecimals ?? 18,
                            tx.token,
                          )}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right tabular-nums text-[#A1A1AA]">
                      {tx.source === "cod_order"
                        ? tx.status === "paid"
                          ? formatCents(tx.orderTotalAmount, tx.currency)
                          : "—"
                        : formatCryptoAmount(
                            tx.receivedAmount,
                            tx.tokenDecimals ?? 18,
                            tx.token,
                          )}
                    </td>
                    <td className="py-3.5 px-4 align-middle">
                      <AdminStatusBadge
                        label={tx.status}
                        tone={getStatusTone(tx.status)}
                      />
                    </td>
                    <td className="py-3.5 px-4 align-middle font-mono text-[11px] text-[#A1A1AA]">
                      {truncateHash(tx.transactionHash)}
                    </td>
                    <td className="py-3.5 px-4 align-middle text-[#A1A1AA] tabular-nums whitespace-nowrap">
                      <p>{new Date(tx.createdAt).toLocaleDateString()}</p>
                      {tx.verifiedAt && (
                        <p className="text-[11px] text-emerald-400">
                          Paid {new Date(tx.verifiedAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right">
                      <button
                        type="button"
                        onClick={() => void openDetailModal(tx.id)}
                        className="border border-white/15 bg-[#141417] px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase text-[#F5F5F3] hover:border-white/40 cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <nav
              aria-label="Payments pagination"
              className="flex items-center justify-between gap-4 border border-white/10 bg-[#0D0D0F] px-5 py-3.5"
            >
              <p className="text-xs text-[#A1A1AA] tabular-nums">
                Page {meta.page} of {meta.totalPages} · {meta.total}{" "}
                transactions
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={meta.page <= 1 || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  className="inline-flex items-center gap-1.5 border border-white/15 bg-[#141417] px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] disabled:opacity-40 cursor-pointer min-h-[44px]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={meta.page >= meta.totalPages || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.min(meta.totalPages, p + 1));
                  }}
                  className="inline-flex items-center gap-1.5 border border-white/15 bg-[#141417] px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] disabled:opacity-40 cursor-pointer min-h-[44px]"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}

      {/* Read-only Payment Detail Modal */}
      {detailOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
        >
          <div className="w-full max-w-2xl border border-white/15 bg-[#0D0D0F] p-6 space-y-5 my-8">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#71717A]">
                  PAYMENT AUDIT RECORD (READ-ONLY)
                </p>
                <h2
                  id="payment-detail-title"
                  className="text-lg font-medium text-[#F5F5F3] mt-1"
                >
                  {selectedDetail?.paymentReference || "Loading payment..."}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                aria-label="Close payment details"
                className="text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="h-48 border border-white/10 bg-[#141417]" />
            ) : detailError ? (
              <div
                role="alert"
                className="border border-[#C81E1E]/60 bg-[#141417] p-4 text-xs text-[#F5F5F3]"
              >
                {detailError}
              </div>
            ) : selectedDetail ? (
              <div className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-white/10 bg-[#080808] p-4">
                  <div>
                    <p className="text-[10px] tracking-[0.16em] uppercase text-[#71717A]">
                      Order
                    </p>
                    {selectedDetail.order ? (
                      <Link
                        href={`/admin/orders/${selectedDetail.order.id}`}
                        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[#F5F5F3] hover:text-[#C81E1E]"
                      >
                        {selectedDetail.order.orderNumber}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <p className="mt-1 text-[#A1A1AA]">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.16em] uppercase text-[#71717A]">
                      Customer
                    </p>
                    {selectedDetail.customer ? (
                      <Link
                        href={`/admin/customers/${selectedDetail.customer.id}`}
                        className="mt-1 block text-sm font-medium text-[#F5F5F3] hover:text-[#C81E1E]"
                      >
                        {selectedDetail.customer.name} (
                        {selectedDetail.customer.email})
                      </Link>
                    ) : (
                      <p className="mt-1 text-[#A1A1AA]">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.16em] uppercase text-[#71717A]">
                      Payment Method & Status
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="uppercase text-[#F5F5F3]">
                        {selectedDetail.paymentMethod === "cod"
                          ? "Cash on Delivery"
                          : "Crypto Wallet"}
                      </span>
                      <AdminStatusBadge
                        label={selectedDetail.status}
                        tone={getStatusTone(selectedDetail.status)}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.16em] uppercase text-[#71717A]">
                      Order Amount ({selectedDetail.currency})
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#F5F5F3] tabular-nums">
                      {formatCents(
                        selectedDetail.orderTotalAmount,
                        selectedDetail.currency,
                      )}
                    </p>
                  </div>
                </div>

                <dl className="divide-y divide-white/10 border border-white/10 bg-[#080808] px-4">
                  <div className="py-2.5 flex justify-between gap-3">
                    <dt className="text-[#71717A] uppercase tracking-[0.14em]">
                      Attempt
                    </dt>
                    <dd className="text-[#F5F5F3] tabular-nums">
                      #{selectedDetail.attemptNumber}
                    </dd>
                  </div>
                  {selectedDetail.network && (
                    <div className="py-2.5 flex justify-between gap-3">
                      <dt className="text-[#71717A] uppercase tracking-[0.14em]">
                        Network / Token
                      </dt>
                      <dd className="text-[#F5F5F3] uppercase">
                        {selectedDetail.network} · {selectedDetail.token}
                      </dd>
                    </div>
                  )}
                  {selectedDetail.expectedAmount && (
                    <div className="py-2.5 flex justify-between gap-3">
                      <dt className="text-[#71717A] uppercase tracking-[0.14em]">
                        Expected Crypto
                      </dt>
                      <dd className="text-[#F5F5F3] tabular-nums">
                        {formatCryptoAmount(
                          selectedDetail.expectedAmount,
                          selectedDetail.tokenDecimals ?? 18,
                          selectedDetail.token,
                        )}
                      </dd>
                    </div>
                  )}
                  {selectedDetail.receivedAmount && (
                    <div className="py-2.5 flex justify-between gap-3">
                      <dt className="text-[#71717A] uppercase tracking-[0.14em]">
                        Received Amount
                      </dt>
                      <dd className="text-emerald-400 tabular-nums">
                        {selectedDetail.source === "cod_order"
                          ? formatCents(
                              Number(selectedDetail.receivedAmount),
                              selectedDetail.currency,
                            )
                          : formatCryptoAmount(
                              selectedDetail.receivedAmount,
                              selectedDetail.tokenDecimals ?? 18,
                              selectedDetail.token,
                            )}
                      </dd>
                    </div>
                  )}
                  {selectedDetail.transactionHash && (
                    <div className="py-2.5 flex justify-between gap-3">
                      <dt className="text-[#71717A] uppercase tracking-[0.14em]">
                        Tx Hash
                      </dt>
                      <dd className="text-[#F5F5F3] font-mono break-all text-right">
                        {selectedDetail.transactionHash}
                      </dd>
                    </div>
                  )}
                  {selectedDetail.confirmations !== undefined && (
                    <div className="py-2.5 flex justify-between gap-3">
                      <dt className="text-[#71717A] uppercase tracking-[0.14em]">
                        Confirmations
                      </dt>
                      <dd className="text-[#F5F5F3] tabular-nums">
                        {selectedDetail.confirmations} /{" "}
                        {selectedDetail.requiredConfirmations ?? 3}
                      </dd>
                    </div>
                  )}
                  {selectedDetail.verifiedAt && (
                    <div className="py-2.5 flex justify-between gap-3">
                      <dt className="text-[#71717A] uppercase tracking-[0.14em]">
                        Verified / Paid At
                      </dt>
                      <dd className="text-[#F5F5F3] tabular-nums">
                        {new Date(selectedDetail.verifiedAt).toLocaleString()}
                      </dd>
                    </div>
                  )}
                  {selectedDetail.expiresAt && (
                    <div className="py-2.5 flex justify-between gap-3">
                      <dt className="text-[#71717A] uppercase tracking-[0.14em]">
                        Expires At
                      </dt>
                      <dd className="text-[#F5F5F3] tabular-nums">
                        {new Date(selectedDetail.expiresAt).toLocaleString()}
                      </dd>
                    </div>
                  )}
                  {selectedDetail.failureReason && (
                    <div className="py-2.5 flex justify-between gap-3">
                      <dt className="text-[#C81E1E] uppercase tracking-[0.14em]">
                        Failure Reason
                      </dt>
                      <dd className="text-[#F5F5F3] text-right">
                        {selectedDetail.failureReason}
                      </dd>
                    </div>
                  )}
                </dl>

                {selectedDetail.attemptHistory.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] tracking-[0.18em] uppercase text-[#71717A]">
                      Payment Attempt History (
                      {selectedDetail.attemptHistory.length})
                    </p>
                    <div className="border border-white/10 bg-[#080808] divide-y divide-white/10">
                      {selectedDetail.attemptHistory.map((att) => (
                        <div
                          key={att.id}
                          className="px-4 py-2.5 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-[#F5F5F3] font-medium">
                              Attempt #{att.attemptNumber} ·{" "}
                              {att.paymentReference}
                            </p>
                            {att.failureReason && (
                              <p className="text-[11px] text-[#C81E1E]">
                                {att.failureReason}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <AdminStatusBadge
                              label={att.status}
                              tone={getStatusTone(att.status)}
                            />
                            <span className="text-[11px] text-[#71717A] tabular-nums">
                              {new Date(att.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="border border-white/15 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
