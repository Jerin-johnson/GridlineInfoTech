# Database Documentation

Database architecture and schema reference for the **GridLine / APEX ATELIER** automotive accessories e-commerce platform, supporting Sepolia USDC (crypto wallet) and Cash on Delivery (COD) checkout.

- **Database:** MongoDB (Mongoose ODM via `@nestjs/mongoose`)
- **Visual ERD (Eraser.io):** https://app.eraser.io/workspace/lNmmqjEvwOEUiCNuwypu?origin=share
- **Local Diagram Source:** [erd.eraser](./erd.eraser)

---

## 1. Database Design Rationale

### Why MongoDB
- **Faster development and iteration:** Document models map directly to TypeScript entities without rigid relational migrations, allowing schemas to evolve smoothly as features (such as COD orders, payment attempts, and admin payment reconciliation) were added.
- **Varying automotive product attributes:** Automotive parts differ widely in technical specifications and vehicle fitment. Storing `specifications[]` (key/value pairs) and `compatibility[]` (make, model, year range, notes) inside `products` avoids complex EAV (Entity-Attribute-Value) joins.
- **Embedded documents and point-in-time snapshots:** Data that belongs together—such as `users.addresses[]`, `carts.items[]`, and `orders.items[]` / `orders.shippingAddress`—lives in the parent document. Order snapshots ensure historical receipts never change when catalog prices or user addresses are edited later.
- **Multi-document transactions when needed:** On a MongoDB replica set, `session.withTransaction()` keeps order creation, stock reservation, payment verification, and reconciliation atomic.

### Why Mongoose
- **TypeScript & NestJS integration:** `@nestjs/mongoose` lets schemas be authored as typed `@Schema()` / `@Prop()` classes injected cleanly into repository classes (`MongoUserRepository`, `MongoOrderRepository`, `MongoPaymentRepository`, etc.).
- **Built-in schema enforcement:** Mongoose enforces `required`, `enum`, `min`/`max`, `maxlength`, `default`, `select: false` (on `passwordHash`), and string normalization (`trim`, `lowercase`, `uppercase`) at the persistence boundary alongside `class-validator` DTOs at the API boundary.
- **Declarative indexing:** Unique, compound, sparse, partial, text, and TTL indexes are declared directly in the schema files.

---

## 2. Collections Overview

| Collection | Represents | Feature / Module | Key Relationships |
| :--- | :--- | :--- | :--- |
| `users` | Customer & admin accounts with saved addresses | `UsersModule`, `AuthModule` | `1:N` `orders`, `payments`, `refresh_tokens`; `1:0..1` `carts` |
| `refresh_tokens` | Hashed JWT refresh tokens for session rotation | `AuthModule` | `N:1` `users` |
| `categories` | Product category hierarchy (`parent` tree) | `CategoriesModule` | `1:N` self (`parent`); `1:N` `products` |
| `brands` | Product manufacturers / brands | `BrandsModule` | `1:N` `products` |
| `products` | Catalog items, pricing (cents), media, specs, fitment, stock | `ProductsModule` | `N:1` `categories`, `brands`; `1:N` `inventory_movements` |
| `inventory_movements` | Audit ledger of every stock & reservation change | `ProductsModule` (`InventoryService`) | `N:1` `products`; optional `N:1` `orders`, `users` |
| `carts` | Active shopping carts for users or guest sessions | `CartModule` | `0..1:1` `users`; items ref `products` |
| `orders` | Placed orders with frozen snapshots, fulfilment & tracking | `OrdersModule` | `N:1` `users`; `1:N` `payments`, `inventory_movements` |
| `payments` | On-chain crypto payment attempts, verification & reconciliation | `PaymentsModule` | `N:1` `orders`, `users` |

---

## 3. Collections & Field-Level Reference

> **Note:** All 9 top-level collections enable Mongoose `{ timestamps: true }`, which automatically manages `createdAt` (`Date`) and `updatedAt` (`Date`), and uses MongoDB's auto-generated `_id` (`ObjectId`) primary key.

### 3.1 `users` (`users/schemas/user.schema.ts`)
Stores customer and administrator accounts, authentication metadata, and saved shipping addresses. Checked by `AuthService`, `UsersService`, and `AdminCustomersService`.

