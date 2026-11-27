"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowDownUp,
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Minus,
  Plus,
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
  adjustAdminInventory,
  getAdminInventory,
  getAdminInventoryMovements,
  type AdminInventoryItem,
  type AdminInventoryMovement,
  type AdminInventorySummary,
  type InventoryMovementType,
  type InventoryStockStatus,
} from "@/lib/api/admin-inventory.api";
import { ApiError } from "@/lib/api/client";

const STOCK_STATUS_BADGE: Record<
  InventoryStockStatus,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  in_stock: { label: "In Stock", tone: "success" },
  low_stock: { label: "Low Stock", tone: "warning" },
  out_of_stock: { label: "Out of Stock", tone: "danger" },
};

const MOVEMENT_TYPE_LABEL: Record<
  InventoryMovementType,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" }
> = {
  initial_stock: { label: "Initial Stock", tone: "neutral" },
  admin_adjustment: { label: "Admin Adjustment", tone: "warning" },
  stock_reservation: { label: "Reservation", tone: "neutral" },
  reservation_release: { label: "Release", tone: "success" },
  order_fulfillment: { label: "Fulfillment", tone: "danger" },
  order_cancellation: { label: "Cancellation", tone: "success" },
};

function getPrimaryImage(item: AdminInventoryItem): string | null {
  const primary = item.images?.find((img) => img.isPrimary);
  return primary?.url || item.images?.[0]?.url || null;
}

function getEntityName(
  entity: { name: string } | string | undefined,
): string {
  if (!entity) return "—";
  if (typeof entity === "string") return entity;
  return entity.name;
}

