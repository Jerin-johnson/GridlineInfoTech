# 02 — Libraries and Dependencies

Only dependencies **actually installed and used** in `client-web/package.json` and `backend/package.json` are documented here.

---

## Frontend Web3 & API Stack (`client-web/package.json`)

### 1. `viem` (`^2.58.8`)
- **Where used**: `client-web/src/hooks/useEvmWallet.ts`, `client-web/src/components/checkout/CryptoPaymentPanel.tsx`
- **Why used**: Type-safe EVM primitives (`erc20Abi`, `isAddress`, `zeroAddress`, `encodeFunctionData`, `formatUnits`, `parseUnits`) with native `BigInt` precision.
- **Problem solved**: Prevents JavaScript `number` floating-point rounding bugs when converting USD cents to 6-decimal USDC base units or formatting token balances.
- **Alternatives**: `ethers` v6 or `web3.js`. `viem` was chosen because Wagmi v3 and Reown AppKit v2 are built directly on `viem`, avoiding duplicate ABI/RPC bundles.

```typescript
// client-web/src/hooks/useEvmWallet.ts
const rawBigInt = BigInt(params.amountUnits);
const normalizedUnits = parseUnits(formatUnits(rawBigInt, decimals), decimals);
```

### 2. `wagmi` (`^3.7.11`)
- **Where used**: `client-web/src/lib/web3/wallet-config.ts`, `client-web/src/components/providers/Web3Provider.tsx`, `client-web/src/hooks/useEvmWallet.ts`
- **Why used**: Provides React hooks (`useAccount`, `useDisconnect`, `useSwitchChain`, `usePublicClient`, `useWriteContract`, `useSendTransaction`) and SSR cookie persistence (`cookieStorage`, `createStorage`, `http`).
- **Problem solved**: Eliminates fragile manual `window.ethereum.on("accountsChanged")` / `chainChanged` listeners and provides a unified `PublicClient` for pre-flight `getBalance`, `balanceOf`, and `simulateContract`.
- **Alternatives**: Raw EIP-1193 (`window.ethereum`), `@web3-react`.

### 3. `@reown/appkit` & `@reown/appkit-adapter-wagmi` (`^2.0.0`)
- **Where used**: `client-web/src/lib/web3/wallet-config.ts`, `client-web/src/hooks/useEvmWallet.ts`
- **Why used**: Formerly WalletConnect Web3Modal. Provides the multi-wallet connection modal (`useAppKit`, `useAppKitState`) supporting desktop browser extensions (MetaMask, Rabby, etc.) **and** mobile wallets via WalletConnect QR codes and deep links.
- **Problem solved**: Raw `window.ethereum` fails on mobile browsers or browsers without extensions. AppKit bridges both worlds with one modal.
- **Alternatives**: RainbowKit, ConnectKit.
- **Upstream note**: Installed with `--legacy-peer-deps` due to an upstream `peerOptional` version mismatch on `ox` inside `@wagmi/connectors` / `@privy-io/react-auth`.

### 4. `@tanstack/react-query` (`^5.108.4`)
- **Where used**: `client-web/src/components/providers/Web3Provider.tsx`
- **Why used**: Required peer dependency of `wagmi` v3 for caching, deduplicating, and invalidating wallet/RPC queries.

### 5. `axios`
- **Where used**: `client-web/src/lib/api/axios-instance.ts`, `api-fetch.ts`, `interceptors/`
- **Why used**: Centralized HTTP client with `withCredentials: true` and request/response interceptors for automatic `/auth/refresh` token rotation on `401`.

---

## Backend Stack (`backend/package.json`)

### 1. Native Node `fetch` + JSON-RPC (`BlockchainVerifierService`)
- **Where used**: `backend/src/modules/payments/services/blockchain-verifier.service.ts`
- **Why used**: Calls `CRYPTO_RPC_URL` directly with `eth_chainId`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, and `eth_blockNumber` with an `AbortController` (`RPC_TIMEOUT_MS = 10_000`).
- **Why no heavy Web3 SDK on backend**: Keeping `BlockchainVerifierService` dependency-free (plain JSON-RPC + `BigInt`) minimizes supply-chain surface area and startup overhead in NestJS.
- **Alternatives**: `viem` publicClient or `ethers.JsonRpcProvider` on the backend.

### 2. `@nestjs/mongoose` (`^11.0.1`) & `mongoose` (`^8.10.0`)
- **Where used**: `schemas/payment.schema.ts`, `repositories/mongo-payment.repository.ts`, `payments.service.ts` (`executeWithOptionalTransaction`)
- **Why used**: Schema validation, unique partial indexes (`{ chainId: 1, transactionHash: 1 }`), and multi-document ACID transactions (when MongoDB runs as a replica set).

### 3. `class-validator` (`^0.15.1`), `class-transformer` (`^0.5.1`), `joi` (`^18.3.2`)
- **Where used**: `InitiatePaymentDto`, `VerifyPaymentDto`, `backend/src/config/config.validation.ts`
- **Why used**: Request DTO validation and startup environment variable validation.

### 4. Redis / BullMQ / Queues
- **Status**: **Not implemented**. Payment confirmation polling is currently driven by the frontend (`CryptoPaymentPanel.tsx` every 4s) and manual refresh (`Refresh Verification`), rather than background queues.
