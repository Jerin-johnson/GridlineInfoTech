# 01 — Architecture Overview

## Core Design Philosophy

APEX ATELIER uses a **non-custodial, server-verified** cryptocurrency payment architecture:

1. **Non-custodial**: The backend never creates wallets, stores seed phrases, or requests private keys. The customer signs transactions directly in their browser/mobile wallet (MetaMask or WalletConnect).
2. **Untrusted frontend**: The browser submits a `transactionHash`, but the backend **never trusts** frontend claims of success. `BlockchainVerifierService` independently queries `CRYPTO_RPC_URL` to inspect the chain, receipt, ERC-20 `Transfer` logs, sender, recipient, amount, and block confirmations.
3. **Order-first settlement**: An `Order` document is created and reserves inventory **before** any blockchain transfer occurs. The `Order` holds the authoritative settlement state (`paymentStatus`), while `Payment` documents track individual on-chain attempts.

---

## Backend Module Architecture

Following `backend/AGENTS.md`, the backend uses a strict layered NestJS + Repository Pattern architecture:

```text
HTTP Request (JWT Auth)
  └── PaymentsController        (HTTP routing, DTO validation)
        └── PaymentsService     (Business logic, BigInt math, atomic orchestration)
              ├── IPaymentRepository ──▶ MongoPaymentRepository ──▶ MongoDB (payments)
              ├── BlockchainVerifierService ──▶ EVM JSON-RPC (CRYPTO_RPC_URL)
              ├── OrdersService ──▶ IOrderRepository ──▶ MongoOrderRepository ──▶ MongoDB (orders)
              └── ProductsService ──▶ IProductRepository ──▶ MongoProductRepository ──▶ MongoDB (products)
```

### Module Boundaries
- `PaymentsModule` (`backend/src/modules/payments/payments.module.ts`) imports `OrdersModule` and `ProductsModule` and communicates with them exclusively through exported `OrdersService` and `ProductsService`.
- `PaymentsService` depends on `IPaymentRepository` via the `@Inject(PAYMENT_REPOSITORY)` token rather than Mongoose directly (except `@InjectConnection()` for optional MongoDB transactions).

---

## Frontend Architecture

```text
app/layout.tsx
  └── Web3Provider (WagmiProvider + QueryClientProvider + client-only AppKit init)
        └── CheckoutClient / OrderDetailClient
              └── CryptoPaymentPanel
                    ├── useEvmWallet (AppKit modal, Wagmi account/chain/writeContract/publicClient)
                    └── lib/api/payments.api.ts (apiFetch -> Axios instance with cookie refresh)
```

---

## End-to-End Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as CryptoPaymentPanel
    participant Wallet as MetaMask / WalletConnect
    participant API as PaymentsController / Service
    participant RPC as Sepolia JSON-RPC
    participant DB as MongoDB

    User->>UI: Click Place Order (crypto_wallet)
    UI->>API: POST /orders/checkout (idempotencyKey)
    API->>DB: Reserve stock + Create Order (pending, 30m expiry)
    API-->>UI: FormattedOrder

    User->>UI: Connect Wallet (Sepolia 11155111)
    UI->>API: POST /payments/initiate
    API->>DB: Create/Reuse Payment attempt (expectedAmount)
    API-->>UI: FormattedPayment

    User->>UI: Click Pay USDC
    UI->>RPC: Pre-flight getBalance + balanceOf + simulateContract
    UI->>Wallet: ERC-20 transfer(destinationAddress, expectedAmount)
    Wallet-->>UI: txHash

    loop Every 4s (max 30) while confirming
        UI->>API: POST /payments/verify (txHash)
        API->>RPC: eth_chainId, eth_getTransactionByHash, receipt, blockNumber
        RPC-->>API: On-chain proof
        alt Confirmations < required
            API->>DB: Update Payment/Order -> confirming
        else Verified & Confirmations >= required
            API->>DB: Transaction: Order=paid, Stock deducted, Payment=verified
        end
        API-->>UI: FormattedPayment
    end
```

---

## Related Documents
- [02 — Libraries & Dependencies](./02-libraries-and-dependencies.md)
- [03 — Crypto Payment Flow](./03-crypto-payment-flow.md)
- [14 — Database Models & Relations](./14-database-models-and-relations.md)