export function AdminInventoryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"stock" | "movements">("stock");

  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || "",
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get("search") || "",
  );
  const [stockStatus, setStockStatus] = useState<"all" | InventoryStockStatus>(
    (searchParams.get("stockStatus") || "all") as "all" | InventoryStockStatus,
  );
  const [sortBy, setSortBy] = useState<
    "updatedAt" | "availableStock" | "stock" | "reservedStock" | "name" | "sku"
  >(
    (searchParams.get("sortBy") || "updatedAt") as
      | "updatedAt"
      | "availableStock"
      | "stock"
      | "reservedStock"
      | "name"
      | "sku",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
  );
  const [page, setPage] = useState(initialPage);
  const limit = 15;

  const [items, setItems] = useState<AdminInventoryItem[]>([]);
  const [meta, setMeta] = useState({
    page: initialPage,
    limit,
    total: 0,
    totalPages: 0,
  });
  const [summary, setSummary] = useState<AdminInventorySummary>({
    totalProducts: 0,
    totalStockUnits: 0,
    totalAvailableStock: 0,
    totalReservedStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Adjustment modal state
  const [adjustTarget, setAdjustTarget] = useState<AdminInventoryItem | null>(
    null,
  );
  const [adjustType, setAdjustType] = useState<"increase" | "decrease">(
    "increase",
  );
  const [adjustQty, setAdjustQty] = useState("1");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);

  // Movement history state
  const [movements, setMovements] = useState<AdminInventoryMovement[]>([]);
  const [movementsMeta, setMovementsMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementProductFilter, setMovementProductFilter] = useState<
    string | undefined
  >(undefined);
  const [movementTypeFilter, setMovementTypeFilter] = useState<
    InventoryMovementType | ""
  >("");
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);

  const requestSeqRef = useRef(0);
  const movementSeqRef = useRef(0);

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
    if (stockStatus !== "all") params.set("stockStatus", stockStatus);
    if (sortBy !== "updatedAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    const qs = params.toString();
    router.replace(qs ? `/admin/inventory?${qs}` : "/admin/inventory", {
      scroll: false,
    });
  }, [debouncedSearch, page, router, sortBy, sortOrder, stockStatus]);

  const fetchInventory = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    try {
      const res = await getAdminInventory({
        page,
        limit,
        search: debouncedSearch || undefined,
        stockStatus,
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
      setItems(res.data);
      setMeta(res.meta);
      setSummary(res.summary);
      setError(null);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?redirect=%2Fadmin%2Finventory");
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        router.replace("/admin/unauthorized");
        return;
      }
      setError(
        err instanceof ApiError ? err.message : "Unable to load inventory.",
      );
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [debouncedSearch, page, router, sortBy, sortOrder, stockStatus]);

  useEffect(() => {
    const seq = ++requestSeqRef.current;
    getAdminInventory({
      page,
      limit,
      search: debouncedSearch || undefined,
      stockStatus,
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
        setItems(res.data);
        setMeta(res.meta);
        setSummary(res.summary);
        setError(null);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login?redirect=%2Fadmin%2Finventory");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/admin/unauthorized");
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "Unable to load inventory.",
        );
      })
      .finally(() => {
        if (seq === requestSeqRef.current) setLoading(false);
      });
  }, [debouncedSearch, page, router, sortBy, sortOrder, stockStatus]);

  useEffect(() => {
    if (activeTab !== "movements") return;
    const seq = ++movementSeqRef.current;
    getAdminInventoryMovements({
      page: movementsPage,
      limit: 20,
      productId: movementProductFilter,
      type: movementTypeFilter || undefined,
    })
      .then((res) => {
        if (seq !== movementSeqRef.current) return;
        setMovements(res.data);
        setMovementsMeta(res.meta);
        setMovementsError(null);
      })
      .catch((err) => {
        if (seq !== movementSeqRef.current) return;
        setMovementsError(
          err instanceof ApiError
            ? err.message
            : "Unable to load inventory movements.",
        );
      })
      .finally(() => {
        if (seq === movementSeqRef.current) setMovementsLoading(false);
      });
  }, [activeTab, movementProductFilter, movementTypeFilter, movementsPage]);

  const openAdjustModal = (item: AdminInventoryItem) => {
    setAdjustTarget(item);
    setAdjustType("increase");
    setAdjustQty("1");
    setAdjustReason("");
    setAdjustError(null);
  };

  const parsedQty = Number(adjustQty);
  const validQty = Number.isInteger(parsedQty) && parsedQty >= 1;
  const previewStock = adjustTarget
    ? adjustType === "increase"
      ? adjustTarget.stock + (validQty ? parsedQty : 0)
      : adjustTarget.stock - (validQty ? parsedQty : 0)
    : 0;
  const previewAvailable = adjustTarget
    ? previewStock - adjustTarget.reservedStock
    : 0;

  const handleAdjustSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!adjustTarget || adjusting) return;
    setAdjustError(null);

    if (!validQty) {
      setAdjustError("Quantity must be a positive whole integer.");
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError("Please provide a reason for this stock adjustment.");
      return;
    }
    if (
      adjustType === "decrease" &&
      adjustTarget.stock - parsedQty < adjustTarget.reservedStock
    ) {
      setAdjustError(
        `Cannot decrease below reserved stock (${adjustTarget.reservedStock}).`,
      );
      return;
    }

    setAdjusting(true);
    try {
      const res = await adjustAdminInventory(adjustTarget._id, {
        type: adjustType,
        quantity: parsedQty,
        reason: adjustReason.trim(),
      });
      setFeedback(
        `Updated ${res.product.name} (${res.product.sku}): total stock ${res.product.stock}, available ${res.product.availableStock}.`,
      );
      setAdjustTarget(null);
      setLoading(true);
      await fetchInventory();
    } catch (err) {
      setAdjustError(
        err instanceof ApiError
          ? err.message
          : "Unable to complete stock adjustment.",
      );
    } finally {
      setAdjusting(false);
    }
  };

  const hasActiveFilters = Boolean(
    debouncedSearch || stockStatus !== "all" || sortBy !== "updatedAt",
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="WAREHOUSE & ALLOCATION"
        title="Inventory Management"
        description="Monitor physical, reserved, and available stock levels with atomic adjustments and movement history."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("stock")}
              className={`px-4 py-2 text-[10px] tracking-[0.2em] uppercase border cursor-pointer transition-colors min-h-[40px] ${
                activeTab === "stock"
                  ? "bg-[#F5F5F3] text-[#080808] border-[#F5F5F3]"
                  : "bg-[#141417] text-[#A1A1AA] border-white/15 hover:text-[#F5F5F3]"
              }`}
            >
              Stock Levels
            </button>
            <button
              type="button"
              onClick={() => {
                setMovementsLoading(true);
                setActiveTab("movements");
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.2em] uppercase border cursor-pointer transition-colors min-h-[40px] ${
                activeTab === "movements"
                  ? "bg-[#F5F5F3] text-[#080808] border-[#F5F5F3]"
                  : "bg-[#141417] text-[#A1A1AA] border-white/15 hover:text-[#F5F5F3]"
              }`}
            >
              <History className="w-3.5 h-3.5" aria-hidden="true" />
              Movements
            </button>
          </div>
        }
      />

      {/* Inventory Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total SKUs", value: summary.totalProducts },
          { label: "Total Units", value: summary.totalStockUnits },
          { label: "Available", value: summary.totalAvailableStock },
          { label: "Reserved", value: summary.totalReservedStock },
          {
            label: "Low Stock",
            value: summary.lowStockCount,
            highlight: summary.lowStockCount > 0 ? "warning" : undefined,
          },
          {
            label: "Out of Stock",
            value: summary.outOfStockCount,
            highlight: summary.outOfStockCount > 0 ? "danger" : undefined,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-white/10 bg-[#0D0D0F] px-4 py-3.5"
          >
            <p className="text-[10px] tracking-[0.18em] uppercase text-[#71717A]">
              {stat.label}
            </p>
            <p
              className={`mt-1 text-xl font-medium tabular-nums ${
                stat.highlight === "danger"
                  ? "text-[#C81E1E]"
                  : stat.highlight === "warning"
                    ? "text-amber-400"
                    : "text-[#F5F5F3]"
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {feedback && (
        <div
          role="status"
          className="border border-emerald-500/40 bg-[#0D0D0F] px-4 py-3 flex items-center justify-between gap-3 text-xs text-emerald-400"
        >
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            {feedback}
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss notification"
            className="text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === "stock" ? (
        <>
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
                placeholder="Search by product name or SKU..."
                aria-label="Search inventory"
                className="w-full h-11 bg-[#141417] border border-white/15 pl-10 pr-4 text-sm text-[#F5F5F3] placeholder:text-[#71717A] focus:outline-none focus:border-[#F5F5F3]"
              />
            </div>

            <select
              aria-label="Filter by stock status"
              value={stockStatus}
              onChange={(e) => {
                setLoading(true);
                setStockStatus(e.target.value as "all" | InventoryStockStatus);
                setPage(1);
              }}
              className="lg:w-44 h-11 bg-[#141417] border border-white/15 px-3 text-xs uppercase tracking-[0.12em] text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
            >
              <option value="all">All Stock</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            <div className="flex items-center gap-2">
              <select
                aria-label="Sort inventory by"
                value={sortBy}
                onChange={(e) => {
                  setLoading(true);
                  setSortBy(
                    e.target.value as
                      | "updatedAt"
                      | "availableStock"
                      | "stock"
                      | "reservedStock"
                      | "name"
                      | "sku",
                  );
                  setPage(1);
                }}
                className="lg:w-44 h-11 bg-[#141417] border border-white/15 px-3 text-xs uppercase tracking-[0.12em] text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
              >
                <option value="updatedAt">Sort: Updated</option>
                <option value="availableStock">Sort: Available</option>
                <option value="stock">Sort: Total Stock</option>
                <option value="reservedStock">Sort: Reserved</option>
                <option value="name">Sort: Name</option>
                <option value="sku">Sort: SKU</option>
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
                  setStockStatus("all");
                  setSortBy("updatedAt");
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
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  void fetchInventory();
                }}
                className="inline-flex items-center gap-2 bg-[#C81E1E] text-[#F5F5F3] px-4 py-2 text-[10px] tracking-[0.2em] uppercase cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <AdminEmptyState
              title="No Inventory Records"
              description={
                hasActiveFilters
                  ? "No products match your current search or stock status filter."
                  : "No active products exist in the catalog yet."
              }
            />
          ) : (
            <>
              <div className="border border-white/10 bg-[#0D0D0F] overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] tracking-[0.2em] uppercase text-[#71717A]">
                      <th className="py-3.5 px-4 font-normal">Product</th>
                      <th className="py-3.5 px-4 font-normal">Brand / Cat</th>
                      <th className="py-3.5 px-4 font-normal text-right">
                        Total
                      </th>
                      <th className="py-3.5 px-4 font-normal text-right">
                        Reserved
                      </th>
                      <th className="py-3.5 px-4 font-normal text-right">
                        Available
                      </th>
                      <th className="py-3.5 px-4 font-normal text-right">
                        Threshold
                      </th>
                      <th className="py-3.5 px-4 font-normal">Status</th>
                      <th className="py-3.5 px-4 font-normal text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-sm">
                    {items.map((item) => {
                      const img = getPrimaryImage(item);
                      const badge = STOCK_STATUS_BADGE[item.inventoryStatus];
                      return (
                        <tr
                          key={item._id}
                          className="hover:bg-[#141417]/50 transition-colors"
                        >
                          <td className="py-3.5 px-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="relative w-11 h-11 shrink-0 border border-white/15 bg-[#141417] overflow-hidden">
                                {img ? (
                                  <Image
                                    src={img}
                                    alt={item.name}
                                    fill
                                    unoptimized
                                    sizes="44px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <span className="text-[8px] text-[#71717A] flex items-center justify-center h-full">
                                    SKU
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/products/${item._id}`}
                                  className="font-medium text-[#F5F5F3] hover:text-[#C81E1E] truncate block max-w-[240px]"
                                >
                                  {item.name}
                                </Link>
                                <p className="text-[11px] text-[#71717A] tracking-wider uppercase">
                                  {item.sku}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 align-middle text-xs text-[#A1A1AA]">
                            <p>{getEntityName(item.brand)}</p>
                            <p className="text-[11px] text-[#71717A]">
                              {getEntityName(item.category)}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 align-middle text-right tabular-nums text-[#F5F5F3]">
                            {item.stock}
                          </td>
                          <td className="py-3.5 px-4 align-middle text-right tabular-nums text-[#A1A1AA]">
                            {item.reservedStock}
                          </td>
                          <td className="py-3.5 px-4 align-middle text-right tabular-nums font-medium text-[#F5F5F3]">
                            {item.availableStock}
                          </td>
                          <td className="py-3.5 px-4 align-middle text-right tabular-nums text-xs text-[#71717A]">
                            {item.lowStockThreshold}
                          </td>
                          <td className="py-3.5 px-4 align-middle">
                            <AdminStatusBadge
                              label={badge.label}
                              tone={badge.tone}
                            />
                          </td>
                          <td className="py-3.5 px-4 align-middle text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openAdjustModal(item)}
                                className="border border-white/15 bg-[#141417] px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase text-[#F5F5F3] hover:border-[#C81E1E] cursor-pointer"
                              >
                                Adjust
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMovementProductFilter(item._id);
                                  setMovementsPage(1);
                                  setMovementsLoading(true);
                                  setActiveTab("movements");
                                }}
                                aria-label={`View movements for ${item.name}`}
                                className="border border-white/15 px-2.5 py-1.5 text-[10px] tracking-[0.16em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
                              >
                                Log
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {meta.totalPages > 1 && (
                <nav
                  aria-label="Inventory pagination"
                  className="flex items-center justify-between gap-4 border border-white/10 bg-[#0D0D0F] px-5 py-3.5"
                >
                  <p className="text-xs text-[#A1A1AA] tabular-nums">
                    Page {meta.page} of {meta.totalPages} · {meta.total} items
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
        </>
      ) : (
        /* Movements Tab */
        <div className="space-y-4">
          <div className="border border-white/10 bg-[#0D0D0F] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Filter movements by type"
                value={movementTypeFilter}
                onChange={(e) => {
                  setMovementsLoading(true);
                  setMovementTypeFilter(
                    e.target.value as InventoryMovementType | "",
                  );
                  setMovementsPage(1);
                }}
                className="h-10 bg-[#141417] border border-white/15 px-3 text-xs uppercase tracking-[0.12em] text-[#F5F5F3]"
              >
                <option value="">All Movement Types</option>
                <option value="initial_stock">Initial Stock</option>
                <option value="admin_adjustment">Admin Adjustment</option>
                <option value="stock_reservation">Stock Reservation</option>
                <option value="reservation_release">Reservation Release</option>
                <option value="order_fulfillment">Order Fulfillment</option>
                <option value="order_cancellation">Order Cancellation</option>
              </select>

              {movementProductFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setMovementProductFilter(undefined);
                    setMovementsPage(1);
                    setMovementsLoading(true);
                  }}
                  className="inline-flex items-center gap-1.5 border border-white/15 px-3 h-10 text-[10px] tracking-[0.16em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Product Filter
                </button>
              )}
            </div>

            <p className="text-xs text-[#71717A] tabular-nums">
              {movementsMeta.total} recorded movements
            </p>
          </div>

          {movementsLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 border border-white/10 bg-[#0D0D0F]"
                />
              ))}
            </div>
          ) : movementsError ? (
            <div
              role="alert"
              className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-5 text-sm text-[#A1A1AA]"
            >
              {movementsError}
            </div>
          ) : movements.length === 0 ? (
            <AdminEmptyState
              title="No Movements Recorded"
              description="Inventory movements will appear here when stock is initialized, adjusted, reserved, or fulfilled."
            />
          ) : (
            <>
              <div className="border border-white/10 bg-[#0D0D0F] overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] tracking-[0.2em] uppercase text-[#71717A]">
                      <th className="py-3 px-4 font-normal">Timestamp</th>
                      <th className="py-3 px-4 font-normal">Product</th>
                      <th className="py-3 px-4 font-normal">Type</th>
                      <th className="py-3 px-4 font-normal text-right">
                        Qty / Stock
                      </th>
                      <th className="py-3 px-4 font-normal">Reason</th>
                      <th className="py-3 px-4 font-normal">Actor / Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-xs">
                    {movements.map((mov) => {
                      const badge = MOVEMENT_TYPE_LABEL[mov.type] ?? {
                        label: mov.type,
                        tone: "neutral" as const,
                      };
                      const prod =
                        typeof mov.product === "object" && mov.product
                          ? mov.product
                          : null;
                      return (
                        <tr key={mov._id} className="hover:bg-[#141417]/40">
                          <td className="py-3 px-4 text-[#A1A1AA] whitespace-nowrap tabular-nums">
                            {new Date(mov.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-[#F5F5F3]">
                            {prod ? (
                              <>
                                <p className="font-medium">{prod.name}</p>
                                <p className="text-[11px] text-[#71717A]">
                                  {prod.sku}
                                </p>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <AdminStatusBadge
                              label={badge.label}
                              tone={badge.tone}
                            />
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            <span
                              className={
                                mov.delta >= 0
                                  ? "text-emerald-400"
                                  : "text-[#C81E1E]"
                              }
                            >
                              {mov.delta >= 0 ? `+${mov.delta}` : mov.delta}
                            </span>
                            <p className="text-[11px] text-[#71717A]">
                              Stock: {mov.previousStock} → {mov.resultingStock}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-[#A1A1AA] max-w-xs truncate">
                            {mov.reason}
                          </td>
                          <td className="py-3 px-4 text-[#A1A1AA]">
                            {mov.actor
                              ? `${mov.actor.firstName} ${mov.actor.lastName}`
                              : mov.order
                                ? (
                                    <Link
                                      href={`/admin/orders/${mov.order._id}`}
                                      className="underline hover:text-[#F5F5F3]"
                                    >
                                      {mov.order.orderNumber}
                                    </Link>
                                  )
                                : "System"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {movementsMeta.totalPages > 1 && (
                <nav
                  aria-label="Movements pagination"
                  className="flex items-center justify-between gap-4 border border-white/10 bg-[#0D0D0F] px-5 py-3.5"
                >
                  <p className="text-xs text-[#A1A1AA] tabular-nums">
                    Page {movementsMeta.page} of {movementsMeta.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={movementsMeta.page <= 1}
                      onClick={() => {
                        setMovementsLoading(true);
                        setMovementsPage((p) => Math.max(1, p - 1));
                      }}
                      className="border border-white/15 bg-[#141417] px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={movementsMeta.page >= movementsMeta.totalPages}
                      onClick={() => {
                        setMovementsLoading(true);
                        setMovementsPage((p) =>
                          Math.min(movementsMeta.totalPages, p + 1),
                        );
                      }}
                      className="border border-white/15 bg-[#141417] px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-stock-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <form
            onSubmit={handleAdjustSubmit}
            className="w-full max-w-lg border border-white/15 bg-[#0D0D0F] p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#71717A]">
                  ATOMIC STOCK ADJUSTMENT
                </p>
                <h2
                  id="adjust-stock-title"
                  className="text-lg font-medium text-[#F5F5F3] mt-1"
                >
                  {adjustTarget.name}
                </h2>
                <p className="text-xs text-[#A1A1AA]">
                  SKU: {adjustTarget.sku} · Reserved:{" "}
                  {adjustTarget.reservedStock} (locked)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                aria-label="Close modal"
                className="text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adjustError && (
              <div
                role="alert"
                className="border border-[#C81E1E]/60 bg-[#141417] p-3 flex items-start gap-2 text-xs text-[#F5F5F3]"
              >
                <AlertCircle className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5" />
                <span>{adjustError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustType("increase")}
                className={`flex items-center justify-center gap-2 h-11 border text-xs tracking-[0.16em] uppercase cursor-pointer ${
                  adjustType === "increase"
                    ? "bg-[#F5F5F3] text-[#080808] border-[#F5F5F3]"
                    : "bg-[#141417] text-[#A1A1AA] border-white/15"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Increase
              </button>
              <button
                type="button"
                onClick={() => setAdjustType("decrease")}
                className={`flex items-center justify-center gap-2 h-11 border text-xs tracking-[0.16em] uppercase cursor-pointer ${
                  adjustType === "decrease"
                    ? "bg-[#C81E1E] text-[#F5F5F3] border-[#C81E1E]"
                    : "bg-[#141417] text-[#A1A1AA] border-white/15"
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                Decrease
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <label
                htmlFor="adjust-quantity"
                className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block"
              >
                Quantity *
              </label>
              <input
                id="adjust-quantity"
                type="number"
                min={1}
                step={1}
                required
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="w-full h-11 bg-[#141417] border border-white/15 px-3.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label
                htmlFor="adjust-reason"
                className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block"
              >
                Reason *
              </label>
              <input
                id="adjust-reason"
                type="text"
                required
                maxLength={500}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g., Supplier restock batch #14 or damaged unit write-off"
                className="w-full h-11 bg-[#141417] border border-white/15 px-3.5 text-sm text-[#F5F5F3] placeholder:text-[#71717A] focus:outline-none focus:border-[#F5F5F3]"
              />
            </div>

            <div className="border border-white/10 bg-[#080808] p-4 grid grid-cols-3 gap-3 text-xs tabular-nums">
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-[#71717A]">
                  Total Stock
                </p>
                <p className="mt-1 text-sm text-[#F5F5F3]">
                  {adjustTarget.stock} →{" "}
                  <span
                    className={
                      previewStock < adjustTarget.reservedStock
                        ? "text-[#C81E1E]"
                        : "text-emerald-400"
                    }
                  >
                    {previewStock}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-[#71717A]">
                  Reserved
                </p>
                <p className="mt-1 text-sm text-[#A1A1AA]">
                  {adjustTarget.reservedStock}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-[#71717A]">
                  Available
                </p>
                <p className="mt-1 text-sm text-[#F5F5F3]">
                  {adjustTarget.availableStock} →{" "}
                  <span
                    className={
                      previewAvailable < 0
                        ? "text-[#C81E1E]"
                        : "text-emerald-400"
                    }
                  >
                    {previewAvailable}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="border border-white/15 px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjusting}
                className="bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase font-medium cursor-pointer disabled:opacity-60"
              >
                {adjusting ? "Applying..." : "Confirm Adjustment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