| Field | Type | Req / Opt | Default / Constraints | Purpose & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `firstName` | string | Required | `trim` | Customer/admin first name for UI display and order summaries. |
| `lastName` | string | Required | `trim` | Customer/admin last name. |
| `email` | string | Required | `unique`, `lowercase`, `trim` | Login identifier; normalized to prevent case-duplicate accounts. |
| `passwordHash` | string | Optional | `select: false` | Bcrypt hash for `local` users; excluded from default queries and omitted for Google OAuth accounts. |
| `authProvider` | string | Required | Enum `local \| google`, default `'local'` | Distinguishes password login accounts from Google OAuth accounts. |
| `role` | string | Required | Enum `customer \| admin`, default `'customer'` | Server-side authorization role enforced by `RolesGuard`. |
| `phone` | string | Optional | `trim` | User profile contact phone number. |
| `avatar` | string | Optional | `trim` | Profile image URL (populated from Google OAuth or profile updates). |
| `isActive` | boolean | Required | Default `true` | Allows admins to deactivate/reactivate accounts without deleting order history. |
| `isEmailVerified` | boolean | Required | Default `false` | Indicates whether the user's email address is verified. |
| `addresses` | `Address[]` | Required | Embedded (`_id: true`), default `[]` | Saved shipping addresses managed under `/users/me/addresses`. |
| `lastLoginAt` | Date | Optional | — | Timestamp of the most recent successful login (used in admin customer sorting). |

#### Embedded: `Address` (`_id: true`, `timestamps: false`)
| Field | Type | Req / Opt | Default / Constraints | Purpose & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Required | Auto-generated | Allows updating, deleting, or setting a specific address as default. |
| `label` | string | Required | `trim` | User-friendly tag (e.g., `"Home"`, `"Garage"`). |
| `fullName` | string | Required | `trim` | Recipient name copied into `orders.shippingAddress` at checkout. |
| `phone` | string | Required | `trim` | Delivery contact phone number. |
| `line1` | string | Required | `trim` | Primary street address. |
| `line2` | string | Optional | `trim` | Apartment, suite, or unit number. |
| `city` | string | Required | `trim` | Delivery city. |
| `state` | string | Required | `trim` | State or province. |
| `postalCode` | string | Required | `trim` | ZIP or postal code. |
| `country` | string | Required | `trim`, default `'US'` | Country code or name. |
| `isDefault` | boolean | Required | Default `false` | Marks the user's default checkout address. |

---

### 3.2 `refresh_tokens` (`auth/schemas/refresh-token.schema.ts`)
Tracks hashed refresh tokens by rotation `family` so `AuthService` can rotate tokens on `/auth/refresh`, detect token reuse, revoke sessions on `/auth/logout`, and let MongoDB auto-purge expired records.

| Field | Type | Req / Opt | Default / Constraints | Purpose & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `userId` | ObjectId | Required | Ref `User`, indexed | Links the token to its owner for per-user session revocation. |
| `tokenHash` | string | Required | `unique` | SHA-256 hash of the refresh JWT; raw tokens are never persisted. |
| `family` | string | Required | Indexed | Rotation family ID; revokes the entire token chain if reuse is detected. |
| `expiresAt` | Date | Required | TTL (`expireAfterSeconds: 0`) | Expiration timestamp used by MongoDB's background TTL cleanup. |
| `isRevoked` | boolean | Required | Default `false` | Immediately invalidates rotated or logged-out tokens before TTL runs. |

---

### 3.3 `categories` (`categories/schemas/category.schema.ts`)
Organizes catalog items into a soft-deletable category tree (`parent` self-reference).

| Field | Type | Req / Opt | Default / Constraints | Purpose & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `name` | string | Required | `trim` | Category display name. |
| `slug` | string | Required | `unique`, `lowercase`, `trim` | URL-safe slug for `/categories/slug/:slug` and storefront filters. |
| `description` | string | Optional | `trim` | Category description shown in admin and catalog views. |
| `image` | string | Optional | `trim` | Category thumbnail/banner URL. |
| `parent` | ObjectId \| null | Optional | Ref `Category`, default `null`, indexed | Optional parent category ID for nested sub-categories. |
| `status` | string | Required | Enum `active \| inactive`, default `'active'` | Soft-deactivation flag (`DELETE /categories/:id` sets `inactive`). |

---

### 3.4 `brands` (`brands/schemas/brand.schema.ts`)
Stores automotive parts manufacturers/brands for catalog filtering and brand pages.

