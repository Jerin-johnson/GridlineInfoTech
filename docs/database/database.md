# Database Documentation

Single-vendor automotive accessories store with crypto (testnet) checkout.

- **Database:** MongoDB (Atlas, replica set) with Mongoose
- **Language:** TypeScript throughout
- **ERD (Eraser):** https://app.eraser.io/workspace/lNmmqjEvwOEUiCNuwypu?origin=share

---

## 1. Why MongoDB

| Reason                  | Detail                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Snapshots fit documents | Orders embed item and address copies, so history stays accurate                                 |
| Flexible nested data    | Product specifications and vehicle fitment vary per product                                     |
| Transactions available  | Atlas replica set supports multi-document transactions for order, stock and payment consistency |
| Fast to build           | Mongoose gives schemas, validation and indexes in TypeScript                                    |

---

## 2. Collections Overview

| Collection            | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `users`               | Customers and admins                               |
| `categories`          | Product grouping (optional parent)                 |
| `brands`              | Manufacturers                                      |
| `products`            | Catalogue and stock                                |
| `carts`               | Logged-in and guest carts                          |
| `orders`              | Purchase records with snapshots and status history |
| `payments`            | Crypto payment attempts and verification           |
| `inventory_movements` | Stock ledger                                       |
| `audit_logs`          | Admin actions and payment overrides                |

### Relationships

```
users 1 ── 1 carts
users 1 ── N orders
users 1 ── N payments
orders 1 ── N payments
orders 1 ── N inventory_movements
categories 1 ── N products
categories 1 ── N categories (parent)
brands 1 ── N products
products 1 ── N inventory_movements
users 1 ── N audit_logs (actor)
```

---

## 3. Core Design Rules

1. **Money in integer minor units** (cents). Never floats.
2. **Token amounts as strings** in base units (wei). Use BigInt on the server.
3. **Snapshots:** orders copy product name, SKU, price, image and the shipping address at purchase time.
4. **Server computes totals** from trusted DB prices. The client never sends the final total.
5. **Two statuses on orders:** `paymentStatus` and `fulfilmentStatus`, plus timestamped `statusHistory`.
6. **Soft delete:** products, brands and categories use a `status` field (`archived`), so old orders never break.
7. **Stock is a ledger:** every stock change writes an `inventory_movements` row.
8. **Idempotency:** unique `paymentReference` and unique `{chainId, transactionHash}`.

---

## 4. Schemas

### 4.1 users

| Field                    | Type      | Notes                          |
| ------------------------ | --------- | ------------------------------ |
| `_id`                    | ObjectId  | PK                             |
| `firstName`              | string    | required                       |
| `lastName`               | string    | required                       |
| `email`                  | string    | unique, lowercase              |
| `passwordHash`           | string    | bcrypt/argon2, `select: false` |
| `authProvider`           | string    | `local` \| `google`            |
| `role`                   | string    | `customer` \| `admin`          |
| `phone`                  | string    | optional                       |
| `avatar`                 | string    | optional URL                   |
| `isActive`               | boolean   | default true                   |
| `isEmailVerified`        | boolean   | default false                  |
| `addresses`              | Address[] | embedded                       |
| `lastLoginAt`            | Date      |                                |
| `createdAt`, `updatedAt` | Date      | timestamps                     |

**Address (embedded):** `label`, `fullName`, `phone`, `line1`, `line2`, `city`, `state`, `postalCode`, `country`, `isDefault`

### 4.2 categories

| Field                    | Type     | Notes                      |
| ------------------------ | -------- | -------------------------- |
| `_id`                    | ObjectId | PK                         |
| `name`                   | string   | required                   |
| `slug`                   | string   | unique                     |
| `description`            | string   |                            |
| `image`                  | string   | URL                        |
| `parent`                 | ObjectId | ref `categories`, optional |
| `status`                 | string   | `active` \| `inactive`     |
| `createdAt`, `updatedAt` | Date     |                            |

### 4.3 brands

| Field                    | Type     | Notes                  |
| ------------------------ | -------- | ---------------------- |
| `_id`                    | ObjectId | PK                     |
| `name`                   | string   | required               |
| `slug`                   | string   | unique                 |
| `logo`                   | string   | URL                    |
| `description`            | string   |                        |
| `status`                 | string   | `active` \| `inactive` |
| `createdAt`, `updatedAt` | Date     |                        |

### 4.4 products

