export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';

export const PAYMENT_STATUSES = [
  'pending',
  'confirming',
  'paid',
  'failed',
  'expired',
  'refunded',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILMENT_STATUSES = [
  'placed',
  'payment_confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

export type FulfilmentStatus = (typeof FULFILMENT_STATUSES)[number];

export const CANCELLABLE_FULFILMENT_STATUSES: FulfilmentStatus[] = ['placed'];

export const CANCELLABLE_PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'failed',
];

export const PAYMENT_WINDOW_MINUTES = 30;
