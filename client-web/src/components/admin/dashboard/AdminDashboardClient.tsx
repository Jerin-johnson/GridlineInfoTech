"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import {
  getAdminDashboardAnalytics,
  type AdminDashboardData,
  type DashboardRangePreset,
} from "@/lib/api/admin-dashboard.api";
import { ApiError } from "@/lib/api/client";

function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format((cents || 0) / 100);
}

function getStatusTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" {
  if (status === "paid" || status === "delivered") return "success";
  if (status === "cancelled" || status === "failed" || status === "out_of_stock") {
    return "danger";
  }
  if (
    status === "pending" ||
    status === "placed" ||
    status === "processing" ||
    status === "low_stock"
  ) {
    return "warning";
  }
  return "neutral";
}

export function AdminDashboardClient() {
  const router = useRouter();

  const [range, setRange] = useState<DashboardRangePreset>("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reqSeqRef = useRef(0);

  const fetchDashboard = useCallback(async () => {
    const seq = ++reqSeqRef.current;
    try {
      const res = await getAdminDashboardAnalytics({
        range,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      if (seq !== reqSeqRef.current) return;
      setData(res);
      setError(null);
    } catch (err) {
      if (seq !== reqSeqRef.current) return;
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?redirect=%2Fadmin");
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        router.replace("/admin/unauthorized");
        return;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load dashboard analytics.",
      );
    } finally {
      if (seq === reqSeqRef.current) setLoading(false);
    }
  }, [dateFrom, dateTo, range, router]);

  useEffect(() => {
    const seq = ++reqSeqRef.current;
    getAdminDashboardAnalytics({
      range,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((res) => {
        if (seq !== reqSeqRef.current) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (seq !== reqSeqRef.current) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login?redirect=%2Fadmin");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/admin/unauthorized");
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load dashboard analytics.",
        );
      })
      .finally(() => {
        if (seq === reqSeqRef.current) setLoading(false);
      });
  }, [dateFrom, dateTo, range, router]);

  const maxDailyRevenue = data?.salesOverview.reduce(
    (max, pt) => Math.max(max, pt.revenue),
    0,
  ) ?? 0;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="ADMINISTRATION"
        title="Dashboard"
        description="Store performance, verified revenue, and live operational telemetry."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {(["7d", "30d", "90d", "all"] as DashboardRangePreset[]).map(
              (preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setDateFrom("");
                    setDateTo("");
                    setRange(preset);
                  }}
                  className={`px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase border cursor-pointer transition-colors ${
                    !dateFrom && !dateTo && range === preset
                      ? "bg-[#F5F5F3] text-[#080808] border-[#F5F5F3]"
                      : "bg-[#141417] text-[#A1A1AA] border-white/15 hover:text-[#F5F5F3]"
                  }`}
                >
                  {preset === "all" ? "All Time" : preset.toUpperCase()}
                </button>
              ),
            )}
            <input
              type="date"
              aria-label="Dashboard from date"
              value={dateFrom}
              onChange={(e) => {
                setLoading(true);
                setDateFrom(e.target.value);
              }}
              className="h-8 bg-[#141417] border border-white/15 px-2 text-[11px] text-[#F5F5F3]"
            />
            <input
              type="date"
              aria-label="Dashboard to date"
              value={dateTo}
              onChange={(e) => {
                setLoading(true);
                setDateTo(e.target.value);
              }}
              className="h-8 bg-[#141417] border border-white/15 px-2 text-[11px] text-[#F5F5F3]"
            />
          </div>
        }
      />

      {error && (
        <div
          role="alert"
          className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <p className="text-sm text-[#A1A1AA]">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              void fetchDashboard();
            }}
            className="inline-flex items-center gap-2 bg-[#C81E1E] text-[#F5F5F3] px-4 py-2 text-[10px] tracking-[0.2em] uppercase cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <section
        aria-label="Key performance indicators"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <AdminStatCard
          label="Total Revenue"
          value={loading || !data ? null : formatCents(data.kpis.totalRevenue)}
          hint={
            data
              ? `Crypto ${formatCents(data.kpis.cryptoRevenue)} · COD ${formatCents(data.kpis.codCollected)}`
              : "Loading verified revenue..."
          }
        />
        <AdminStatCard
          label="Orders"
          value={loading || !data ? null : data.kpis.totalOrders}
          hint="Orders in selected period"
        />
        <AdminStatCard
          label="Pending Orders"
          value={loading || !data ? null : data.kpis.pendingOrders}
          hint="Awaiting fulfilment or delivery"
        />
        <AdminStatCard
          label="Products"
          value={loading || !data ? null : data.kpis.totalProducts}
          hint="Active & draft catalog SKUs"
        />
        <AdminStatCard
          label="Low Stock"
          value={
            loading || !data
              ? null
              : data.kpis.lowStockProducts + data.kpis.outOfStockProducts
          }
          hint={
            data
              ? `${data.kpis.outOfStockProducts} out of stock`
              : "Checking thresholds..."
          }
        />
      </section>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-busy="true">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-72 border border-white/10 bg-[#0D0D0F]" />
            <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="h-72 border border-white/10 bg-[#0D0D0F]" />
            <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
          </div>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <AdminPanel
              title="Recent Orders"
              subtitle="Live order queue & payment status"
              actions={
                <Link
                  href="/admin/orders"
                  className="inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3]"
                >
                  View All
                  <ArrowRight className="w-3 h-3" />
                </Link>
              }
            >
              {data.recentOrders.length === 0 ? (
                <AdminEmptyState
                  title="No Orders in Selected Period"
                  description="No orders match the selected date range."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] tracking-[0.18em] uppercase text-[#71717A]">
                        <th className="py-2.5 pr-3 font-normal">Order</th>
                        <th className="py-2.5 px-3 font-normal">Customer</th>
                        <th className="py-2.5 px-3 font-normal">Payment</th>
                        <th className="py-2.5 px-3 font-normal">Fulfilment</th>
                        <th className="py-2.5 pl-3 font-normal text-right">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-xs">
                      {data.recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-[#141417]/50">
                          <td className="py-3 pr-3 font-medium">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="text-[#F5F5F3] hover:text-[#C81E1E]"
                            >
                              {order.orderNumber}
                            </Link>
                            <p className="text-[10px] text-[#71717A] tabular-nums">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-[#A1A1AA] truncate max-w-[150px]">
                            {order.customerName}
                          </td>
                          <td className="py-3 px-3">
                            <AdminStatusBadge
                              label={order.paymentStatus}
                              tone={getStatusTone(order.paymentStatus)}
                            />
                          </td>
                          <td className="py-3 px-3">
                            <AdminStatusBadge
                              label={order.fulfilmentStatus}
                              tone={getStatusTone(order.fulfilmentStatus)}
                            />
                          </td>
                          <td className="py-3 pl-3 text-right tabular-nums text-[#F5F5F3] font-medium">
                            {formatCents(order.totalAmount, order.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminPanel>

            <AdminPanel
              title="Sales Overview"
              subtitle="Verified paid settlement volume by day"
              actions={
                <Link
                  href="/admin/payments"
                  className="inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3]"
                >
                  Payments Ledger
                  <ArrowRight className="w-3 h-3" />
                </Link>
              }
            >
              {data.salesOverview.length === 0 ? (
                <AdminEmptyState
                  title="No Sales Activity"
                  description="Verified revenue bars will appear here once paid orders are recorded in this period."
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-end gap-1.5 h-44 border-b border-white/10 pb-2 pt-4 overflow-x-auto">
                    {data.salesOverview.map((point) => {
                      const heightPct =
                        maxDailyRevenue > 0
                          ? Math.max(
                              6,
                              Math.round(
                                (point.revenue / maxDailyRevenue) * 100,
                              ),
                            )
                          : 6;
                      return (
                        <div
                          key={point.date}
                          title={`${point.date}: ${formatCents(point.revenue)} (${point.orders} orders)`}
                          className="flex-1 min-w-[18px] flex flex-col items-center justify-end h-full gap-1.5"
                        >
                          <div className="w-full flex items-end justify-center h-32">
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full max-w-[28px] transition-all ${
                                point.revenue > 0
                                  ? "bg-[#C81E1E]"
                                  : "bg-white/10"
                              }`}
                            />
                          </div>
                          <span className="text-[9px] text-[#71717A] tabular-nums">
                            {point.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#A1A1AA]">
                    <span>
                      Crypto:{" "}
                      <strong className="text-[#F5F5F3]">
                        {formatCents(data.kpis.cryptoRevenue)}
                      </strong>
                    </span>
                    <span>
                      COD Collected:{" "}
                      <strong className="text-[#F5F5F3]">
                        {formatCents(data.kpis.codCollected)}
                      </strong>
                    </span>
                    <span className="text-[11px] text-[#71717A]">
                      Paid, non-cancelled orders only
                    </span>
                  </div>
                </div>
              )}
            </AdminPanel>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 space-y-6">
            <AdminPanel
              title="Top Products"
              subtitle="Best-selling hardware from paid orders"
              actions={
                <Link
                  href="/admin/products"
                  className="inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3]"
                >
                  Catalogue
                  <ArrowRight className="w-3 h-3" />
                </Link>
              }
            >
              {data.topProducts.length === 0 ? (
                <AdminEmptyState
                  title="No Paid Product Sales Yet"
                  description="Top-selling SKUs will appear here once paid orders are settled."
                />
              ) : (
                <ul className="divide-y divide-white/10 text-xs">
                  {data.topProducts.map((prod) => (
                    <li
                      key={prod.productId}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${prod.productId}`}
                          className="font-medium text-[#F5F5F3] hover:text-[#C81E1E] truncate block"
                        >
                          {prod.name}
                        </Link>
                        <p className="text-[11px] text-[#71717A]">
                          {prod.sku} · {prod.unitsSold} sold
                        </p>
                      </div>
                      <span className="tabular-nums font-medium text-[#F5F5F3] shrink-0">
                        {formatCents(prod.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminPanel>

            <AdminPanel
              title="Inventory Alerts"
              subtitle="Low-stock & out-of-stock thresholds"
              actions={
                <Link
                  href="/admin/inventory"
                  className="inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3]"
                >
                  Manage Stock
                  <ArrowRight className="w-3 h-3" />
                </Link>
              }
            >
              {data.inventoryAlerts.length === 0 ? (
                <AdminEmptyState
                  title="All Stock Levels Healthy"
                  description="No products are currently at or below their low-stock threshold."
                />
              ) : (
                <ul className="divide-y divide-white/10 text-xs">
                  {data.inventoryAlerts.map((alert) => (
                    <li
                      key={alert.id}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${alert.id}`}
                          className="font-medium text-[#F5F5F3] hover:text-[#C81E1E] truncate block"
                        >
                          {alert.name}
                        </Link>
                        <p className="text-[11px] text-[#71717A] tabular-nums">
                          {alert.sku} · Avail {alert.availableStock} (Threshold{" "}
                          {alert.lowStockThreshold})
                        </p>
                      </div>
                      <AdminStatusBadge
                        label={
                          alert.inventoryStatus === "out_of_stock"
                            ? "Out"
                            : "Low"
                        }
                        tone={getStatusTone(alert.inventoryStatus)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </AdminPanel>

            <AdminPanel
              title="Recent Inventory Activity"
              subtitle="Latest stock movements & adjustments"
            >
              {data.recentActivity.length === 0 ? (
                <p className="text-xs text-[#71717A]">
                  No inventory movements recorded yet.
                </p>
              ) : (
                <ul className="divide-y divide-white/10 text-xs">
                  {data.recentActivity.map((act) => (
                    <li
                      key={act.id}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[#F5F5F3] truncate">
                          {act.productName}
                        </p>
                        <p className="text-[11px] text-[#71717A] truncate">
                          {act.reason}
                        </p>
                      </div>
                      <span
                        className={`tabular-nums shrink-0 font-medium ${
                          act.delta >= 0 ? "text-emerald-400" : "text-[#C81E1E]"
                        }`}
                      >
                        {act.delta >= 0 ? `+${act.delta}` : act.delta}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminPanel>
          </div>
        </div>
      ) : null}
    </div>
  );
}