| Field                    | Type             | Notes                                                  |
| ------------------------ | ---------------- | ------------------------------------------------------ |
| `_id`                    | ObjectId         | PK                                                     |
| `name`                   | string           | required                                               |
| `slug`                   | string           | unique                                                 |
| `sku`                    | string           | unique                                                 |
| `description`            | string           |                                                        |
| `category`               | ObjectId         | ref `categories`                                       |
| `brand`                  | ObjectId         | ref `brands`                                           |
| `price`                  | number           | integer minor units                                    |
| `compareAtPrice`         | number           | optional, for discounts                                |
| `currency`               | string           | e.g. `USD`                                             |
| `images`                 | Image[]          | embedded                                               |
| `specifications`         | `{key, value}[]` | embedded                                               |
| `compatibility`          | Fitment[]        | embedded                                               |
| `stock`                  | number           | on-hand, min 0                                         |
| `reservedStock`          | number           | held for pending payments                              |
| `lowStockThreshold`      | number           | default 5                                              |
| `status`                 | string           | `draft` \| `published` \| `out_of_stock` \| `archived` |
| `isFeatured`             | boolean          |                                                        |
| `createdAt`, `updatedAt` | Date             |                                                        |

**Image:** `url`, `publicId`, `alt`, `isPrimary`, `sortOrder`
**Fitment:** `make`, `model`, `yearFrom`, `yearTo`, `notes`

**Available stock** = `stock - reservedStock`.

### 4.5 carts

| Field                    | Type                    | Notes                                |
| ------------------------ | ----------------------- | ------------------------------------ |
| `_id`                    | ObjectId                | PK                                   |
| `user`                   | ObjectId                | ref `users`, nullable, unique sparse |
| `sessionId`              | string                  | guests, unique sparse                |
| `items`                  | `{product, quantity}[]` | prices are never stored here         |
| `expiresAt`              | Date                    | TTL for guest carts                  |
| `createdAt`, `updatedAt` | Date                    |                                      |

### 4.6 orders

| Field                    | Type                                 | Notes                                                                                                            |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `_id`                    | ObjectId                             | PK                                                                                                               |
| `orderNumber`            | string                               | unique, human readable                                                                                           |
| `paymentReference`       | string                               | unique, used to match the on-chain payment                                                                       |
| `user`                   | ObjectId                             | ref `users`                                                                                                      |
| `customerEmail`          | string                               | snapshot                                                                                                         |
| `items`                  | OrderItem[]                          | **snapshot**                                                                                                     |
| `shippingAddress`        | Address                              | **snapshot**                                                                                                     |
| `subtotal`               | number                               | minor units                                                                                                      |
| `shippingCost`           | number                               |                                                                                                                  |
| `taxAmount`              | number                               |                                                                                                                  |
| `totalAmount`            | number                               |                                                                                                                  |
| `currency`               | string                               |                                                                                                                  |
| `paymentStatus`          | string                               | `pending` \| `confirming` \| `paid` \| `failed` \| `expired` \| `refunded`                                       |
| `fulfilmentStatus`       | string                               | `placed` \| `payment_confirmed` \| `processing` \| `shipped` \| `out_for_delivery` \| `delivered` \| `cancelled` |
| `statusHistory`          | `{status, note, actor, changedAt}[]` | tracking timeline                                                                                                |
| `stockReserved`          | boolean                              | true while stock is held                                                                                         |
| `paymentExpiresAt`       | Date                                 | reservation deadline                                                                                             |
| `createdAt`, `updatedAt` | Date                                 |                                                                                                                  |

**OrderItem:** `product`, `name`, `sku`, `image`, `unitPrice`, `quantity`, `lineTotal`

### 4.7 payments

| Field                    | Type     | Notes                               |
| ------------------------ | -------- | ----------------------------------- |
| `_id`                    | ObjectId | PK                                  |
| `order`                  | ObjectId | ref `orders`                        |
| `user`                   | ObjectId | ref `users`                         |
| `paymentReference`       | string   | unique                              |
| `paymentMethod`          | string   | `crypto_wallet`                     |
| `chainId`                | number   | e.g. 11155111 (Sepolia)             |
| `network`                | string   | display name                        |
| `token`                  | string   | e.g. `USDC`                         |
| `tokenAddress`           | string   | contract address                    |
| `tokenDecimals`          | number   |                                     |
| `destinationAddress`     | string   | merchant wallet or payment contract |
| `walletAddress`          | string   | sender                              |
| `transactionHash`        | string   | unique per chain, sparse            |
| `expectedAmount`         | string   | base units (wei)                    |
| `receivedAmount`         | string   | base units                          |
| `blockNumber`            | number   |                                     |
| `confirmations`          | number   |                                     |
| `requiredConfirmations`  | number   | e.g. 3                              |
| `verificationStatus`     | string   | see below                           |
| `failureReason`          | string   |                                     |
| `adminOverride`          | object   | `{overriddenBy, reason, at}`        |
| `expiresAt`              | Date     |                                     |
| `verifiedAt`             | Date     |                                     |
| `createdAt`, `updatedAt` | Date     |                                     |