| Field | Type | Req / Opt | Default / Constraints | Purpose & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `name` | string | Required | `trim` | Brand display name. |
| `slug` | string | Required | `unique`, `lowercase`, `trim` | URL-safe slug for `/brands/slug/:slug`. |
| `logo` | string | Optional | `trim` | Brand logo URL. |
| `description` | string | Optional | `trim` | Brand summary text. |
| `status` | string | Required | Enum `active \| inactive`, default `'active'` | Soft-deactivation flag (`DELETE /brands/:id` sets `inactive`). |

---

### 3.5 `products` (`products/schemas/product.schema.ts`)
Core catalog collection used by storefront browsing, search, cart validation, checkout pricing, and inventory management.

| Field | Type | Req / Opt | Default / Constraints | Purpose & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `name` | string | Required | `trim` | Product title (weighted `10` in text search). |
| `slug` | string | Required | `unique`, `lowercase`, `trim` | URL-safe identifier for `/products/slug/:slug`. |
| `sku` | string | Required | `unique`, `uppercase`, `trim` | Stock Keeping Unit (weighted `5` in text search) copied into order snapshots. |
| `description` | string | Optional | `trim` | Product description (weighted `1` in text search). |
| `category` | ObjectId | Required | Ref `Category` | Category used for catalog filtering and related-product lookups. |
| `brand` | ObjectId | Required | Ref `Brand` | Brand/manufacturer reference. |
| `price` | number | Required | `min: 0` | Authoritative unit price in integer minor units (cents) to avoid floating-point errors. |
| `compareAtPrice` | number | Optional | `min: 0` | Optional strike-through price in cents. |
| `currency` | string | Required | `uppercase`, `trim`, default `'USD'` | Currency code for pricing display. |
| `images` | `ProductImage[]` | Required | Embedded (`_id: false`), default `[]` | Product gallery images. |
| `specifications` | `ProductSpecification[]` | Required | Embedded (`_id: false`), default `[]` | Key-value technical specifications. |
| `compatibility` | `ProductCompatibility[]` | Required | Embedded (`_id: false`), default `[]` | Vehicle fitment records. |
| `stock` | number | Required | `min: 0`, default `0` | Total physical on-hand inventory. |
| `reservedStock` | number | Required | `min: 0`, default `0` | Units held by pending/confirming orders (`available = stock - reservedStock`). |
| `lowStockThreshold` | number | Required | `min: 0`, default `5` | Cutoff for flagging low-stock products in admin inventory views. |
| `status` | string | Required | Enum `draft \| published \| out_of_stock \| archived`, default `'draft'` | Controls storefront visibility and soft-archiving (`DELETE /products/:id`). |
| `isFeatured` | boolean | Required | Default `false` | Highlights products on the storefront homepage. |

#### Embedded Subdocuments on `products` (`_id: false`)
- **`ProductImage`:** `url` (string, req — Cloudinary URL), `publicId` (string, opt — Cloudinary asset ID for deletion), `alt` (string, opt), `isPrimary` (boolean, default `false`), `sortOrder` (number, default `0`).
- **`ProductSpecification`:** `key` (string, req, `trim` — e.g. `"Material"`), `value` (string, req, `trim` — e.g. `"Pre-Preg Carbon Fiber"`).
- **`ProductCompatibility`:** `make` (string, req, `trim`), `model` (string, req, `trim`), `yearFrom` (number, req), `yearTo` (number, req), `notes` (string, opt, `trim`).

---

### 3.6 `inventory_movements` (`products/schemas/inventory-movement.schema.ts`)
Immutable stock ledger written by `ProductsService` and `InventoryService` whenever stock or reservations change.

