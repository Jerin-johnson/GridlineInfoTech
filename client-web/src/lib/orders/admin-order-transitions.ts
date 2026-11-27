import type {
  FormattedOrder,
  OrderFulfilmentStatus,
} from "@/types/order.types";

const BASE_ADMIN_TRANSITIONS: Record<
  OrderFulfilmentStatus,
  OrderFulfilmentStatus[]
> = {
  placed: ["cancelled"],
  payment_confirmed: ["processing"],
  processing: ["shipped"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

const PAID_REQUIRED_STATUSES = new Set<OrderFulfilmentStatus>([
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
]);

const CANCELLABLE_PAYMENT_STATUSES = new Set(["pending", "failed"]);

export interface AdminTransitionOption {
  target: OrderFulfilmentStatus;
  label: string;
  requiresShipping: boolean;
  isDanger?: boolean;
}

const TRANSITION_LABELS: Record<OrderFulfilmentStatus, string> = {
  placed: "Placed",
  payment_confirmed: "Payment Confirmed",
  processing: "Start Processing",
  shipped: "Mark Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Mark Delivered",
  cancelled: "Cancel Order",
};

export function getAvailableAdminTransitions(
  order: FormattedOrder,
): AdminTransitionOption[] {
  const rawTargets =
    order.paymentMethod === "cod" && order.fulfilmentStatus === "placed"
      ? (["processing", "cancelled"] as OrderFulfilmentStatus[])
      : BASE_ADMIN_TRANSITIONS[order.fulfilmentStatus] ?? [];

  return rawTargets
    .filter((target) => {
      if (
        PAID_REQUIRED_STATUSES.has(target) &&
        order.paymentStatus !== "paid" &&
        order.paymentMethod !== "cod"
      ) {
        return false;
      }
      if (
        target === "cancelled" &&
        !CANCELLABLE_PAYMENT_STATUSES.has(order.paymentStatus)
      ) {
        return false;
      }
      return true;
    })
    .map((target) => ({
      target,
      label: TRANSITION_LABELS[target],
      requiresShipping: target === "shipped",
      isDanger: target === "cancelled",
    }));
}
