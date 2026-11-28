# 01 — Architecture and Dependencies

## Core Architectural Principles

APEX ATELIER uses a **non-custodial, order-first, server-verified** payment architecture:

1. **Non-custodial**: The backend never creates wallets, stores seed phrases, or requests private keys. Customers sign transactions in MetaMask or WalletConnect.
2. **Untrusted frontend**: Frontend payment status is never trusted. `BlockchainVerifierService` independently verifies every `transactionHash` against `CRYPTO_RPC_URL`.
3. **Order-first settlement**: An `Order` is created and reserves inventory **before** any wallet transfer. `Order` holds settlement truth (`paymentStatus`), while `Payment` records track individual on-chain attempts.

---

## Backend Module Architecture

Following `backend/AGENTS.md` and `backend/.agents/skills/repository-pattern/SKILL.md`:

```text
HTTP Request (JwtAuthGuard / RolesGuard)
  └── PaymentsController / AdminPaymentsController   (HTTP routing, DTO validation)
        └── PaymentsService / AdminPaymentsService   (Business logic, BigInt math, orchestration)
              ├── IPaymentRepository ──▶ MongoPaymentRepository ──▶ MongoDB (payments)
              ├── BlockchainVerifierService ──▶ EVM JSON-RPC (CRYPTO_RPC_URL)
              ├── OrdersService ──▶ IOrderRepository ──▶ MongoOrderRepository ──▶ MongoDB (orders)
              └── ProductsService ──▶ IProductRepository ──▶ MongoProductRepository ──▶ MongoDB (products)
```

### Module Boundaries
- `PaymentsModule` (`backend/src/modules/payments/payments.module.ts`) imports `OrdersModule` and `ProductsModule` and communicates **only** through exported `OrdersService` and `ProductsService` (no direct `OrderSchema` or `UserSchema` registration inside `PaymentsModule`).
- `PaymentsService` and `AdminPaymentsService` inject `@Inject(PAYMENT_REPOSITORY) IPaymentRepository` rather than concrete repositories or Mongoose models.

---

## Frontend Architecture

```text
app/layout.tsx
  └── Web3Provider (WagmiProvider + QueryClientProvider + client-only AppKit init)
        └── CheckoutClient / OrderDetailClient
              └── CryptoPaymentPanel
                    ├── useEvmWallet (AppKit modal, Wagmi hooks, Viem pre-flight checks)
                    └── lib/api/payments.api.ts -> apiFetch -> Axios (interceptors)
```

---

## Libraries and Dependencies

Only dependencies **actually installed and used** in `client-web/package.json` and `backend/package.json` are listed below:

| Package | Where Used | Why Selected & Problem Solved | Alternatives |
| :--- | :--- | :--- | :--- |
| **`viem`** (`^2.58.8`) | `useEvmWallet.ts`, `CryptoPaymentPanel.tsx` | Type-safe EVM primitives (`erc20Abi`, `isAddress`, `zeroAddress`, `encodeFunctionData`, `formatUnits`, `parseUnits`) with native `BigInt` precision; native foundation for Wagmi v3 | `ethers` v6, `web3.js` |
| **`wagmi`** (`^3.7.11`) | `wallet-config.ts`, `Web3Provider.tsx`, `useEvmWallet.ts` | React hooks (`useAccount`, `useDisconnect`, `useSwitchChain`, `usePublicClient`, `useWriteContract`, `useSendTransaction`) + SSR `cookieStorage` | Raw `window.ethereum`, `@web3-react` |
| **`@reown/appkit`** & **`@reown/appkit-adapter-wagmi`** (`^2.0.0`) | `wallet-config.ts`, `useEvmWallet.ts` | Multi-wallet connection modal (desktop extensions + WalletConnect QR/mobile deep links). Installed with `--legacy-peer-deps` due to upstream `ox` `peerOptional` conflict | RainbowKit, ConnectKit |
| **`@tanstack/react-query`** (`^5.108.4`) | `Web3Provider.tsx` | Required peer dependency of Wagmi v3 for RPC query caching | SWR |
| **`axios`** | `client-web/src/lib/api/` (`axios-instance.ts`, `api-fetch.ts`, `interceptors/`) | Centralized HTTP client with `withCredentials: true` and shared `/auth/refresh` retry on `401` | Native `fetch` |
| **Node `fetch` JSON-RPC** | `blockchain-verifier.service.ts` | Lightweight `eth_chainId`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, `eth_blockNumber` calls with `10_000ms` timeout (`RPC_TIMEOUT_MS`); avoids heavy backend Web3 SDKs | `viem` / `ethers` on backend |
| **`@nestjs/mongoose`** (`^11.0.1`) / **`mongoose`** (`^8.10.0`) | `payment.schema.ts`, `mongo-payment.repository.ts`, `payments.service.ts` | Schema validation, unique partial indexes, and optional multi-document ACID transactions | TypeORM, Prisma |
| **`class-validator`** / **`joi`** | `dto/*.dto.ts`, `config/config.validation.ts` | Request DTO validation and startup env var validation | Zod |

> **Redis / Queues**: **Not implemented**. Confirmation polling is driven by the frontend (`CryptoPaymentPanel.tsx`) and manual refresh.

---

## Related Documents
- [02 — End-to-End Payment Flow](./02-end-to-end-payment-flow.md)
- [03 — Wallet & Blockchain Verification](./03-wallet-and-blockchain-verification.md)