| Field | Type | Req / Opt | Default / Constraints | Purpose & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `product` | ObjectId | Required | Ref `Product`, indexed | Product whose stock or reservation changed. |
| `type` | string | Required | Indexed, enum `initial_stock \| admin_adjustment \| stock_reservation \| reservation_release \| order_fulfillment \| order_cancellation` | Classifies the business event behind the stock change. |
| `quantity` | number | Required | `min: 1` | Positive number of units affected. |
| `delta` | number | Required | Signed integer | Net signed change (e.g., `+5` on restock, `-2` on reservation/decrease). |
| `previousStock` | number | Required | `min: 0` | `Product.stock` before the operation. |
| `resultingStock` | number | Required | `min: 0` | `Product.stock` after the operation. |
| `previousReservedStock` | number | Required | `min: 0`, default `0` | `Product.reservedStock` before the operation. |
| `resultingReservedStock` | number | Required | `min: 0`, default `0` | `Product.reservedStock` after the operation. |
| `reason` | string | Required | `trim`, `maxlength: 500` | Human-readable audit note. |
| `actor` | ObjectId | Optional | Ref `User` | Admin or user who initiated the change (omitted for automated system events). |
| `order` | ObjectId | Optional | Ref `Order` | Associated order for reservation, fulfilment, or cancellation entries. |

---

### 3.7 `carts` (`cart/schemas/cart.schema.ts`)
Stores active shopping carts for authenticated users (`user`) or guest sessions (`sessionId`). Prices are intentionally omitted so checkout always computes totals from `products.price`.

| Field | Type | Req / Opt | Default / Constraints | Purpose & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `user` | ObjectId | Optional | Ref `User`, `unique`, `sparse` | Authenticated cart owner (at most one cart per user). |
| `sessionId` | string | Optional | `unique`, `sparse`, `trim` | Guest session identifier prior to login/merge. |
| `items` | `CartItem[]` | Required | Embedded (`_id: false`), default `[]` | Products and quantities currently in the cart. |
| `expiresAt` | Date | Optional | — | Optional guest cart expiration timestamp. *(Note: no TTL index is defined on `CartSchema`.)* |

#### Embedded: `CartItem` (`_id: false`)
| Field | Type | Req / Opt | Default / Constraints | Purpose & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `product` | ObjectId | Required | Ref `Product` | Product reference looked up dynamically for live pricing and stock checks. |
| `quantity` | number | Required | `min: 1`, default `1` | Desired unit quantity. |

---

### 3.8 `orders` (`orders/schemas/order.schema.ts`)
Stores customer purchases, frozen item/address snapshots, payment & fulfilment lifecycles, shipping tracking, and status history.

| Field | Type | Req / Opt | Default / Constraints | Purpose & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `orderNumber` | string | Required | `unique`, `trim` | Human-readable order ID (e.g., `ORD-20261128-...`). |
| `paymentReference` | string | Required | `unique`, `trim` | Authoritative order-level payment reference linked to `payments.orderPaymentReference`. |
| `idempotencyKey` | string | Optional | `trim`, unique per `user` (partial) | Client-supplied key preventing duplicate orders on checkout retries. |
| `user` | ObjectId | Required | Ref `User` | Customer who placed the order. |
| `customerEmail` | string | Required | `lowercase`, `trim` | Customer email snapshot at checkout time. |
| `items` | `OrderItem[]` | Required | Embedded (`_id: false`) | Frozen line-item snapshots purchased in this order. |
| `shippingAddress` | `OrderShippingAddress` | Required | Embedded (`_id: false`) | Frozen delivery address snapshot copied from `users.addresses`. |
| `subtotal` | number | Required | `min: 0` | Sum of `items[].lineTotal` in cents. |
| `shippingCost` | number | Required | `min: 0`, default `0` | Shipping fee in cents. |
| `taxAmount` | number | Required | `min: 0`, default `0` | Tax amount in cents. |
| `totalAmount` | number | Required | `min: 0` | Final order total in cents (`subtotal + shippingCost + taxAmount`). |
| `currency` | string | Required | `uppercase`, `trim`, default `'USD'` | Order currency code. |
| `paymentMethod` | string | Required | `trim`, default `'crypto_wallet'` | Payment rail (`'crypto_wallet'` or `'cod'`). |
| `paymentStatus` | string | Required | Enum `pending \| confirming \| paid \| failed \| expired \| refunded`, default `'pending'` | Financial settlement state. |
| `fulfilmentStatus` | string | Required | Enum `placed \| payment_confirmed \| processing \| shipped \| out_for_delivery \| delivered \| cancelled`, default `'placed'` | Warehouse and delivery progression state. |
| `statusHistory` | `OrderStatusHistoryEntry[]` | Required | Embedded (`_id: false`), default `[]` | Timestamped audit log of payment and fulfilment transitions. |
| `stockReserved` | boolean | Required | Default `true` | Tracks whether `Product.reservedStock` is currently held for this order. |
| `paymentExpiresAt` | Date | Optional | — | 30-minute reservation deadline for crypto orders. |
| `cancelledAt` | Date | Optional | — | Timestamp when the order was cancelled or expired. |
| `cancellationReason` | string | Optional | `trim` | Customer or admin reason for cancellation. |
| `shippingProvider` | string | Optional | `trim` | Courier/carrier name set by admin during fulfilment. |
| `trackingNumber` | string | Optional | `trim` | Shipment tracking number. |
| `trackingUrl` | string | Optional | `trim` | Carrier tracking URL. |
| `shippedAt` | Date | Optional | — | Timestamp when marked `shipped`. |
| `deliveredAt` | Date | Optional | — | Timestamp when marked `delivered`. |
| `paidAt` | Date | Optional | — | Timestamp when payment was confirmed (on-chain verified or COD collected). |
| `codPaymentConfirmedBy` | string | Optional | `trim` | Admin ID who confirmed Cash on Delivery payment receipt. |
| `notes` | string | Optional | `trim` | Optional customer checkout notes. |

