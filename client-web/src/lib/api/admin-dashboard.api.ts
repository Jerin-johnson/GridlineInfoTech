import { apiFetch } from "@/lib/api/client";

export type DashboardRangePreset = "7d" | "30d" | "90d" | "all";

export interface DashboardKpis {
  totalRevenue: number;
  cryptoRevenue: number;
  codCollected: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

export interface DashboardSalesPoint {
  date: string;
  revenue: number;
  orders: number;
  cryptoRevenue: number;
  codRevenue: number;
}

export interface DashboardRecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  createdAt: string;
}

export interface DashboardTopProduct {
  productId: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
}

export interface DashboardInventoryAlert {
  id: string;
  name: string;
  sku: string;
  stock: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  inventoryStatus: "low_stock" | "out_of_stock" | "in_stock";
}

export interface DashboardActivityItem {
  id: string;
  type: string;
  delta: number;
  quantity: number;
  productName: string;
  sku: string;
  reason: string;
  createdAt: string;
}

export interface AdminDashboardData {
  range: {
    preset: DashboardRangePreset | "custom";
    dateFrom: string | null;
    dateTo: string | null;
  };
  kpis: DashboardKpis;
  salesOverview: DashboardSalesPoint[];
  recentOrders: DashboardRecentOrder[];
  topProducts: DashboardTopProduct[];
  inventoryAlerts: DashboardInventoryAlert[];
  recentActivity: DashboardActivityItem[];
}

export async function getAdminDashboardAnalytics(params: {
  range?: DashboardRangePreset;
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<AdminDashboardData> {
  const qs = new URLSearchParams();
  if (params.dateFrom || params.dateTo) {
    if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
    if (params.dateTo) qs.set("dateTo", params.dateTo);
  } else if (params.range) {
    qs.set("range", params.range);
  }

  const query = qs.toString();
  const res = await apiFetch<{ message: string; data: AdminDashboardData }>(
    query ? `/admin/dashboard?${query}` : "/admin/dashboard",
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return res.data;
}
