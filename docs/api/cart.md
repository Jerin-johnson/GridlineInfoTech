# Shopping Cart API Documentation

The Cart API provides authenticated shopping cart management for the Automotive E-Commerce Platform.

- **Base URL:** `/api/v1/cart`
- **Architecture:** Controller → Service → Repository (interface-driven) → MongoDB
- **Security:** JWT Authentication (`JwtAuthGuard`) required for all cart operations. User identity is derived exclusively from the authenticated JWT token.

---

## 1. Core Business Rules

1. **Server-Computed Totals:** Product prices and subtotal amounts are **never stored** in the `carts` collection. The server calculates line item totals (`unitPrice * quantity`) and cart subtotals dynamically using live, trusted product prices from the database.
2. **Pricing in Minor Units:** All monetary values (`price`, `itemTotal`, `subtotal`, `total`) are in **integer minor units (cents)**. For example, `385000` represents **$3,850.00**.
3. **Availability & Stock Enforcement:**
   - Products must be `published` to be added or purchased.
   - Requested quantities are checked against available stock (`stock - reservedStock`).
   - If stock falls below cart quantity or a product is archived, the item is dynamically flagged with `isAvailable: false` and excluded from the active subtotal.
4. **Duplicate Item Prevention:** Submitting an existing cart product increments its quantity (bounded by available stock) rather than creating duplicate rows.
5. **Ownership Isolation:** All operations strictly resolve to the authenticated customer's cart derived from `@CurrentUser('sub')`. Cross-user access is impossible.

---

## 2. Endpoints

### 2.1 Get Cart
- **Route:** `GET /api/v1/cart`
- **Auth:** Authenticated (`Bearer <token>` or HttpOnly cookie)
- **Response `200 OK`:**
```json
{
  "message": "Cart retrieved successfully",
  "data": {
    "id": "6740a1b2c3d4e5f678901234",
    "items": [
      {
        "productId": "6740a1b2c3d4e5f678901001",
        "name": "Brembo GT Big Brake Kit - 380mm Front",
        "slug": "brembo-gt-big-brake-kit-380mm-front",
        "sku": "BRM-GT-380",
        "image": "https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?w=1000",
        "price": 385000,
        "quantity": 2,
        "itemTotal": 770000,
        "availableStock": 12,
        "isAvailable": true
      }
    ],
    "itemCount": 1,
    "totalQuantity": 2,
    "subtotal": 770000,
    "estimatedShipping": 0,
    "estimatedTax": 0,
    "total": 770000,
    "currency": "USD"
  }
}
```

### 2.2 Add Item to Cart
- **Route:** `POST /api/v1/cart/items`
- **Auth:** Authenticated
- **Request Body:**
```json
{
  "productId": "6740a1b2c3d4e5f678901001",
  "quantity": 1
}
```
- **Response `200 OK`:** Returns updated cart object with recalculated totals.
- **Error Responses:**
  - `400 Bad Request`: When quantity exceeds available stock or product is out of stock / unavailable.
  - `401 Unauthorized`: When authentication token is missing or invalid.

### 2.3 Update Item Quantity
- **Route:** `PATCH /api/v1/cart/items/:productId`
- **Auth:** Authenticated
- **Request Body:**
```json
{
  "quantity": 3
}
```
- **Response `200 OK`:** Returns updated cart object with recalculated totals.
- **Error Responses:**
  - `400 Bad Request`: If requested quantity exceeds available stock.
  - `404 Not Found`: If item is not in cart.

### 2.4 Remove Item from Cart
- **Route:** `DELETE /api/v1/cart/items/:productId`
- **Auth:** Authenticated
- **Response `200 OK`:** Returns updated cart with item removed.

### 2.5 Clear Entire Cart
- **Route:** `DELETE /api/v1/cart`
- **Auth:** Authenticated
- **Response `200 OK`:**
```json
{
  "message": "Cart cleared successfully",
  "data": {
    "items": [],
    "itemCount": 0,
    "totalQuantity": 0,
    "subtotal": 0,
    "estimatedShipping": 0,
    "estimatedTax": 0,
    "total": 0,
    "currency": "USD"
  }
}
```