#### Embedded Subdocuments on `orders` (`_id: false`)
- **`OrderItem`:** `product` (ObjectId ref `Product`, req), `name` (string, req), `sku` (string, req), `slug` (string, default `''`), `image` (string, opt), `unitPrice` (number, req, `min: 0`), `quantity` (number, req, `min: 1`), `lineTotal` (number, req, `min: 0`).
- **`OrderShippingAddress`:** `addressId` (ObjectId, req), `label`, `fullName`, `phone`, `line1`, `line2` (opt), `city`, `state`, `postalCode`, `country`.
- **`OrderStatusHistoryEntry`:** `status` (string, req), `note` (string, opt), `actor` (string, req — user ID, admin ID, or `'system'`), `changedAt` (Date, req, default `Date.now`).

---

### 3.9 `payments` (`payments/schemas/payment.schema.ts`)
Tracks on-chain ERC-20 payment attempts, confirmation progress, verification outcomes, and admin reconciliation for expired late payments. *(COD orders are tracked directly on `orders` without creating `payments` documents.)*

| Field | Type | Req / Opt | Default / Constraints | Purpose & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `order` | ObjectId | Required | Ref `Order` | Order associated with this payment attempt. |
| `user` | ObjectId | Required | Ref `User` | Customer who initiated the attempt. |
| `paymentReference` | string | Required | `unique`, `trim` | Unique attempt-level reference (`PAY-...`) preventing `E11000` collisions across retries. |
| `orderPaymentReference` | string | Required | `trim`, indexed | Mirrors `Order.paymentReference` to group all attempts for an order. |
| `attemptNumber` | number | Required | `min: 1`, default `1` | Sequential attempt number per order (`1`, `2`, `3`...). |
| `paymentMethod` | string | Required | `trim`, default `'crypto_wallet'` | Payment method identifier. |
| `chainId` | number | Required | — | Expected EVM network ID (e.g., `11155111` for Sepolia). |
| `network` | string | Required | `trim` | Network display name (e.g., `'Sepolia'`). |
| `token` | string | Required | `uppercase`, `trim` | Token symbol (e.g., `'USDC'`). |
| `tokenAddress` | string | Optional | `lowercase`, `trim` | ERC-20 contract address verified against receipt `Transfer` logs. |
| `tokenDecimals` | number | Required | `min: 0`, `max: 18` | Token decimal precision (`6` for USDC). |
| `destinationAddress` | string | Required | `lowercase`, `trim` | Merchant treasury wallet expected to receive the tokens. |
| `walletAddress` | string | Required | `lowercase`, `trim` | Customer wallet address expected as the `Transfer` sender. |
| `transactionHash` | string | Optional | `lowercase`, `trim` | On-chain tx hash (`0x...`); unique per `chainId` once submitted. |
| `expectedAmount` | string | Required | — | Authoritative due amount in token base units, stored as string for exact `BigInt` comparison. |
| `receivedAmount` | string | Optional | — | Actual on-chain amount received at `destinationAddress` in base units. |
| `blockNumber` | number | Optional | — | Block height where the transaction was mined. |
| `confirmations` | number | Required | `min: 0`, default `0` | Current confirmation count (`currentBlock - receiptBlock + 1`). |
| `requiredConfirmations` | number | Required | `min: 1`, default `3` | Minimum confirmations required to transition to `verified`. |
| `verificationStatus` | string | Required | Enum `pending \| confirming \| verified \| underpaid \| overpaid \| wrong_token \| wrong_network \| reverted \| expired \| refunded \| failed`, default `'pending'` | Detailed verification and reconciliation state. |
| `failureReason` | string | Optional | `trim` | Actionable failure or expiration explanation shown to customer/admin. |
| `refundTxHash` | string | Optional | `lowercase`, `trim` | Outbound refund tx hash recorded by admin when refunding an expired late payment. |
| `reconciledAt` | Date | Optional | — | Timestamp when an admin reconciled an expired payment. |
| `reconciledBy` | ObjectId | Optional | Ref `User` | Admin user who performed reconciliation. |
| `reconciliationNote` | string | Optional | `trim` | Admin audit note explaining the reconciliation action. |
| `expiresAt` | Date | Required | — | Payment window deadline copied from `Order.paymentExpiresAt` (or 30-min fallback). |
| `verifiedAt` | Date | Optional | — | Timestamp when the payment reached `verified`. |

