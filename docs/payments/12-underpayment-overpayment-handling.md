# 12 — Underpayment and Overpayment Handling

APEX ATELIER enforces a **strict exact-match policy** using integer `BigInt` arithmetic.

---

## Exact Integer Math (Zero Floating-Point Risk)

Order totals are stored in MongoDB as integer **USD minor units (cents)**. `PaymentsService.calculateExpectedAmount()` converts cents to token base units without floating-point `Number` arithmetic:

- For `USDC` (`tokenDecimals = 6`): `cents * 10^(6 - 2)` = `cents * 10_000n`
- Example: `$10.00` = `1000` cents = `10_000_000` base units (`10.000000 USDC`).

---

## Business Rule: Reject Underpayment & Overpayment

In `BlockchainVerifierService.verifyTransaction()`:
```typescript
if (receivedAmountBigInt < expectedAmount) {
  return {
    outcome: 'underpaid',
    receivedAmount,
    blockNumber: receiptBlock,
    confirmations,
    reason: 'Payment underpaid. Please send the correct amount.',
  };
}

if (receivedAmountBigInt > expectedAmount) {
  return {
    outcome: 'overpaid',
    receivedAmount,
    blockNumber: receiptBlock,
    confirmations,
    reason: 'Payment amount exceeds the required amount. Please contact support.',
  };
}
```

### Example 1 — Underpayment
```text
Expected: 10.00 USDC (10,000,000 base units)
Received:  9.99 USDC ( 9,990,000 base units)

Result: Payment marked 'underpaid' (terminal), Order marked 'failed',
        Stock NOT deducted, HTTP 400 Bad Request returned.
```

### Example 2 — Overpayment
```text
Expected: 10.00 USDC (10,000,000 base units)
Received: 10.01 USDC (10,010,000 base units)

Result: Payment marked 'overpaid' (terminal), Order marked 'failed',
        No automatic refund or order fulfillment, HTTP 400 Bad Request returned.
```

---

## Why Overpayment Is Also Rejected Automatically
1. Automatically accepting overpayments without reconciliation creates accounting discrepancies and customer refund liabilities.
2. Persisting the `overpaid` attempt with `receivedAmount`, `expectedAmount`, and `transactionHash` gives support/admin an auditable record in `/admin/payments` to resolve manually.
3. Because `underpaid` and `overpaid` are in `TERMINAL_REJECTED_PAYMENT_STATUSES`, re-submitting the same `txHash` is immediately rejected without re-querying RPC.