**verificationStatus:** `pending` \| `confirming` \| `verified` \| `underpaid` \| `overpaid` \| `wrong_token` \| `wrong_network` \| `reverted` \| `expired` \| `failed`

### 4.8 inventory_movements

| Field           | Type     | Notes                                                                         |
| --------------- | -------- | ----------------------------------------------------------------------------- |
| `_id`           | ObjectId | PK                                                                            |
| `product`       | ObjectId | ref `products`                                                                |
| `quantityDelta` | number   | signed, e.g. -2 or +10                                                        |
| `reason`        | string   | `sale` \| `reservation` \| `release` \| `restock` \| `adjustment` \| `return` |
| `order`         | ObjectId | optional                                                                      |
| `actor`         | ObjectId | user or admin                                                                 |
| `balanceAfter`  | number   | stock after the change                                                        |
| `note`          | string   |                                                                               |
| `createdAt`     | Date     |                                                                               |

### 4.9 audit_logs

| Field             | Type     | Notes                                                            |
| ----------------- | -------- | ---------------------------------------------------------------- |
| `_id`             | ObjectId | PK                                                               |
| `actor`           | ObjectId | ref `users`                                                      |
| `action`          | string   | e.g. `payment.override`, `order.status_change`, `product.delete` |
| `entityType`      | string   |                                                                  |
| `entityId`        | ObjectId |                                                                  |
| `before`, `after` | object   | change snapshot                                                  |
| `ip`              | string   |                                                                  |
| `createdAt`       | Date     |                                                                  |

---

## 5. State Flows

### Payment verification

```
pending → confirming → verified
              │
              ├→ underpaid | overpaid | wrong_token | wrong_network
              ├→ reverted
              ├→ expired
              └→ failed
```

### Order

| Event                                   | paymentStatus       | fulfilmentStatus                             |
| --------------------------------------- | ------------------- | -------------------------------------------- |
| Order created, stock reserved           | `pending`           | `placed`                                     |
| Tx submitted, waiting for confirmations | `confirming`        | `placed`                                     |
| Tx verified                             | `paid`              | `payment_confirmed`                          |
| Admin starts packing                    | `paid`              | `processing`                                 |
| Handed to courier                       | `paid`              | `shipped` → `out_for_delivery` → `delivered` |
| Payment window passed                   | `expired`           | `cancelled`                                  |
| Cancelled by admin                      | `paid` / `refunded` | `cancelled`                                  |

Every fulfilment change appends to `statusHistory`. Only forward transitions are allowed, except cancel.

---

## 6. Transactions & Consistency

Use a MongoDB session transaction for the operations below. Everything inside succeeds or fails together.

**Create order**

1. Load cart items and current product prices
2. Check `stock - reservedStock >= quantity` for each item
3. Increase `reservedStock` (conditional update, so it cannot go negative)
4. Insert `inventory_movements` (`reservation`)
5. Insert `orders` with snapshots and `paymentExpiresAt`
6. Insert `payments` with a unique `paymentReference`
7. Clear the cart

**Payment verified**

1. Re-check the payment is not already `verified` (idempotency)
2. Set payment `verified`, order `paid`, append `statusHistory`
3. Decrease `stock` and `reservedStock`, insert `inventory_movements` (`sale`)

**Expiry or failure**

1. Decrease `reservedStock`, insert `inventory_movements` (`release`)
2. Set payment `expired`, order `expired` and `cancelled`

**Overselling guard:** use an atomic conditional update, for example `updateOne({ _id, $expr: { $gte: [{ $subtract: ["$stock", "$reservedStock"] }, qty] } }, { $inc: { reservedStock: qty } })`, and check `modifiedCount === 1`.

---

## 7. Indexing Strategy

### Rules

- Index only for real queries: lists, filters, lookups and background jobs.
- Compound order: **Equality, Sort, Range** (ESR).
- Unique indexes enforce business rules (SKU, slug, tx hash).
- Each index costs write speed and memory, so keep the list tight.
- Confirm with `explain('executionStats')`: look for IXSCAN, not COLLSCAN.

### Index list

