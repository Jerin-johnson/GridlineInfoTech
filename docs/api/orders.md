# Checkout & Orders API Documentation

The Checkout & Orders API provides authenticated order placement, order history retrieval, order detail inspection, and order cancellation for the Automotive E-Commerce Platform.

- **Base URLs:** `/api/v1/checkout`, `/api/v1/orders`
- **Architecture:** Controller → Service → Repository (`IOrderRepository`) → MongoDB
- **Security:** JWT Authentication (`JwtAuthGuard`) required for all endpoints. User identity is derived exclusively from the authenticated JWT token (`@CurrentUser('sub')`).

---

## 1. Core Business Rules

1. **Server-Side Price & Total Calculation:** Frontend prices, totals, product details, and stock are never trusted. At checkout, the backend revalidates every cart item against live `ProductsService` records and calculates `unitPrice`, `lineTotal`, `subtotal`, `shippingCost`, `taxAmount`, and `totalAmount` in integer minor units (cents).
2. **Address Ownership Isolation:** The selected `addressId` must belong to the authenticated user's embedded `addresses` book. Unowned or missing addresses return `404 Not Found`.
3. **Immutable Order Snapshots:** Product details (`name`, `sku`, `slug`, `image`, `unitPrice`, `quantity`, `lineTotal`), `customerEmail`, and `shippingAddress` are snapshotted into the `orders` collection at order creation time to preserve historical accuracy.
4. **Atomic Stock Reservation & Overselling Guard:** Stock is reserved atomically using a conditional update (`stock - reservedStock >= quantity` on `published` products). Multi-document MongoDB transactions are used when supported (replica sets), with automatic compensating stock release on failure.
5. **Payment Status Integrity:** Orders created at checkout always start with `paymentStatus: "pending"` and `fulfilmentStatus: "placed"`, with a 30-minute `paymentExpiresAt` reservation window. Payment is never marked as `paid` during checkout.
6. **Duplicate Checkout Protection:** Optional `idempotencyKey` is uniquely indexed per user (`{ user, idempotencyKey }`). Duplicate submissions with the same key return `409 Conflict`.

---

## 2. Order & Payment Lifecycles

### 2.1 Payment Statuses
- `pending`: Order created, awaiting cryptocurrency wallet payment.
- `confirming`: Transaction submitted on-chain, awaiting required block confirmations.
- `paid`: Payment verified on the backend.
- `failed`: Payment verification failed or transaction reverted.
- `expired`: Payment window (`paymentExpiresAt`) elapsed without payment.
- `refunded`: Payment refunded.

### 2.2 Fulfilment Statuses
- `placed`: Initial state upon checkout (stock reserved).
- `payment_confirmed`: Payment verified.
- `processing`: Admin preparing/packing order.
- `shipped`: Handed to courier.
- `out_for_delivery`: Out for final delivery.
- `delivered`: Delivered to customer.
- `cancelled`: Order cancelled.

### 2.3 Customer Cancellation Rules
Customers may cancel an order (`POST /api/v1/orders/:orderId/cancel`) **only when**:
- `fulfilmentStatus` is `"placed"`, **AND**
- `paymentStatus` is `"pending"` or `"failed"`.

Orders in `"confirming"`, `"paid"`, `"processing"`, `"shipped"`, `"out_for_delivery"`, `"delivered"`, or `"cancelled"` states cannot be cancelled by the customer (`400 Bad Request`). When cancelled, reserved stock is atomically released (`stockReserved: false`) and a `"cancelled"` entry is appended to `statusHistory`.

---

## 3. Endpoints

### 3.1 Checkout (Create Order)
- **Route:** `POST /api/v1/checkout`
- **Auth:** Authenticated (`Bearer <token>` or HttpOnly cookie)
- **Request Body (`CheckoutDto`):**
```json
{
  "addressId": "6740a1b2c3d4e5f678901aa1",
  "notes": "Please call upon arrival",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}
```
  - `addressId` (required): Valid MongoDB ObjectId of a delivery address owned by the user.
  - `notes` (optional): String, max 500 characters.
  - `idempotencyKey` (optional): String, max 128 characters.

