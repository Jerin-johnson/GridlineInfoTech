# 13 — Payment Security

## Core Security Principles
1. **No Private Keys**: The backend never requests, receives, or stores user private keys or seed phrases. All signing happens in MetaMask / WalletConnect on the user's device.
2. **Server-Side Verification**: Frontend transaction success is never trusted. Every `txHash` is independently verified via `CRYPTO_RPC_URL`.
3. **Strict Authorization**: All `/payments/*` routes (except `GET /payments/config`) require `JwtAuthGuard`, and `OrdersService.findUserOrderById` enforces `order.user === userId`. Admin endpoints (`/admin/payments/*`) require `RolesGuard` + `@Roles('admin')`.
4. **Zero-Address & Missing-Token Guards**: Startup Joi validation (`config.validation.ts`) and `PaymentsService.getPublicConfig()` reject `0x0000...0000` merchant/token addresses and block non-`ETH` payments when `CRYPTO_TOKEN_ADDRESS` is missing.
5. **No Manual Crypto Settlement**: Admins cannot mark a `crypto_wallet` order as `paid` via any admin endpoint; COD delivery confirmation explicitly rejects non-COD orders.

---

## Threat Model Table

| Threat | Risk | Prevention in Codebase | Status |
| :--- | :--- | :--- | :--- |
| **Forged frontend "paid" call** | Attacker gets free items | `BlockchainVerifierService` verifies `txHash` directly on-chain via `CRYPTO_RPC_URL` | **Implemented** |
| **Transaction hash replay across orders** | Paying Order B with Order A's tx | `findByChainAndTxHash` + unique partial index `{ chainId, transactionHash }` | **Implemented** |
| **Underpayment / Overpayment** | Financial loss / accounting mismatch | Exact `BigInt` comparison (`receivedAmountBigInt === expectedAmount`) | **Implemented** |
| **Wrong token / Fake USDC spoofing** | Attacker deploys worthless token | `log.address === expectedTokenAddress` + `ERC20_TRANSFER_TOPIC` check | **Implemented** |
| **Recipient tampering** | Funds sent to attacker address | `log.topics[2]` (or `tx.to`) verified against server `PAYMENT_WALLET_ADDRESS` | **Implemented** |
| **Network spoofing (wrong chain)** | Paying with worthless faucet on another chain | `dto.chainId === config.chainId` + `eth_chainId` RPC verification | **Implemented** |
| **Chain reorganization (reorg)** | Unconfirmed tx disappears after order paid | Requires `confirmations >= CRYPTO_REQUIRED_CONFIRMATIONS` (default `3`) | **Implemented** (depth configurable) |
| **Concurrent double-verification** | Double stock deduction | Atomic `updateOrderPaymentState` preconditions + MongoDB transaction | **Implemented** (requires replica set for full ACID) |
| **RPC MITM / Outage** | Single RPC failure or untrusted node | `RPC_TIMEOUT_MS = 10_000`, HTTPS RPC URL (`CRYPTO_RPC_URL` server-side) | **Partially implemented** (no multi-RPC failover) |
| **API abuse / RPC exhaustion** | Attacker spams `POST /payments/verify` | JWT auth + terminal `txHash` short-circuit | **Partially implemented** (no rate limiter / `@nestjs/throttler`) |
| **Wallet phishing / blind signing** | User signs malicious calldata | Frontend uses standard `erc20Abi` `transfer()` + `simulateContract` | **Implemented** (user still verifies address in wallet) |