| Collection          | Index                                                                          | Purpose                      |
| ------------------- | ------------------------------------------------------------------------------ | ---------------------------- |
| users               | `{ email: 1 }` unique                                                          | Login                        |
| categories          | `{ slug: 1 }` unique; `{ parent: 1 }`                                          | Routing, tree                |
| brands              | `{ slug: 1 }` unique                                                           | Routing                      |
| products            | `{ slug: 1 }` unique; `{ sku: 1 }` unique                                      | Detail page, admin           |
| products            | `{ status: 1, category: 1, price: 1 }`                                         | Category listing, price sort |
| products            | `{ status: 1, brand: 1, price: 1 }`                                            | Brand listing                |
| products            | `{ status: 1, isFeatured: 1 }`                                                 | Homepage featured            |
| products            | text on `name`, `sku`, `description`                                           | Search                       |
| products            | `{ stock: 1 }` partial (status published)                                      | Low-stock card               |
| carts               | `{ user: 1 }` unique sparse; `{ sessionId: 1 }` unique sparse                  | One cart per owner           |
| carts               | `{ expiresAt: 1 }` TTL (`expireAfterSeconds: 0`)                               | Guest cart cleanup           |
| orders              | `{ orderNumber: 1 }` unique; `{ paymentReference: 1 }` unique                  | Lookup, matching             |
| orders              | `{ user: 1, createdAt: -1 }`                                                   | Order history                |
| orders              | `{ paymentStatus: 1, fulfilmentStatus: 1, createdAt: -1 }`                     | Admin filters                |
| orders              | `{ paymentExpiresAt: 1 }` partial (paymentStatus pending)                      | Expiry job                   |
| payments            | `{ paymentReference: 1 }` unique                                               | Idempotency                  |
| payments            | `{ chainId: 1, transactionHash: 1 }` unique, partial (hash is string)          | Block duplicate tx           |
| payments            | `{ order: 1 }`; `{ verificationStatus: 1, expiresAt: 1 }`                      | Order view, verifier worker  |
| inventory_movements | `{ product: 1, createdAt: -1 }`; `{ order: 1 }`                                | Stock history                |
| audit_logs          | `{ entityType: 1, entityId: 1, createdAt: -1 }`; `{ actor: 1, createdAt: -1 }` | Audit lookups                |

### Mongoose example

```ts
productSchema.index({ status: 1, category: 1, price: 1 });
productSchema.index(
  { name: "text", sku: "text", description: "text" },
  { weights: { name: 10, sku: 5, description: 1 } },
);
paymentSchema.index(
  { chainId: 1, transactionHash: 1 },
  {
    unique: true,
    partialFilterExpression: { transactionHash: { $type: "string" } },
  },
);
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### Production handling

- `autoIndex: false` in production. Create indexes through a migration or script.
- Create unique indexes before launch.
- On big collections, build indexes off-peak.

---

## 8. Validation

- **Mongoose:** required fields, enums, min values (`stock >= 0`, `price >= 0`), string trimming, lowercase email and slug.
- **Server (Zod or similar):** validate every request body, ID, query and state transition before touching the DB.
- Never trust client totals, prices or payment success.

---

## 9. Seed Data

The seed script creates:

| Data          | Amount                                                     |
| ------------- | ---------------------------------------------------------- |
| Admin user    | 1 (demo credentials in README, not in repo)                |
| Customer user | 1                                                          |
| Categories    | Wheels, Exhaust, Performance, Lighting, Interior, Exterior |
| Brands        | 5 to 8                                                     |
| Products      | 20 to 30 with images, specs, fitment and stock             |
| Orders        | A few sample orders for dashboard charts                   |

Run: `npm run seed` (safe to re-run, uses upserts by slug/SKU).

---

## 10. Production Checklist

**Database**

- [ ] Atlas replica set, transactions working
- [ ] Automated backups and a tested restore
- [ ] IP allowlist and a least-privilege DB user
- [ ] All indexes created, `autoIndex` off
- [ ] Connection string in env vars only

**Consistency**

- [ ] Order creation and payment verification run inside transactions
- [ ] Reservation uses an atomic conditional update
- [ ] Expiry job releases stock for unpaid orders
- [ ] Unique `paymentReference` and `{chainId, transactionHash}` enforced

**Security**

- [ ] Passwords hashed, `passwordHash` never returned by queries
- [ ] Admin routes check role on the server
- [ ] Admin payment override writes an `audit_logs` entry with a reason
- [ ] No private keys or seed phrases stored anywhere

**Operations**

- [ ] Structured logging, no secrets in logs
- [ ] Slow query monitoring in Atlas
- [ ] Seed and index scripts documented in the README