- **Response `201 Created`:**
```json
{
  "message": "Order created successfully",
  "data": {
    "id": "6740a1b2c3d4e5f678902001",
    "orderNumber": "ORD-20261126-A1B2C3",
    "paymentReference": "PAY-9F8E7D6C5B4A3210",
    "customerEmail": "alex@gridline.com",
    "items": [
      {
        "productId": "6740a1b2c3d4e5f678901001",
        "name": "Brembo GT Big Brake Kit - 380mm Front",
        "sku": "BRM-GT-380",
        "slug": "brembo-gt-big-brake-kit-380mm-front",
        "image": "https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?w=1000",
        "unitPrice": 385000,
        "quantity": 2,
        "lineTotal": 770000
      }
    ],
    "shippingAddress": {
      "addressId": "6740a1b2c3d4e5f678901aa1",
      "label": "Home",
      "fullName": "Alex Vance",
      "phone": "+1-555-0199",
      "line1": "742 Evergreen Terrace",
      "line2": "Apt 4B",
      "city": "Springfield",
      "state": "IL",
      "postalCode": "62704",
      "country": "US"
    },
    "subtotal": 770000,
    "shippingCost": 0,
    "taxAmount": 0,
    "totalAmount": 770000,
    "currency": "USD",
    "paymentMethod": "crypto_wallet",
    "paymentStatus": "pending",
    "fulfilmentStatus": "placed",
    "statusHistory": [
      {
        "status": "placed",
        "note": "Order placed and awaiting payment",
        "actor": "customer",
        "changedAt": "2026-11-26T12:00:00.000Z"
      }
    ],
    "stockReserved": true,
    "paymentExpiresAt": "2026-11-26T12:30:00.000Z",
    "notes": "Please call upon arrival",
    "createdAt": "2026-11-26T12:00:00.000Z",
    "updatedAt": "2026-11-26T12:00:00.000Z"
  }
}
```

- **Error Responses:**
  - `400 Bad Request`: Empty cart, invalid DTO fields, non-whitelisted fields, or unavailable/unpublished product.
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `404 Not Found`: Selected `addressId` does not exist or does not belong to the user.
  - `409 Conflict`: Insufficient stock or duplicate `idempotencyKey`.

---

### 3.2 List Authenticated User's Orders
- **Route:** `GET /api/v1/orders`
- **Auth:** Authenticated
- **Query Parameters (`OrderQueryDto`):**
  - `page` (optional, default `1`, min `1`)
  - `limit` (optional, default `10`, min `1`, max `50`)
  - `fulfilmentStatus` (optional): Filter by fulfilment status.
  - `paymentStatus` (optional): Filter by payment status.
- **Response `200 OK`:**
```json
{
  "message": "Orders retrieved successfully",
  "data": [ /* FormattedOrder[] */ ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: Invalid query parameters.
  - `401 Unauthorized`: Missing or invalid JWT token.

---

### 3.3 Get Order Details
- **Route:** `GET /api/v1/orders/:orderId`
- **Auth:** Authenticated
- **Response `200 OK`:** Returns `{ "message": "Order retrieved successfully", "data": FormattedOrder }`.
- **Error Responses:**
  - `400 Bad Request`: Invalid `orderId` format.
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `404 Not Found`: Order does not exist or belongs to another user.

---

### 3.4 Cancel Order
- **Route:** `POST /api/v1/orders/:orderId/cancel`
- **Auth:** Authenticated
- **Request Body (`CancelOrderDto`, optional):**
```json
{
  "reason": "Changed my mind"
}
```
- **Response `200 OK`:** Returns `{ "message": "Order cancelled successfully", "data": FormattedOrder }` with `fulfilmentStatus: "cancelled"` and `stockReserved: false`.
- **Error Responses:**
  - `400 Bad Request`: Invalid `orderId`, invalid DTO, or order is not in a cancellable state.
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `404 Not Found`: Order does not exist or belongs to another user.
  - `409 Conflict`: Concurrent state change prevented cancellation.
