"use client";

import Link from "next/link";
import { Check, Package, ArrowRight } from "lucide-react";
import { formatPriceCents } from "@/lib/api/catalog.api";
import type { FormattedOrder } from "@/types/order.types";
import type { FormattedPayment } from "@/types/payment.types";

interface OrderConfirmationViewProps {
  order: FormattedOrder;
  payment?: FormattedPayment | null;
}

export function OrderConfirmationView({
  order,
  payment,
}: OrderConfirmationViewProps) {
  const isCod = order.paymentMethod === "cod";

  return (
    <main className="max-w-[1000px] mx-auto px-5 sm:px-8 md:px-12 pt-32 pb-20 space-y-8">
      <div className="border border-white/10 bg-[#0D0D0F] p-8 sm:p-10 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] tracking-[0.26em] uppercase text-[#A1A1AA]">
              {isCod
                ? "Order Confirmed · Cash on Delivery"
                : "On-Chain Payment Verified"}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#F5F5F3]">
              Order {order.orderNumber}
            </h1>
            <p className="text-sm text-[#A1A1AA]">
              A confirmation record has been logged for{" "}
              <span className="text-[#F5F5F3]">{order.customerEmail}</span>.
            </p>
          </div>
        </div>

        {/* Status Grid */}
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-white/10 py-5 text-sm">
          <div>
            <dt className="text-[10px] tracking-[0.2em] uppercase text-[#A1A1AA]">
              Order Status
            </dt>
            <dd className="mt-1 text-[#F5F5F3] uppercase tracking-[0.12em] text-xs">
              {order.fulfilmentStatus.replaceAll("_", " ")}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-[0.2em] uppercase text-[#A1A1AA]">
              Payment Method
            </dt>
            <dd className="mt-1 text-[#F5F5F3] uppercase tracking-[0.12em] text-xs">
              {isCod ? "Cash on Delivery" : "Crypto Wallet"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-[0.2em] uppercase text-[#A1A1AA]">
              Payment Status
            </dt>
            <dd className="mt-1 text-[#F5F5F3] uppercase tracking-[0.12em] text-xs">
              {order.paymentStatus}
            </dd>
          </div>
        </dl>

        {payment?.transactionHash && (
          <div className="bg-[#080808] border border-white/10 p-4 space-y-1">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#A1A1AA]">
              Verified Transaction Hash ({payment.network})
            </p>
            <code className="text-xs text-[#F5F5F3] break-all block">
              {payment.transactionHash}
            </code>
          </div>
        )}

        {/* Shipping & Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h2 className="text-[11px] tracking-[0.22em] uppercase text-[#A1A1AA]">
              Delivery Destination
            </h2>
            <p className="text-sm text-[#F5F5F3]">
              {order.shippingAddress.fullName}
            </p>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2
                ? `, ${order.shippingAddress.line2}`
                : ""}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
              {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country} · {order.shippingAddress.phone}
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-[11px] tracking-[0.22em] uppercase text-[#A1A1AA]">
              Order Total
            </h2>
            <p className="text-2xl font-medium text-[#F5F5F3] tabular-nums">
              {formatPriceCents(order.totalAmount, order.currency)}
            </p>
            <p className="text-xs text-[#A1A1AA]">
              {order.items.length}{" "}
              {order.items.length === 1 ? "line item" : "line items"} reserved
            </p>
          </div>
        </div>

        {/* Items Snapshot */}
        <ul className="divide-y divide-white/10 border-t border-white/10 pt-2">
          {order.items.map((item) => (
            <li
              key={item.productId}
              className="py-3 flex items-center justify-between gap-4 text-sm"
            >
              <div className="min-w-0">
                <p className="text-[#F5F5F3] truncate">{item.name}</p>
                <p className="text-xs text-[#A1A1AA] tabular-nums">
                  {item.sku} · Qty {item.quantity}
                </p>
              </div>
              <p className="text-[#F5F5F3] tabular-nums shrink-0">
                {formatPriceCents(item.lineTotal, order.currency)}
              </p>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
          <Link
            href={`/profile/orders/${order.id}`}
            className="inline-flex items-center gap-2 bg-[#F5F5F3] text-[#080808] px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium hover:bg-white transition-colors min-h-[44px]"
          >
            <Package className="w-4 h-4" aria-hidden="true" />
            View Order Details
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 border border-white/15 px-6 py-3 text-[11px] tracking-[0.22em] uppercase text-[#F5F5F3] hover:border-white/40 transition-colors min-h-[44px]"
          >
            Continue Shopping
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  );
}
