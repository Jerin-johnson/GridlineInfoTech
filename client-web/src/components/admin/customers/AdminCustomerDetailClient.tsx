"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, MapPin } from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import {
  getAdminCustomerById,
  updateAdminCustomerStatus,
  type AdminCustomerDetailResponse,
} from "@/lib/api/admin-customers.api";
import { ApiError } from "@/lib/api/client";

function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format((cents || 0) / 100);
}

function getOrderTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" {
  if (status === "delivered" || status === "paid") return "success";
  if (status === "cancelled" || status === "failed") return "danger";
  if (status === "pending" || status === "placed" || status === "processing") {
    return "warning";
  }
  return "neutral";
}

export function AdminCustomerDetailClient() {
  const params = useParams<{ customerId: string }>();
  const router = useRouter();
  const customerId = params.customerId;

  const [detail, setDetail] = useState<AdminCustomerDetailResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmToggle, setConfirmToggle] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    let active = true;
    getAdminCustomerById(customerId)
      .then((res) => {
        if (active) {
          setDetail(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(
            `/login?redirect=${encodeURIComponent(`/admin/customers/${customerId}`)}`,
          );
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/admin/unauthorized");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Customer not found.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [customerId, router]);

  const handleToggleStatus = async () => {
    if (!detail || updatingStatus) return;
    setUpdatingStatus(true);
    setError(null);
    setStatusFeedback(null);
    const nextActive = !detail.customer.isActive;
    try {
      const updated = await updateAdminCustomerStatus(
        detail.customer._id,
        nextActive,
      );
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              customer: {
                ...prev.customer,
                isActive: updated.isActive,
              },
            }
          : prev,
      );
      setConfirmToggle(false);
      setStatusFeedback(
        `Customer account has been ${updated.isActive ? "activated" : "deactivated"}.`,
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to update customer status.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-20 border border-white/10 bg-[#0D0D0F]" />
        <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div
        role="alert"
        className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-6 space-y-4"
      >
        <p className="text-sm text-[#A1A1AA]">{error}</p>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Customers
        </Link>
      </div>
    );
  }

  if (!detail) return null;

  const { customer, orderStats, orders } = detail;
  const initials =
    `${customer.firstName?.[0] || ""}${customer.lastName?.[0] || ""}`.toUpperCase() ||
    "CU";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="CUSTOMER ACCOUNT"
        title={`${customer.firstName} ${customer.lastName}`}
        description={customer.email}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/customers"
              className="inline-flex items-center gap-1.5 border border-white/15 bg-[#141417] px-3.5 py-2 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] min-h-[40px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
            <AdminStatusBadge
              label={customer.isActive ? "Active" : "Inactive"}
              tone={customer.isActive ? "success" : "danger"}
            />
            {confirmToggle ? (
              <div className="inline-flex items-center gap-2 border border-[#C81E1E]/60 bg-[#141417] px-3 py-1.5">
                <span className="text-[10px] tracking-[0.14em] uppercase text-[#F5F5F3]">
                  {customer.isActive
                    ? "Deactivate account?"
                    : "Activate account?"}
                </span>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => void handleToggleStatus()}
                  className="bg-[#C81E1E] text-[#F5F5F3] px-2.5 py-1 text-[10px] tracking-[0.16em] uppercase cursor-pointer disabled:opacity-60"
                >
                  {updatingStatus ? "Saving..." : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmToggle(false)}
                  className="text-[10px] tracking-[0.16em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmToggle(true)}
                className={`px-4 py-2 text-[10px] tracking-[0.18em] uppercase border cursor-pointer min-h-[40px] ${
                  customer.isActive
                    ? "border-white/15 bg-[#141417] text-[#A1A1AA] hover:text-[#C81E1E] hover:border-[#C81E1E]/60"
                    : "bg-[#C81E1E] text-[#F5F5F3] border-[#C81E1E]"
                }`}
              >
                {customer.isActive ? "Deactivate Account" : "Activate Account"}
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div
          role="alert"
          className="border border-[#C81E1E]/60 bg-[#0D0D0F] p-4 flex items-center gap-2 text-xs text-[#F5F5F3]"
        >
          <AlertCircle className="w-4 h-4 text-[#C81E1E] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {statusFeedback && (
        <div
          role="status"
          className="border border-emerald-500/40 bg-[#0D0D0F] p-4 flex items-center gap-2 text-xs text-emerald-400"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {/* Order Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Orders", value: orderStats.totalOrders },
          { label: "Completed", value: orderStats.completedOrders },
          { label: "Pending", value: orderStats.pendingOrders },
          { label: "Cancelled", value: orderStats.cancelledOrders },
          {
            label: "Total Spending",
            value: formatCents(orderStats.totalSpending),
          },
          {
            label: "Most Recent",
            value: orderStats.mostRecentOrderAt
              ? new Date(orderStats.mostRecentOrderAt).toLocaleDateString()
              : "—",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-white/10 bg-[#0D0D0F] px-4 py-3.5"
          >
            <p className="text-[10px] tracking-[0.18em] uppercase text-[#71717A]">
              {stat.label}
            </p>
            <p className="mt-1 text-lg font-medium text-[#F5F5F3] tabular-nums">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Profile */}
        <AdminPanel title="Profile Details">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 border border-white/15 bg-[#141417] overflow-hidden flex items-center justify-center shrink-0">
                {customer.avatar ? (
                  <Image
                    src={customer.avatar}
                    alt={`${customer.firstName} ${customer.lastName}`}
                    fill
                    unoptimized
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-[#A1A1AA]">
                    {initials}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-base font-medium text-[#F5F5F3]">
                  {customer.firstName} {customer.lastName}
                </p>
                <p className="text-xs text-[#A1A1AA] truncate">
                  {customer.email}
                </p>
              </div>
            </div>

            <dl className="divide-y divide-white/10 text-xs">
              <div className="py-2.5 flex justify-between gap-2">
                <dt className="text-[#71717A] uppercase tracking-[0.14em]">
                  Phone
                </dt>
                <dd className="text-[#F5F5F3]">{customer.phone || "—"}</dd>
              </div>
              <div className="py-2.5 flex justify-between gap-2">
                <dt className="text-[#71717A] uppercase tracking-[0.14em]">
                  Auth Provider
                </dt>
                <dd className="text-[#F5F5F3] uppercase">
                  {customer.authProvider}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-2">
                <dt className="text-[#71717A] uppercase tracking-[0.14em]">
                  Registered
                </dt>
                <dd className="text-[#F5F5F3] tabular-nums">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-2">
                <dt className="text-[#71717A] uppercase tracking-[0.14em]">
                  Last Login
                </dt>
                <dd className="text-[#F5F5F3] tabular-nums">
                  {customer.lastLoginAt
                    ? new Date(customer.lastLoginAt).toLocaleString()
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </AdminPanel>

        {/* Saved Addresses */}
        <div className="lg:col-span-2">
          <AdminPanel
            title="Saved Addresses"
            subtitle={`${customer.addresses.length} address(es) on file`}
          >
            {customer.addresses.length === 0 ? (
              <p className="text-xs text-[#71717A]">
                No saved shipping addresses for this customer.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customer.addresses.map((addr) => (
                  <div
                    key={addr._id}
                    className="border border-white/10 bg-[#080808] p-4 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] font-medium">
                        <MapPin className="w-3 h-3 text-[#C81E1E]" />
                        {addr.label}
                      </span>
                      {addr.isDefault && (
                        <AdminStatusBadge label="Default" tone="success" />
                      )}
                    </div>
                    <p className="text-[#F5F5F3]">{addr.fullName}</p>
                    <p className="text-[#A1A1AA]">{addr.line1}</p>
                    {addr.line2 && (
                      <p className="text-[#A1A1AA]">{addr.line2}</p>
                    )}
                    <p className="text-[#A1A1AA]">
                      {addr.city}, {addr.state} {addr.postalCode}
                    </p>
                    <p className="text-[#71717A]">
                      {addr.country} · {addr.phone}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        </div>
      </div>

      {/* Order History */}
      <AdminPanel
        title="Order History"
        subtitle="Click any order to view full order management details"
      >
        {orders.length === 0 ? (
          <AdminEmptyState
            title="No Orders Placed"
            description="This customer has not placed any orders yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] tracking-[0.2em] uppercase text-[#71717A]">
                  <th className="py-3 px-4 font-normal">Order #</th>
                  <th className="py-3 px-4 font-normal">Date</th>
                  <th className="py-3 px-4 font-normal">Order Status</th>
                  <th className="py-3 px-4 font-normal">Payment Status</th>
                  <th className="py-3 px-4 font-normal text-right">Items</th>
                  <th className="py-3 px-4 font-normal text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-xs">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-[#141417]/50">
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/orders/${order._id}`}
                        className="font-medium text-[#F5F5F3] hover:text-[#C81E1E] underline-offset-4 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-[#A1A1AA] tabular-nums">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <AdminStatusBadge
                        label={order.fulfilmentStatus}
                        tone={getOrderTone(order.fulfilmentStatus)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <AdminStatusBadge
                        label={order.paymentStatus}
                        tone={getOrderTone(order.paymentStatus)}
                      />
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#A1A1AA]">
                      {order.itemCount}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium text-[#F5F5F3]">
                      {formatCents(order.totalAmount, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
