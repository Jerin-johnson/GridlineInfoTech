# 15 — API Endpoints

Base path: `/api/v1` (`PaymentsController` + `AdminPaymentsController` in `backend/src/modules/payments/`).

---

## Customer & Public Payment Endpoints

### 1. `GET /api/v1/payments/config`
- **Auth**: Public (`@Public()`)
- **Service**: `PaymentsService.getPublicConfig()`
- **Response `200 OK`**:
```json
{
  "message": "Payment configuration retrieved successfully",
  "data": {
    "chainId": 11155111,
    "network": "Sepolia",
    "token": "USDC",
    "tokenAddress": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
    "tokenDecimals": 6,
    "destinationAddress": "0x9caf00b105eb105120921fbf00d3509c5776bf79",
    "requiredConfirmations": 3
  }
}
```

### 2. `POST /api/v1/payments/initiate`
- **Auth**: Authenticated (`JwtAuthGuard`, HTTP-only cookie `access_token`)
- **DTO (`InitiatePaymentDto`)**:
  - `orderId`: `@IsMongoId()`
  - `walletAddress`: `@Matches(/^0x[a-fA-F0-9]{40}$/)`
  - `chainId?`: `@IsInt()`, `@Min(1)`
- **Errors**: `400` (invalid ID, wrong network, expired, invalid order status), `401`, `404` (order not found for user), `409` (order already paid / concurrent lock), `503` (merchant wallet or ERC-20 token contract unconfigured).

### 3. `POST /api/v1/payments/verify`
- **Auth**: Authenticated (`JwtAuthGuard`)
- **DTO (`VerifyPaymentDto`)**:
  - `orderId`: `@IsMongoId()`
  - `transactionHash`: `@Matches(/^0x[a-fA-F0-9]{64}$/)`
  - `walletAddress`: `@Matches(/^0x[a-fA-F0-9]{40}$/)`
  - `chainId`: `@IsInt()`, `@Min(1)`
- **Response `200 OK`**: Returns `FormattedPayment` (`verificationStatus: "confirming"` or `"verified"`).
- **Errors**: `400` (`underpaid`, `overpaid`, `reverted`, `wrong_token`, `wrong_network`, `expired`, `failed`), `404`, `409` (duplicate `txHash` across orders or order paid with another tx), `503` (RPC unavailable or `eth_chainId` mismatch).

### 4. `GET /api/v1/payments/order/:orderId`
- **Auth**: Authenticated (`JwtAuthGuard`)
- **Response `200 OK`**: Latest `FormattedPayment` attempt for `(orderId, userId)` or `null`.

---

## Read-Only Admin Payment Endpoints (`@UseGuards(RolesGuard) @Roles('admin')`)

- **`GET /api/v1/admin/payments/summary`**: Returns `collectedRevenue`, `successfulPayments`, `pendingPayments`, `failedExpiredPayments`, `cryptoRevenue`, `codCollected` (aggregated from `orders` via `OrdersService` + failed attempt count from `IPaymentRepository`).
- **`GET /api/v1/admin/payments`**: Paginated, filterable (`search`, `status`, `paymentMethod`, `dateFrom`, `dateTo`, `page`, `limit`) unified ledger of crypto attempts and COD orders.
- **`GET /api/v1/admin/payments/:transactionId`**: Detailed payment audit record including `attemptHistory`.
