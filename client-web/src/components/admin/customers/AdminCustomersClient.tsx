"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownUp,
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
import {
  getAdminCustomers,
  type AdminCustomerSummary,
} from "@/lib/api/admin-customers.api";
import { ApiError } from "@/lib/api/client";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "CU";
}

export function AdminCustomersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || "",
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get("search") || "",
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >((searchParams.get("status") || "all") as "all" | "active" | "inactive");
  const [sortBy, setSortBy] = useState<
    "createdAt" | "firstName" | "email" | "lastLoginAt"
  >(
    (searchParams.get("sortBy") || "createdAt") as
      | "createdAt"
      | "firstName"
      | "email"
      | "lastLoginAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
  );
  const [page, setPage] = useState(initialPage);
  const limit = 15;

  const [customers, setCustomers] = useState<AdminCustomerSummary[]>([]);
  const [meta, setMeta] = useState({
    page: initialPage,
    limit,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    const qs = params.toString();
    router.replace(qs ? `/admin/customers?${qs}` : "/admin/customers", {
      scroll: false,
    });
  }, [debouncedSearch, page, router, sortBy, sortOrder, statusFilter]);

  const fetchCustomers = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    try {
      const res = await getAdminCustomers({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter,
        sortBy,
        sortOrder,
      });
      if (seq !== requestSeqRef.current) return;
      if (
        res.data.length === 0 &&
        page > 1 &&
        res.meta.totalPages > 0 &&
        page > res.meta.totalPages
      ) {
        setPage(res.meta.totalPages);
        return;
      }
      setCustomers(res.data);
      setMeta(res.meta);
      setError(null);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?redirect=%2Fadmin%2Fcustomers");
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        router.replace("/admin/unauthorized");
        return;
      }
      setError(
        err instanceof ApiError ? err.message : "Unable to load customers.",
      );
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [debouncedSearch, page, router, sortBy, sortOrder, statusFilter]);

  useEffect(() => {
    const seq = ++requestSeqRef.current;
    getAdminCustomers({
      page,
      limit,
      search: debouncedSearch || undefined,
      status: statusFilter,
      sortBy,
      sortOrder,
    })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        if (
          res.data.length === 0 &&
          page > 1 &&
          res.meta.totalPages > 0 &&
          page > res.meta.totalPages
        ) {
          setPage(res.meta.totalPages);
          return;
        }
        setCustomers(res.data);
        setMeta(res.meta);
        setError(null);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login?redirect=%2Fadmin%2Fcustomers");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/admin/unauthorized");
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "Unable to load customers.",
        );
      })
      .finally(() => {
        if (seq === requestSeqRef.current) setLoading(false);
      });
  }, [debouncedSearch, page, router, sortBy, sortOrder, statusFilter]);

  const hasActiveFilters = Boolean(
    debouncedSearch || statusFilter !== "all" || sortBy !== "createdAt",
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="CLIENTELE DIRECTORY"
        title="Customers"
        description="View registered customer accounts, order history, and account status."
        actions={<AdminStatusBadge label={`${meta.total} Customers`} />}
      />

      {/* Search, Filter & Sort Bar */}
      <div className="border border-white/10 bg-[#0D0D0F] p-4 sm:p-5 flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <Search
            className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search customers by name or email..."
            aria-label="Search customers"
            className="w-full h-11 bg-[#141417] border border-white/15 pl-10 pr-4 text-sm text-[#F5F5F3] placeholder:text-[#71717A] focus:outline-none focus:border-[#F5F5F3]"
          />
        </div>

        <select
          aria-label="Filter customers by status"
          value={statusFilter}
          onChange={(e) => {
            setLoading(true);
            setStatusFilter(e.target.value as "all" | "active" | "inactive");
            setPage(1);
          }}
          className="lg:w-40 h-11 bg-[#141417] border border-white/15 px-3 text-xs uppercase tracking-[0.12em] text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <div className="flex items-center gap-2">
          <select
            aria-label="Sort customers by"
            value={sortBy}
            onChange={(e) => {
              setLoading(true);
              setSortBy(
                e.target.value as
                  | "createdAt"
                  | "firstName"
                  | "email"
                  | "lastLoginAt",
              );
              setPage(1);
            }}
            className="lg:w-40 h-11 bg-[#141417] border border-white/15 px-3 text-xs uppercase tracking-[0.12em] text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
          >
            <option value="createdAt">Sort: Joined</option>
            <option value="firstName">Sort: Name</option>
            <option value="email">Sort: Email</option>
            <option value="lastLoginAt">Sort: Last Login</option>
          </select>

          <button
            type="button"
            aria-label="Toggle sort order"
            onClick={() => {
              setLoading(true);
              setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
            }}
            className="inline-flex items-center gap-1.5 border border-white/15 bg-[#141417] px-3 h-11 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] hover:border-white/40 cursor-pointer"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            {sortOrder}
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setDebouncedSearch("");
              setStatusFilter("all");
              setSortBy("createdAt");
              setSortOrder("desc");
              setPage(1);
              setLoading(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 border border-white/15 px-4 h-11 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
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
              void fetchCustomers();
            }}
            className="inline-flex items-center gap-2 bg-[#C81E1E] text-[#F5F5F3] px-4 py-2 text-[10px] tracking-[0.2em] uppercase cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      ) : customers.length === 0 ? (
        <AdminEmptyState
          title="No Customers Found"
          description={
            hasActiveFilters
              ? "No customers match your current search or status filter."
              : "Customer accounts will appear here once shoppers register."
          }
        />
      ) : (
        <>
          <div className="border border-white/10 bg-[#0D0D0F] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] tracking-[0.2em] uppercase text-[#71717A]">
                  <th className="py-3.5 px-4 font-normal">Customer</th>
                  <th className="py-3.5 px-4 font-normal">Status</th>
                  <th className="py-3.5 px-4 font-normal">Joined</th>
                  <th className="py-3.5 px-4 font-normal text-right">Orders</th>
                  <th className="py-3.5 px-4 font-normal text-right">
                    Total Spend
                  </th>
                  <th className="py-3.5 px-4 font-normal text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {customers.map((customer) => (
                  <tr
                    key={customer._id}
                    className="hover:bg-[#141417]/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 shrink-0 border border-white/15 bg-[#141417] overflow-hidden flex items-center justify-center">
                          {customer.avatar ? (
                            <Image
                              src={customer.avatar}
                              alt={`${customer.firstName} ${customer.lastName}`}
                              fill
                              unoptimized
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-xs font-medium text-[#A1A1AA]">
                              {getInitials(
                                customer.firstName,
                                customer.lastName,
                              )}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/customers/${customer._id}`}
                            className="font-medium text-[#F5F5F3] hover:text-[#C81E1E] truncate block"
                          >
                            {customer.firstName} {customer.lastName}
                          </Link>
                          <p className="text-xs text-[#71717A] truncate">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle">
                      <AdminStatusBadge
                        label={customer.isActive ? "Active" : "Inactive"}
                        tone={customer.isActive ? "success" : "danger"}
                      />
                    </td>
                    <td className="py-3.5 px-4 align-middle text-xs text-[#A1A1AA] tabular-nums">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right tabular-nums text-[#F5F5F3]">
                      {customer.orderCount}
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right tabular-nums text-[#F5F5F3]">
                      {formatCents(customer.totalSpending)}
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right">
                      <Link
                        href={`/admin/customers/${customer._id}`}
                        className="border border-white/15 bg-[#141417] px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase text-[#F5F5F3] hover:border-white/40"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <nav
              aria-label="Customers pagination"
              className="flex items-center justify-between gap-4 border border-white/10 bg-[#0D0D0F] px-5 py-3.5"
            >
              <p className="text-xs text-[#A1A1AA] tabular-nums">
                Page {meta.page} of {meta.totalPages} · {meta.total} customers
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
    </div>
  );
}
