# User Profile & Address Management API Documentation

The Users API provides authenticated user profile management and delivery address book management for the Automotive E-Commerce Platform.

- **Base URL:** `/api/v1/users`
- **Architecture:** Controller → Service → Repository (interface-driven `IUserRepository`) → MongoDB
- **Security:** JWT Authentication (`JwtAuthGuard`) required for all user profile and address operations. The user identity is derived exclusively from the authenticated JWT token (`@CurrentUser('sub')`).

---

## 1. Core Business Rules

1. **Strict User Identity Derivation:** User IDs are never trusted from client inputs (path, query, or body). All operations implicitly and securely target the currently authenticated user based on `@CurrentUser('sub')`.
2. **Safe Profile Sanitization:**
   - Sensitive and internal fields such as `passwordHash`, `refreshTokenHash`, `isActive`, `isEmailVerified`, `emailVerificationToken`, and `passwordResetToken` are stripped from responses.
   - Customers may only update permitted profile fields: `firstName`, `lastName`, `phone`, and `avatar`.
   - Whitelist validation (`ValidationPipe` with `forbidNonWhitelisted: true`) strictly rejects attempts to modify `email`, `role`, or status fields with `400 Bad Request`.
3. **Delivery Address Rules:**
   - Addresses are embedded inside the `User` document.
   - Each address is assigned a unique MongoDB `_id` (`Types.ObjectId`).
   - **Single Default Invariant:** A user can have at most one default address (`isDefault: true`).
   - **Auto-Default First Address:** If a user adds their very first address, it is automatically marked as default regardless of the input flag.
   - **Default Switching:** Marking an address as default automatically unsets `isDefault: false` on any previously default address.
   - **Default Address Deletion:** When the current default address is deleted, if any addresses remain, the first remaining address is automatically promoted to default.
4. **Ownership Isolation:** Address operations (`PATCH /addresses/:id`, `DELETE /addresses/:id`, `PATCH /addresses/:id/default`) strictly search within the authenticated user's address array. Attempts to modify another user's address safely return `404 Not Found`.

---

## 2. Profile Endpoints

### 2.1 Get Current User Profile
- **Route:** `GET /api/v1/users/me`
- **Auth:** Authenticated (`Bearer <token>` or HttpOnly cookie)
- **Response `200 OK`:**
```json
{
  "message": "User profile retrieved successfully",
  "data": {
    "id": "6740a1b2c3d4e5f678901001",
    "email": "customer@gridline.com",
    "firstName": "Alex",
    "lastName": "Vance",
    "phone": "+1-555-0199",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
    "role": "customer",
    "createdAt": "2026-11-20T10:00:00.000Z",
    "updatedAt": "2026-11-24T12:00:00.000Z"
  }
}
```

### 2.2 Update Current User Profile
- **Route:** `PATCH /api/v1/users/me`
- **Auth:** Authenticated
- **Request Body (all optional):**
```json
{
  "firstName": "Alexander",
  "lastName": "Vance",
  "phone": "+1-555-0100",
  "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb"
}
```
- **Response `200 OK`:** Returns sanitized updated profile object.
- **Error Responses:**
  - `400 Bad Request`: If non-whitelisted fields (e.g. `role`, `email`, `isActive`) are submitted or fields fail validation.
  - `401 Unauthorized`: When authentication token is missing or invalid.
  - `404 Not Found`: If user record does not exist.

---

## 3. Address Endpoints

### 3.1 Get User Addresses
- **Route:** `GET /api/v1/users/me/addresses`
- **Auth:** Authenticated
- **Response `200 OK`:**
```json
{
  "message": "Addresses retrieved successfully",
  "data": [
    {
      "id": "6740a1b2c3d4e5f678901aa1",
      "label": "Home",
      "fullName": "Alex Vance",
      "phone": "+1-555-0199",
      "line1": "742 Evergreen Terrace",
      "line2": "Apt 4B",
      "city": "Springfield",
      "state": "IL",
      "postalCode": "62704",
      "country": "US",
      "isDefault": true
    }
  ]
}
```

### 3.2 Add Delivery Address
- **Route:** `POST /api/v1/users/me/addresses`
- **Auth:** Authenticated
- **Request Body:**
```json
{
  "label": "Work",
  "fullName": "Alex Vance",
  "phone": "+1-555-0199",
  "line1": "100 Industrial Blvd",
  "line2": "Suite 300",
  "city": "Springfield",
  "state": "IL",
  "postalCode": "62701",
  "country": "US",
  "isDefault": true
}
```
- **Response `201 Created`:**
```json
{
  "message": "Address added successfully",
  "data": {
    "id": "6740a1b2c3d4e5f678901bb2",
    "label": "Work",
    "fullName": "Alex Vance",
    "phone": "+1-555-0199",
    "line1": "100 Industrial Blvd",
    "line2": "Suite 300",
    "city": "Springfield",
    "state": "IL",
    "postalCode": "62701",
    "country": "US",
    "isDefault": true
  }
}
```

### 3.3 Update Delivery Address
- **Route:** `PATCH /api/v1/users/me/addresses/:addressId`
- **Auth:** Authenticated
- **Request Body (all optional):**
```json
{
  "line2": "Building C, Suite 400",
  "phone": "+1-555-9988",
  "isDefault": true
}
```
- **Response `200 OK`:** Returns updated address object.
- **Error Responses:**
  - `400 Bad Request`: Validation failure.
  - `404 Not Found`: If address does not exist or does not belong to the user.

### 3.4 Set Address as Default
- **Route:** `PATCH /api/v1/users/me/addresses/:addressId/default`
- **Auth:** Authenticated
- **Response `200 OK`:**
```json
{
  "message": "Default address updated successfully",
  "data": {
    "id": "6740a1b2c3d4e5f678901aa1",
    "label": "Home",
    "fullName": "Alex Vance",
    "phone": "+1-555-0199",
    "line1": "742 Evergreen Terrace",
    "line2": "Apt 4B",
    "city": "Springfield",
    "state": "IL",
    "postalCode": "62704",
    "country": "US",
    "isDefault": true
  }
}
```

### 3.5 Delete Delivery Address
- **Route:** `DELETE /api/v1/users/me/addresses/:addressId`
- **Auth:** Authenticated
- **Response `200 OK`:**
```json
{
  "message": "Address deleted successfully",
  "data": null
}
```
- **Error Responses:**
  - `404 Not Found`: If address does not exist or does not belong to the user.
