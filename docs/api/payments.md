# Crypto Payments API Documentation

The Crypto Payments API provides testnet/sandbox cryptocurrency payment configuration, payment initiation, server-side EVM RPC transaction verification, and payment status tracking for the Automotive E-Commerce Platform.

- **Base URL:** `/api/v1/payments`
- **Architecture:** Controller → Service → Repository (`IPaymentRepository`) → MongoDB
- **Default Testnet:** Ethereum Sepolia (`chainId: 11155111`) with ERC-20 `USDC` (`tokenDecimals: 6`)

---

## 1. Core Security & Verification Rules

1. **Server-Side Blockchain Verification:** Frontend payment status and browser-supplied transaction hashes are never trusted. `BlockchainVerifierService` independently queries `CRYPTO_RPC_URL` (`eth_chainId`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, `eth_blockNumber`) to verify:
   - Network / Chain ID
   - Transaction receipt status (`0x1`)
   - ERC-20 `Transfer(from, to, value)` event log (token contract, sender, recipient, and exact amount) or native ETH transfer
   - Required block confirmations (`CRYPTO_REQUIRED_CONFIRMATIONS`, default `3`)
2. **Exact Integer Conversion:** Order totals (in USD minor cents) are converted to token base units using pure `BigInt` arithmetic (`cents * 10^(decimals - 2)`), with zero floating-point math.
3. **Terminal Underpayment & Overpayment Handling:**
   - **Underpaid (`receivedAmount < expectedAmount`):** Marks attempt `underpaid`, marks order `paymentStatus: "failed"`, terminates immediately without confirmation/stock deduction, and returns `400 Bad Request` (`"Payment underpaid. Please send the correct amount."`).
   - **Overpaid (`receivedAmount > expectedAmount`):** Marks attempt `overpaid`, marks order `paymentStatus: "failed"`, terminates immediately without auto-refund/adjustment/stock deduction, and returns `400 Bad Request` (`"Payment amount exceeds the required amount. Please contact support."`).
4. **Multiple Attempts & Idempotency:** Customers can retry with a new transaction after a failed/underpaid attempt (`attemptNumber` increments). Duplicate transaction hashes across orders are blocked by a unique `{ chainId, transactionHash }` partial index (`409 Conflict`).
5. **Late Transaction Reconciliation:** Transactions submitted after `paymentExpiresAt` are still verified on-chain and persisted with `verificationStatus: "expired"` so funds are never silently lost.
6. **No Private Keys:** Private keys and seed phrases are never requested, accepted, or stored. `CRYPTO_RPC_URL` and secrets remain strictly server-side.

---

## 2. Endpoints

### 2.1 Get Public Payment Configuration
- **Route:** `GET /api/v1/payments/config`
- **Auth:** Public (`@Public()`)
- **Response `200 OK`:**
```json
{
  "message": "Payment configuration retrieved successfully",
  "data": {
    "chainId": 11155111,
    "network": "Sepolia",
    "token": "USDC",
    "tokenAddress": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
    "tokenDecimals": 6,
    "destinationAddress": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "requiredConfirmations": 3
  }
}
```

### 2.2 Initiate Payment
- **Route:** `POST /api/v1/payments/initiate`
- **Auth:** Authenticated (`JwtAuthGuard`)
- **Request Body (`InitiatePaymentDto`):**
```json
{
  "orderId": "6740a1b2c3d4e5f678902001",
  "walletAddress": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "chainId": 11155111
}
```
- **Response `200 OK`:** Returns `FormattedPayment` with `expectedAmount`, `paymentReference`, `destinationAddress`, `verificationStatus: "pending"`, and `expiresAt`.

### 2.3 Verify Transaction
- **Route:** `POST /api/v1/payments/verify`
- **Auth:** Authenticated (`JwtAuthGuard`)
- **Request Body (`VerifyPaymentDto`):**
```json
{
  "orderId": "6740a1b2c3d4e5f678902001",
  "transactionHash": "0x1111111111111111111111111111111111111111111111111111111111111111",
  "walletAddress": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "chainId": 11155111
}
```
- **Response `200 OK`:**
  - `verificationStatus: "confirming"` when in mempool or confirmations `< requiredConfirmations`.
  - `verificationStatus: "verified"` when valid and confirmations `>= requiredConfirmations` (atomically marks order `paid` + `payment_confirmed` and deducts inventory).
- **Error Responses:**
  - `400 Bad Request`: Underpaid, overpaid, reverted, wrong token, wrong network, sender/recipient mismatch, or expired reconciliation.
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `404 Not Found`: Order not found or owned by another user.
  - `409 Conflict`: Duplicate transaction hash or order already paid with a different transaction.
  - `503 Service Unavailable`: RPC node unreachable or not configured.

### 2.4 Get Payment by Order
- **Route:** `GET /api/v1/payments/order/:orderId`
- **Auth:** Authenticated (`JwtAuthGuard`)
- **Response `200 OK`:** Returns latest `FormattedPayment` attempt for the order (`data: null` if payment has not been initiated).
