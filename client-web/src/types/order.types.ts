export type OrderPaymentMethod = "crypto_wallet" | "cod";

export type OrderPaymentStatus =
  | "pending"
  | "confirming"
  | "paid"
  | "failed"
  | "expired"
  | "refunded";

export type OrderFulfilmentStatus =
  | "placed"
  | "payment_confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  slug: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderShippingAddress {
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

export interface OrderStatusHistoryEntry {
  status: string;
  note?: string;
  actor: string;
  changedAt: string;
}

export interface FormattedOrder {
  id: string;
  orderNumber: string;
  paymentReference: string;
  customerEmail: string;
  items: OrderItem[];
  shippingAddress: OrderShippingAddress;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod: OrderPaymentMethod | string;
  paymentStatus: OrderPaymentStatus;
  fulfilmentStatus: OrderFulfilmentStatus;
  statusHistory: OrderStatusHistoryEntry[];
  stockReserved: boolean;
  paymentExpiresAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  shippingProvider?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderQueryFilters {
  page?: number;
  limit?: number;
  fulfilmentStatus?: OrderFulfilmentStatus;
  paymentStatus?: OrderPaymentStatus;
}

export interface CheckoutPayload {
  addressId: string;
  paymentMethod?: OrderPaymentMethod;
  notes?: string;
  idempotencyKey?: string;
}
