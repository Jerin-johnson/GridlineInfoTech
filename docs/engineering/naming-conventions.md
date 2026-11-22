# Naming Conventions

## 1. Purpose

This document defines naming conventions used throughout the Automotive E-Commerce Platform.

Consistent naming improves code readability, discoverability, maintainability, and collaboration.

## 2. General Rules

- Use descriptive and meaningful names.
- Avoid unnecessary abbreviations.
- Names should clearly communicate their purpose.
- Prefer clarity over overly short names.
- Follow the established convention for each type of code entity.

## 3. Files and Directories

Use `kebab-case` for file and directory names.

### Examples

```text
product-card.tsx
product-service.ts
auth-middleware.ts
order-management/
payment-verification.ts
```

Avoid:

```text
ProductCard.tsx
productService.ts
AuthMiddleware.ts
```

## 4. Variables and Functions

Use `camelCase`.

### Variables

```typescript
const productPrice = 1200;
const cartItems = [];
const isAuthenticated = true;
```

### Functions

```typescript
function calculateOrderTotal() {}

function getProductById() {}

function validateCheckout() {}
```

Boolean variables should generally use descriptive prefixes such as:

```typescript
isAvailable;
hasStock;
canCheckout;
shouldRedirect;
```

## 5. Classes, Types, and Interfaces

Use `PascalCase`.

### Classes

```typescript
class ProductService {}

class OrderRepository {}

class PaymentVerificationService {}
```

### Interfaces

```typescript
interface Product {}

interface CreateOrderRequest {}

interface PaymentVerificationResult {}
```

### Types

```typescript
type UserRole = "CUSTOMER" | "ADMIN";

type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED";
```

## 6. React Components

Use `PascalCase` for component names.

```tsx
function ProductCard() {}

function ProductDetails() {}

function ShoppingCart() {}
```

Component filenames should use `kebab-case`.

```text
product-card.tsx
product-details.tsx
shopping-cart.tsx
```

## 7. Constants

Use `UPPER_SNAKE_CASE` for constants representing fixed values.

```typescript
const MAX_CART_QUANTITY = 10;
const DEFAULT_PAGE_SIZE = 20;
const ACCESS_TOKEN_EXPIRY = 15;
```

## 8. Database Naming

### Collection Names

Use lowercase plural nouns.

```text
users
products
categories
brands
orders
payments
inventory_movements
```

### Database Fields

Use `camelCase`.

```typescript
{
  firstName: "John",
  lastName: "Doe",
  createdAt: new Date(),
  updatedAt: new Date()
}
```

## 9. API Naming

API endpoints should:

- Use lowercase.
- Use plural resource names.
- Use RESTful conventions.
- Use kebab-case for multi-word resource names.
- Include API versioning.

### Examples

```http
/api/v1/products
/api/v1/orders
/api/v1/categories
/api/v1/payment-methods
/api/v1/inventory-movements
```

## 10. Environment Variables

Use `UPPER_SNAKE_CASE`.

```env
DATABASE_URL=
JWT_SECRET=
ACCESS_TOKEN_EXPIRY=
CLOUDINARY_API_KEY=
```

## 11. Git Branch Names

Use lowercase kebab-case with a descriptive prefix.

```text
feat/product-catalog
feat/user-authentication
fix/cart-validation
hotfix/payment-verification
```

## 12. Summary

| Entity                | Convention           | Example                   |
| --------------------- | -------------------- | ------------------------- |
| Files                 | kebab-case           | `product-service.ts`      |
| Directories           | kebab-case           | `product-management/`     |
| Variables             | camelCase            | `productPrice`            |
| Functions             | camelCase            | `calculateTotal()`        |
| Classes               | PascalCase           | `ProductService`          |
| Interfaces            | PascalCase           | `CreateProductRequest`    |
| Types                 | PascalCase           | `PaymentStatus`           |
| Components            | PascalCase           | `ProductCard`             |
| Component files       | kebab-case           | `product-card.tsx`        |
| Constants             | UPPER_SNAKE_CASE     | `MAX_CART_QUANTITY`       |
| Collections           | lowercase plural     | `products`                |
| DB fields             | camelCase            | `createdAt`               |
| API paths             | lowercase/kebab-case | `/payment-methods`        |
| Branches              | lowercase kebab-case | `feature/product-catalog` |
| Environment variables | UPPER_SNAKE_CASE     | `DATABASE_URL`            |
