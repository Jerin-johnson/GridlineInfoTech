import type {
  FormattedOrder,
  OrderFulfilmentStatus,
  OrderPaymentStatus,
} from "@/types/order.types";

export function isOrderPaymentExpired(order: FormattedOrder): boolean {
  if (order.paymentStatus === "expired") return true;
  if (order.paymentMethod === "cod") return false;
  if (!order.paymentExpiresAt) return false;
  return new Date(order.paymentExpiresAt).getTime() <= Date.now();
}

export function canPayOrderOnline(order: FormattedOrder): boolean {
  if (order.fulfilmentStatus !== "placed") return false;
  if (
    order.paymentStatus !== "pending" &&
    order.paymentStatus !== "failed" &&
    order.paymentStatus !== "confirming"
  ) {
    return false;
  }
  if (isOrderPaymentExpired(order)) return false;
  return true;
}

export function getPayOnlineActionLabel(order: FormattedOrder): string {
  if (order.paymentMethod === "cod") return "Pay Online Now";
  if (order.paymentStatus === "failed") return "Retry Payment";
  return "Complete Payment";
}

export function canCancelOrder(order: FormattedOrder): boolean {
  return (
    order.fulfilmentStatus === "placed" &&
    (order.paymentStatus === "pending" || order.paymentStatus === "failed")
  );
}

export function formatFulfilmentLabel(status: OrderFulfilmentStatus): string {
  switch (status) {
    case "placed":
      return "Placed";
    case "payment_confirmed":
      return "Confirmed";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "out_for_delivery":
      return "Out for Delivery";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}

export function formatPaymentStatusLabel(status: OrderPaymentStatus): string {
  switch (status) {
    case "pending":
      return "Payment Pending";
    case "confirming":
      return "Confirming";
    case "paid":
      return "Paid";
    case "failed":
      return "Payment Failed";
    case "expired":
      return "Expired";
    case "refunded":
      return "Refunded";
  }
}

export function getFulfilmentToneClass(status: OrderFulfilmentStatus): string {
  switch (status) {
    case "delivered":
    case "payment_confirmed":
      return "border-emerald-500/40 text-emerald-400";
    case "cancelled":
      return "border-[#C81E1E]/60 text-[#C81E1E]";
    case "shipped":
    case "out_for_delivery":
    case "processing":
      return "border-white/25 text-[#F5F5F3]";
    case "placed":
    default:
      return "border-white/15 text-[#A1A1AA]";
  }
}

export function getPaymentToneClass(status: OrderPaymentStatus): string {
  switch (status) {
    case "paid":
      return "border-emerald-500/40 text-emerald-400";
    case "failed":
    case "expired":
      return "border-[#C81E1E]/60 text-[#C81E1E]";
    case "confirming":
      return "border-amber-500/40 text-amber-400";
    case "pending":
    case "refunded":
    default:
      return "border-white/15 text-[#A1A1AA]";
  }
}
