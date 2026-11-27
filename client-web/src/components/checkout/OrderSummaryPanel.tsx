"use client";

import Image from "next/image";
import { formatPriceCents } from "@/lib/api/catalog.api";

export interface SummaryLineItem {
  productId: string;
  name: string;
  sku: string;
  image?: string;
  quantity: number;
  lineTotal: number;
}

interface OrderSummaryPanelProps {
  items: SummaryLineItem[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  orderNumber?: string;
}

export function OrderSummaryPanel({
  items,
  subtotal,
  shippingCost,
  taxAmount,
  totalAmount,
  currency,
  orderNumber,
}: OrderSummaryPanelProps) {
  return (
    <aside
      aria-label="Order summary"
      className="lg:sticky lg:top-24 border border-white/10 bg-[#0D0D0F] p-6 sm:p-8 space-y-6"
    >
      <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
        <h2 className="font-serif text-2xl font-normal text-[#F5F5F3]">
          Order Summary
        </h2>
        {orderNumber && (
          <span className="text-[11px] tracking-[0.16em] uppercase text-[#A1A1AA] tabular-nums">
            {orderNumber}
          </span>
        )}
      </div>

      {/* Line Items */}
      <ul className="divide-y divide-white/10 max-h-80 overflow-y-auto pr-1">
        {items.map((item) => (
          <li
            key={item.productId}
            className="py-3.5 first:pt-0 flex items-center gap-3.5"
          >
            <div className="relative w-14 aspect-[4/3] shrink-0 border border-white/10 bg-[#141417] overflow-hidden">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  unoptimized
                  sizes="56px"
                  className="object-contain p-0.5"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-[#A1A1AA]">
                  APEX
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#F5F5F3] truncate">{item.name}</p>
              <p className="text-[11px] text-[#A1A1AA] tabular-nums">
                Qty {item.quantity} · {item.sku}
              </p>
            </div>
            <p className="text-sm font-medium text-[#F5F5F3] tabular-nums shrink-0">
              {formatPriceCents(item.lineTotal, currency)}
            </p>
          </li>
        ))}
      </ul>

      {/* Backend-Authoritative Totals */}
      <dl className="space-y-3 pt-4 border-t border-white/10 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[#A1A1AA]">Subtotal</dt>
          <dd className="text-[#F5F5F3] tabular-nums">
            {formatPriceCents(subtotal, currency)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[#A1A1AA]">Shipping</dt>
          <dd className="text-[#F5F5F3] tabular-nums">
            {shippingCost > 0
              ? formatPriceCents(shippingCost, currency)
              : "Complimentary"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[#A1A1AA]">Tax</dt>
          <dd className="text-[#F5F5F3] tabular-nums">
            {formatPriceCents(taxAmount, currency)}
          </dd>
        </div>
        <div className="pt-4 border-t border-white/10 flex items-baseline justify-between gap-4">
          <dt className="text-xs tracking-[0.2em] uppercase text-[#F5F5F3]">
            Total
          </dt>
          <dd className="text-xl font-medium text-[#F5F5F3] tabular-nums">
            {formatPriceCents(totalAmount, currency)}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
