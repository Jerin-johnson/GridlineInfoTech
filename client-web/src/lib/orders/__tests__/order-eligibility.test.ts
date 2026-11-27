import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canCancelOrder,
  canPayOrderOnline,
  getEffectivePaymentStatus,
  getPayOnlineActionLabel,
  isOrderPaymentExpired,
} from "../order-eligibility.ts";
import type { FormattedOrder } from "../../../types/order.types.ts";

function makeOrder(overrides: Partial<FormattedOrder> = {}): FormattedOrder {
  const futureExpiry = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  return {
    id: "674000000000000000000001",
    orderNumber: "ORD-20261127-TEST01",
    paymentReference: "PAY-TEST01",
    customerEmail: "alex@apex.com",
    items: [
      {
        productId: "674000000000000000000010",
        name: "BBS FI-R Forged Monobloc Wheel",
        sku: "BBS-FIR-20",
        slug: "bbs-fi-r",
        unitPrice: 271500,
        quantity: 4,
        lineTotal: 1086000,
      },
    ],
    shippingAddress: {
      addressId: "674000000000000000000020",
      label: "Garage",
      fullName: "Alex Mercer",
      phone: "+15550100",
      line1: "100 Track Way",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      country: "US",
    },
    subtotal: 1086000,
    shippingCost: 0,
    taxAmount: 0,
    totalAmount: 1086000,
    currency: "USD",
    paymentMethod: "crypto_wallet",
    paymentStatus: "pending",
    fulfilmentStatus: "placed",
    statusHistory: [],
    stockReserved: true,
    paymentExpiresAt: futureExpiry,
    ...overrides,
  };
}

describe("order-eligibility", () => {
  it("displays Complete Payment for eligible pending crypto orders", () => {
    const order = makeOrder({
      paymentMethod: "crypto_wallet",
      fulfilmentStatus: "placed",
      paymentStatus: "pending",
    });

    assert.equal(canPayOrderOnline(order), true);
    assert.equal(getPayOnlineActionLabel(order), "Complete Payment");
    assert.equal(canCancelOrder(order), true);
    assert.equal(getEffectivePaymentStatus(order), "pending");
  });

  it("displays Retry Payment for eligible failed crypto orders", () => {
    const order = makeOrder({
      paymentMethod: "crypto_wallet",
      fulfilmentStatus: "placed",
      paymentStatus: "failed",
    });

    assert.equal(canPayOrderOnline(order), true);
    assert.equal(getPayOnlineActionLabel(order), "Retry Payment");
    assert.equal(canCancelOrder(order), true);
  });

  it("allows resuming verification for confirming crypto orders even if payment window elapsed", () => {
    const pastExpiry = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const order = makeOrder({
      paymentMethod: "crypto_wallet",
      fulfilmentStatus: "placed",
      paymentStatus: "confirming",
      paymentExpiresAt: pastExpiry,
    });

    assert.equal(canPayOrderOnline(order), true);
    assert.equal(getPayOnlineActionLabel(order), "Complete Payment");
    assert.equal(canCancelOrder(order), false);
  });

  it("never displays payment or cancel actions for paid crypto orders", () => {
    const order = makeOrder({
      paymentMethod: "crypto_wallet",
      fulfilmentStatus: "payment_confirmed",
      paymentStatus: "paid",
    });

    assert.equal(canPayOrderOnline(order), false);
    assert.equal(canCancelOrder(order), false);
  });

  it("never displays payment actions for cancelled orders", () => {
    const order = makeOrder({
      fulfilmentStatus: "cancelled",
      paymentStatus: "pending",
    });

    assert.equal(canPayOrderOnline(order), false);
    assert.equal(canCancelOrder(order), false);
  });

  it("marks expired pending crypto orders as expired and hides payment actions", () => {
    const pastExpiry = new Date(Date.now() - 60 * 1000).toISOString();
    const order = makeOrder({
      paymentMethod: "crypto_wallet",
      fulfilmentStatus: "placed",
      paymentStatus: "pending",
      paymentExpiresAt: pastExpiry,
    });

    assert.equal(isOrderPaymentExpired(order), true);
    assert.equal(getEffectivePaymentStatus(order), "expired");
    assert.equal(canPayOrderOnline(order), false);
  });

  it("displays Pay Online Now for eligible COD orders", () => {
    const order = makeOrder({
      paymentMethod: "cod",
      fulfilmentStatus: "placed",
      paymentStatus: "pending",
      paymentExpiresAt: undefined,
    });

    assert.equal(isOrderPaymentExpired(order), false);
    assert.equal(canPayOrderOnline(order), true);
    assert.equal(getPayOnlineActionLabel(order), "Pay Online Now");
    assert.equal(canCancelOrder(order), true);
  });

  it("hides Pay Online Now for delivered or cancelled COD orders", () => {
    const deliveredCod = makeOrder({
      paymentMethod: "cod",
      fulfilmentStatus: "delivered",
      paymentStatus: "pending",
    });
    const cancelledCod = makeOrder({
      paymentMethod: "cod",
      fulfilmentStatus: "cancelled",
      paymentStatus: "pending",
    });

    assert.equal(canPayOrderOnline(deliveredCod), false);
    assert.equal(canPayOrderOnline(cancelledCod), false);
  });
});
