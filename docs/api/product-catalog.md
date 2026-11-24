# Product Catalog API Documentation

The Product Catalog API provides comprehensive catalog management and discovery for the Automotive E-Commerce Platform.

- **Base URL:** `/api/v1`
- **Architecture:** Controller → Service → Repository (interface-driven) → MongoDB
- **Security:** JWT Authentication + Role-Based Authorization (`RolesGuard`)

---

## 1. Authentication & Authorization

| Role / Scope | Description |
| ------------ | ----------- |
| **Public (`@Public()`)** | Unauthenticated browsing. Catalog search, category listing, brand listing, and product details. |
| **Customer** | Authenticated customer. Can browse public routes, but management routes return `403 Forbidden`. |
| **Admin (`@Roles('admin')`)** | Full administrative privileges for creating, updating, archiving, and uploading assets. |

### Error Responses

- **401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Authentication required",
  "error": "Unauthorized"
}
```

- **403 Forbidden:**
```json
{
  "statusCode": 403,
  "message": "Access denied: insufficient permissions for this resource",
  "error": "Forbidden"
}
```

---

## 2. Core Business Rules

1. **Pricing in Minor Units:** All monetary values (`price`, `compareAtPrice`, `minPrice`, `maxPrice`) are stored and transmitted in **integer minor units (cents)**. For example, `1999` represents **\$19.99**.
2. **Stock & Availability:** Available stock is computed dynamically as:
   $$\text{availableStock} = \max(0, \text{stock} - \text{reservedStock})$$
3. **Soft Deletions:** Categories and Brands transition to `status: 'inactive'`, and Products transition to `status: 'archived'`. No hard deletion is executed to maintain transactional and order history integrity.
4. **Unique Slugs & SKUs:** Slugs are auto-generated and lowercase. SKUs are uppercase. Both are strictly unique.

---

## 3. Categories Endpoints

### 3.1 List Categories
- **Route:** `GET /api/v1/categories`
- **Auth:** Public
- **Query Parameters:**
  - `status`: `'active'` (default) or `'inactive'`
  - `parent`: Category ID (or `'null'` for top-level root categories)
- **Response `200 OK`:**
```json
{
  "message": "Categories retrieved successfully",
  "data": [
    {
      "_id": "6740...01",
      "name": "Wheels & Tires",
      "slug": "wheels-tires",
      "description": "High-performance wheels and tires",
      "image": "https://example.com/wheels.jpg",
      "parent": null,
      "status": "active",
      "createdAt": "2026-11-23T10:00:00.000Z",
      "updatedAt": "2026-11-23T10:00:00.000Z"
    }
  ]
}
```

### 3.2 Get Category by ID
- **Route:** `GET /api/v1/categories/:id`
- **Auth:** Public

### 3.3 Get Category by Slug
- **Route:** `GET /api/v1/categories/slug/:slug`
- **Auth:** Public

### 3.4 Create Category
- **Route:** `POST /api/v1/categories`
- **Auth:** Admin
- **Request Body:**
```json
{
  "name": "Exhaust Systems",
  "slug": "exhaust-systems",
  "description": "Cat-back and axle-back exhausts",
  "image": "https://example.com/exhaust.jpg",
  "parent": null,
  "status": "active"
}
```
- **Response `201 Created`**

### 3.5 Update Category
- **Route:** `PATCH /api/v1/categories/:id`
- **Auth:** Admin
- **Request Body:** Partial `CreateCategoryDto`

### 3.6 Deactivate Category
- **Route:** `DELETE /api/v1/categories/:id`
- **Auth:** Admin
- **Response `200 OK`** (sets status to `'inactive'`)

---

## 4. Brands Endpoints

### 4.1 List Brands
- **Route:** `GET /api/v1/brands`
- **Auth:** Public
- **Query Parameters:** `status` (`'active'` default)

### 4.2 Get Brand by ID / Slug
- **Route:** `GET /api/v1/brands/:id`
- **Route:** `GET /api/v1/brands/slug/:slug`
- **Auth:** Public

### 4.3 Create Brand
- **Route:** `POST /api/v1/brands`
- **Auth:** Admin
- **Request Body:**
```json
{
  "name": "Brembo",
  "slug": "brembo",
  "logo": "https://example.com/brembo-logo.png",
  "description": "World leader in performance automotive braking systems"
}
```

### 4.4 Update / Deactivate Brand
- **Route:** `PATCH /api/v1/brands/:id`
- **Route:** `DELETE /api/v1/brands/:id`
- **Auth:** Admin

---

## 5. Products Endpoints

### 5.1 Search & List Products (Catalog)
- **Route:** `GET /api/v1/products`
- **Auth:** Public
- **Query Parameters:**
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `12`, max: `100`)
  - `search`: Keyword for MongoDB text search on `name`, `sku`, `description`
  - `category`: Filter by Category ID
  - `brand`: Filter by Brand ID
  - `minPrice`: Minimum price in cents (e.g. `5000` = \$50.00)
  - `maxPrice`: Maximum price in cents
  - `inStockOnly`: `true` to filter items where `stock - reservedStock > 0`
  - `isFeatured`: `true` or `false`
  - `status`: `'draft'` | `'published'` | `'out_of_stock'` | `'archived'` (Admin only. Public/Customer queries are restricted to published/out-of-stock items; non-admin querying `draft` or `archived` returns `403 Forbidden`)
  - `sortBy`: `'price'` | `'createdAt'` | `'name'` | `'stock'` (default: `'createdAt'`)
  - `sortOrder`: `'asc'` | `'desc'` (default: `'desc'`)
- **Response `200 OK`:**
```json
{
  "message": "Products retrieved successfully",
  "data": [
    {
      "_id": "6740...10",
      "name": "Brembo GT Big Brake Kit",
      "slug": "brembo-gt-big-brake-kit",
      "sku": "BRM-GT-380",
      "description": "6-piston monobloc front brake system with 380mm drilled rotors",
      "category": {
        "_id": "6740...01",
        "name": "Braking Systems",
        "slug": "braking-systems"
      },
      "brand": {
        "_id": "6740...02",
        "name": "Brembo",
        "slug": "brembo"
      },
      "price": 385000,
      "compareAtPrice": 420000,
      "currency": "USD",
      "images": [
        {
          "url": "https://res.cloudinary.com/.../brake.jpg",
          "publicId": "gridline/products/brake_1",
          "alt": "Brembo GT Big Brake Kit Front View",
          "isPrimary": true,
          "sortOrder": 0
        }
      ],
      "specifications": [
        { "key": "Piston Count", "value": "6" },
        { "key": "Rotor Diameter", "value": "380 mm" }
      ],
      "compatibility": [
        {
          "make": "Porsche",
          "model": "911 Carrera",
          "yearFrom": 2018,
          "yearTo": 2024
        }
      ],
      "stock": 14,
      "reservedStock": 2,
      "availableStock": 12,
      "lowStockThreshold": 3,
      "status": "published",
      "isFeatured": true,
      "createdAt": "2026-11-23T11:00:00.000Z",
      "updatedAt": "2026-11-23T11:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

### 5.2 Get Product Details
- **Route:** `GET /api/v1/products/:id`
- **Route:** `GET /api/v1/products/slug/:slug`
- **Auth:** Public

### 5.3 Get Related Products
- **Route:** `GET /api/v1/products/:id/related`
- **Auth:** Public
- **Query Parameters:** `limit` (default: `4`, max: `20`)
- **Response `200 OK`:** Returns array of products in the same category or brand, excluding the current product, sorted by featured/newest.

### 5.4 Create Product
- **Route:** `POST /api/v1/products`
- **Auth:** Admin
- **Request Body:** `CreateProductDto` (validates active category and brand existence)

### 5.5 Update Product
- **Route:** `PATCH /api/v1/products/:id`
- **Auth:** Admin

### 5.6 Archive Product (Soft Deletion)
- **Route:** `DELETE /api/v1/products/:id`
- **Auth:** Admin

### 5.7 Upload Product Image
- **Route:** `POST /api/v1/products/:id/images`
- **Auth:** Admin
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `image`: Binary file (`.jpg`, `.png`, `.webp`, max 5MB)
  - `alt`: Optional string description
  - `isPrimary`: Optional boolean
- **Response `201 Created`:** Returns updated product document with image uploaded to Cloudinary.

### 5.8 Remove Product Image
- **Route:** `DELETE /api/v1/products/:id/images`
- **Auth:** Admin
- **Request Body:**
```json
{
  "publicId": "gridline/products/brake_1"
}
```

---

## 6. Storage & Cloudinary Configuration

Configure these environment variables in your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

If Cloudinary credentials are omitted in development or unit tests, the server defaults to mock upload mode, returning valid asset metadata without throwing connection errors.

---

## 7. Database Seeding

To seed realistic automotive categories, brands, products, and demo accounts:

```bash
npm run seed:catalog
```

### Seeded Credentials
- **Admin:** `admin@gridline.com` / `Admin@123456`
- **Customer:** `customer@gridline.com` / `Customer@123456`

