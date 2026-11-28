# 03 — Crypto Payment Flow (Beginner-Friendly Guide)

Think of paying with cryptocurrency in an online store like paying via bank wire transfer—except **anyone can verify the wire receipt publicly on the blockchain**, and **the merchant cannot take money out of your account**; you must push the funds yourself.

---

## Phase 1 — Checkout (Creating the Order)

1. The customer adds products to their cart and opens `/checkout`.
2. They choose a saved shipping address and select **Crypto Wallet** (`paymentMethod: "crypto_wallet"`).
3. Clicking **Place Order** calls `POST /api/v1/orders/checkout` with an `idempotencyKey`.
4. `OrdersService.checkout()` (`backend/src/modules/orders/orders.service.ts`):
   - Validates cart items against live product prices and stock.
   - Atomically increments `reservedStock` for each product so another shopper cannot buy the last unit while you pay.
   - Creates the `Order` with `paymentStatus: "pending"`, `fulfilmentStatus: "placed"`, and a **30-minute payment window** (`paymentExpiresAt`).
   - Clears the cart.

> **Why create the Order first?** You need a locked USD total (`totalAmount` in cents) and reserved inventory *before* asking the customer to send an irreversible blockchain transfer.

---

## Phase 2 — Wallet Connection & Network Validation

1. `CheckoutClient` switches to `CryptoPaymentPanel` (`client-web/src/components/checkout/CryptoPaymentPanel.tsx`).
2. The user clicks **Connect Wallet**, which opens **Reown AppKit** (`useEvmWallet().connect()`).
3. They can connect a desktop browser extension (e.g., MetaMask) **or** scan a WalletConnect QR code with a mobile wallet.
4. **Why is a wallet address safe to share?** Your public address (`0xcfa0...570d`) is like an email address or IBAN—it only identifies where funds come from. Your **private key** never leaves your wallet app.
5. `CryptoPaymentPanel` compares `wallet.chainId` against `config.chainId` (`11155111` for Ethereum Sepolia testnet). If they differ, an amber **Incorrect Network Detected** banner appears with a **Switch to Sepolia** button, and the Pay button stays disabled.

---

## Phase 3 — Payment Preparation (`POST /api/v1/payments/initiate`)

1. Once connected on Sepolia, `CryptoPaymentPanel` calls `POST /api/v1/payments/initiate` with `{ orderId, walletAddress, chainId }`.
2. `PaymentsService.initiatePayment()` (`backend/src/modules/payments/payments.service.ts`):
   - Converts `order.totalAmount` (cents) into exact integer token units using `BigInt` (`cents * 10^(decimals - 2)`). For example, `$1,650.00` (`165000` cents) with 6-decimal USDC becomes `1650000000` base units.
   - Locks `destinationAddress` (merchant treasury), `tokenAddress` (Sepolia USDC contract), and `expectedAmount` into a `Payment` document in MongoDB.

---

## Phase 4 — Blockchain Transaction & Verification

1. **Pre-flight check (`useEvmWallet.ts`)**: Before opening MetaMask, the frontend checks:
   - SepoliaETH balance > `0` (for gas fees).
   - USDC `balanceOf(sender) >= expectedAmount`.
   - `simulateContract` succeeds on-chain.
2. **User signs**: MetaMask displays the USDC contract interaction (`transfer(merchantAddress, amount)`). The user approves.
3. **Broadcast**: The wallet signs with the user's private key and broadcasts to Sepolia, immediately returning a `txHash` (`0x...64 hex chars`).
4. **Server-side verification (`POST /api/v1/payments/verify`)**:
   - The frontend sends `{ orderId, transactionHash, walletAddress, chainId }` to the backend.
   - If the transaction is still in the mempool or has `< 3` confirmations, the backend sets `verificationStatus: "confirming"`, and `CryptoPaymentPanel` polls every **4 seconds** (up to 30 times).
   - Once confirmations reach `requiredConfirmations` (`3`) and all checks pass, the backend runs a MongoDB transaction that marks the `Order` **`paid`** (`payment_confirmed`), deducts reserved stock, and marks the `Payment` **`verified`**.
5. **Order Confirmation**: `CryptoPaymentPanel` invokes `onOrderPaid`, switching `/checkout` to `OrderConfirmationView`.

---

## Related Documents
- [04 — Checkout Integration](./04-checkout-integration.md)
- [06 — Blockchain Transaction Fundamentals](./06-blockchain-transaction-fundamentals.md)
- [09 — Blockchain Verification](./09-blockchain-verification.md)