---

## 4. Relationships & Data Flow

1. **Authentication & Refresh Tokens:** On login/register/Google OAuth, `AuthService` hashes the refresh JWT and inserts a `refresh_tokens` record tied to `users._id` and a `family` UUID. Refreshing rotates the token inside the same `family`; token reuse revokes the entire family.
2. **Catalog Hierarchy:** `products` reference `categories._id` and `brands._id`; `categories.parent` allows nested trees. Soft-deactivating a category/brand (`status: 'inactive'`) or archiving a product (`status: 'archived'`) preserves referential integrity for existing orders.
3. **Cart & Checkout:** `carts` store only `product` ObjectIds and `quantity`. At `POST /checkout`, `OrdersService` loads authoritative `products.price` values, validates and copies `users.addresses` into `orders.shippingAddress`, reserves stock on `products`, writes `inventory_movements` (`stock_reservation`), creates the `orders` document, and clears the cart.
4. **Payment Attempts & Crypto Verification:** `POST /payments/initiate` creates (or returns an active) `payments` attempt linked to `orders._id`. After the customer sends an ERC-20 `transfer()` on Sepolia, `POST /payments/verify` checks the receipt via `BlockchainVerifierService`. Once `confirmations >= requiredConfirmations` and token/recipient/sender/amount match, `payments` becomes `verified`, `orders` becomes `paid` / `payment_confirmed`, and stock is finalized.
5. **Fulfilment & Tracking:** Admins advance `orders.fulfilmentStatus` forward (`payment_confirmed -> processing -> shipped -> out_for_delivery -> delivered`, or `placed -> cancelled`), appending entries to `orders.statusHistory` and attaching `shippingProvider`, `trackingNumber`, and `trackingUrl`.
6. **Inventory Movements:** Every stock or reservation change (`initial_stock`, `admin_adjustment`, `stock_reservation`, `reservation_release`, `order_fulfillment`, `order_cancellation`) appends an immutable `inventory_movements` entry.
7. **Late Payment Reconciliation:** If an on-chain transaction is verified after `paymentExpiresAt`, `PaymentsService` records the proof with `verificationStatus: 'expired'`, cancels the order, and releases stock. Admins can later call `POST /admin/payments/:transactionId/reconcile` to either `fulfill` (re-reserve stock and mark `paid` / `verified`) or `refund` (record `refundTxHash` and mark `refunded`).

---

## 5. Indexes & Constraints

