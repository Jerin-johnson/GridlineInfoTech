# GridLine / APEX ATELIER — Postman API Documentation

Complete Postman Collection v2.1 for the NestJS backend (`/api/v1`), verified directly against all 16 controllers and DTOs in `backend/src/`.

## Files

- [gridline-api.postman_collection.json](./gridline-api.postman_collection.json) — Importable Postman Collection v2.1 (63 endpoints across 15 folders).

## How to Import into Postman

1. Open **Postman**.
2. Click **Import** (top-left).
3. Select `docs/postman/gridline-api.postman_collection.json`.
4. Confirm the import; the collection **GridLine / APEX ATELIER Ecommerce API (v1)** will appear with pre-configured collection variables.

## Collection Variables

All variables are scoped on the collection (and can be overridden in a Postman Environment):

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `baseUrl` | `http://localhost:3001/api/v1` | Backend API base URL (update port if needed) |
| `accessToken` | *(auto-populated)* | JWT Bearer token saved automatically on `auth/login`, `auth/register`, `auth/google`, `auth/refresh` |
| `refreshToken` | *(auto-populated)* | Refresh token saved automatically on auth responses |
| `userId` | *(auto-populated)* | Authenticated user ID |
| `id`, `slug`, `productId`, `categoryId`, `brandId`, `addressId`, `orderId`, `customerId`, `transactionId` | Sample ObjectIds / slug | Reusable path/body IDs |
| `walletAddress`, `txHash` | Sample EVM values | Sepolia USDC payment initiation and verification |

## Authentication Workflow

1. **Global Guard:** `JwtAuthGuard` is registered globally (`APP_GUARD`) and accepts either:
   - `Authorization: Bearer {{accessToken}}` header (configured at the collection level), **or**
   - HTTP-only cookies (`accessToken`, `refreshToken`) automatically managed by Postman's cookie jar.
2. **Public Endpoints (`@Public()`):** Health check (`/`), `/auth/register`, `/auth/login`, `/auth/google`, `/auth/refresh`, `/payments/config`, and read-only catalog endpoints (`/categories`, `/brands`, `/products`).
3. **Admin Endpoints (`@UseGuards(RolesGuard)` + `@Roles('admin')`):** Sign in via **02 · Auth → Login (Customer or Admin)** using an admin account; the test script automatically stores `accessToken` and `refreshToken` for all subsequent admin requests.
4. **Validation:** `ValidationPipe` runs globally with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true` — unknown properties in request bodies are rejected with `400 Bad Request`.
