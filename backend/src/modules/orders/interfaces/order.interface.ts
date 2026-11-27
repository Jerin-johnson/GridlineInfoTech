import type {
  FulfilmentStatus,
  PaymentStatus,
} from '../constants/order.constants';

export interface FormattedOrderItem {
  productId: string;
  name: string;
  sku: string;
  slug: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface FormattedOrderShippingAddress {
  addressId: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface FormattedOrderStatusHistoryEntry {
  status: string;
  note?: string;
  actor: string;
  changedAt: Date;
}

export interface FormattedOrderCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface FormattedOrder {
  id: string;
  orderNumber: string;
  paymentReference: string;
  customerEmail: string;
  customer?: FormattedOrderCustomer | null;
  items: FormattedOrderItem[];
  shippingAddress: FormattedOrderShippingAddress;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  statusHistory: FormattedOrderStatusHistoryEntry[];
  stockReserved: boolean;
  paymentExpiresAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  shippingProvider?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  paidAt?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaginatedOrdersResult {
  data: FormattedOrder[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderPaymentRevenueSummary {
  collectedRevenue: number;
  successfulPayments: number;
  pendingPayments: number;
  cryptoRevenue: number;
  codCollected: number;
}

export interface AdminCodPaymentFilter {
  search?: string;
  status?:
    | 'all'
    | 'verified'
    | 'paid'
    | 'pending'
    | 'confirming'
    | 'failed'
    | 'expired';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AdminCodPaymentRecord {
  id: string;
  orderNumber: string;
  paymentReference: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  currency: string;
  orderTotalAmount: number;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  paidAt?: Date;
  createdAt: Date;
}

export interface DashboardSalesPoint {
  date: string;
  revenue: number;
  orders: number;
  cryptoRevenue: number;
  codRevenue: number;
}

export interface DashboardTopProduct {
  productId: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
}

export interface DashboardRecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  createdAt: Date;
}

export interface DashboardOrderAnalytics {
  totalRevenue: number;
  cryptoRevenue: number;
  codCollected: number;
  totalOrders: number;
  pendingOrders: number;
  salesOverview: DashboardSalesPoint[];
  recentOrders: DashboardRecentOrder[];
  topProducts: DashboardTopProduct[];
}