| Collection | Index | Kind | Supported Query / Business Requirement |
| :--- | :--- | :--- | :--- |
| `users` | `{ email: 1 }` | Unique | Prevents duplicate accounts; fast login lookup. |
| `refresh_tokens` | `{ tokenHash: 1 }` | Unique | Fast refresh/logout token lookup. |
| `refresh_tokens` | `{ family: 1 }` | Standard | Revokes an entire rotation family on token reuse. |
| `refresh_tokens` | `{ userId: 1 }` | Standard | Revokes all active sessions for a user. |
| `refresh_tokens` | `{ expiresAt: 1 }` | TTL (`0s`) | Auto-deletes expired refresh tokens. |
| `categories` | `{ slug: 1 }` | Unique | Unique storefront URLs and slug lookup. |
| `categories` | `{ parent: 1 }` | Standard | Parent/child category tree queries. |
| `brands` | `{ slug: 1 }` | Unique | Unique storefront URLs and slug lookup. |
| `products` | `{ slug: 1 }`, `{ sku: 1 }` | Unique | Unique product URLs and warehouse SKUs. |
| `products` | `{ status: 1, category: 1, price: 1 }` | Compound | Storefront category filtering + price sorting. |
| `products` | `{ status: 1, brand: 1, price: 1 }` | Compound | Storefront brand filtering + price sorting. |
| `products` | `{ status: 1, isFeatured: 1 }` | Compound | Homepage featured products query. |
| `products` | `{ name: 'text', sku: 'text', description: 'text' }` | Text (`10, 5, 1`) | Weighted keyword search across catalog. |
| `inventory_movements` | `{ product: 1 }`, `{ type: 1 }` | Standard | Filters ledger by product or movement type. |
| `inventory_movements` | `{ product: 1, createdAt: -1 }`, `{ createdAt: -1 }` | Compound / Sort | Paginated movement history per product or globally. |
| `carts` | `{ user: 1 }`, `{ sessionId: 1 }` | Unique Sparse | At most one cart per user or guest session, allowing `null`/absent values. |
| `orders` | `{ orderNumber: 1 }`, `{ paymentReference: 1 }` | Unique | Fast order lookup and payment reference matching. |
| `orders` | `{ user: 1, createdAt: -1 }` | Compound | Customer order history sorted newest-first. |
| `orders` | `{ paymentStatus: 1, fulfilmentStatus: 1, createdAt: -1 }` | Compound | Admin order filtering and dashboard revenue aggregations. |
| `orders` | `{ paymentExpiresAt: 1 }` | Partial (`paymentStatus: 'pending'`) | Finds unpaid pending orders with elapsed windows. |
| `orders` | `{ user: 1, idempotencyKey: 1 }` | Unique Partial (`$type: 'string'`) | Enforces per-user checkout idempotency while allowing orders without a key. |
| `payments` | `{ paymentReference: 1 }` | Unique | Prevents duplicate attempt references (`E11000` protection). |
| `payments` | `{ chainId: 1, transactionHash: 1 }` | Unique Partial (`$type: 'string'`) | Blocks tx-hash replay across orders while allowing `pending` attempts without a hash. |
| `payments` | `{ order: 1, attemptNumber: -1 }` | Compound | Retrieves the latest payment attempt for an order. |
| `payments` | `{ orderPaymentReference: 1 }` | Standard | Groups all attempts under an order's payment reference. |
| `payments` | `{ verificationStatus: 1, expiresAt: 1 }` | Compound | Queries pending/expired payment attempts. |

---

## 6. Transactions & Data Integrity

- **Overselling prevention (`reserveStock`):** `MongoProductRepository.reserveStock()` executes an atomic conditional `findOneAndUpdate` requiring `stock - reservedStock >= quantity` before incrementing `reservedStock`, ensuring concurrent checkouts cannot oversell.
- **MongoDB transactions with standalone fallback:** `PaymentsService` and `AdminPaymentsService` wrap multi-collection updates (payment verification, expired order stock release, and admin reconciliation) in `session.withTransaction()`. If MongoDB is running as a standalone instance without replica-set transaction support (error code `20` / `IllegalOperation`), `executeWithOptionalTransaction` falls back to sequential execution.
- **Checkout idempotency:** `OrdersService.checkout()` checks `idempotencyKey` (backed by the unique partial `{ user: 1, idempotencyKey: 1 }` index) so retried checkout requests return the existing order instead of double-reserving stock.
- **Payment retry handling & concurrency:** `PaymentsService.initiatePayment()` reuses an existing `pending`/`confirming` attempt, increments `attemptNumber` with a fresh `paymentReference` after terminal rejections, and catches `E11000` duplicate-key races gracefully.
- **Cancellation & expiration stock release:** Both `OrdersService.cancelOrder()` and `PaymentsService` expiry handlers atomically transition the order to `cancelled`/`expired`, set `stockReserved: false`, and call `ProductsService.releaseStock()`.
- **Admin reconciliation:** `AdminPaymentsService.reconcileTransaction()` runs inside `executeWithOptionalTransaction` to either re-reserve stock and mark an expired order `paid` (`fulfill`) or record `refundTxHash` and mark both records `refunded` (`refund`).
