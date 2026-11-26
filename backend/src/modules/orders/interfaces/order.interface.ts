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
  paymentExpiresAt: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  shippingProvider?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
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
