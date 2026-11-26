export interface CatalogImage {
  url: string;
  publicId?: string;
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface CatalogSpecification {
  key: string;
  value: string;
}

export interface CatalogCompatibility {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  notes?: string;
}

export interface CatalogCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent?: string | null;
  status: "active" | "inactive";
}

export interface CatalogBrand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  status: "active" | "inactive";
}

export interface CatalogProduct {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  category: CatalogCategory | string;
  brand: CatalogBrand | string;
  price: number; // Integer minor units (cents)
  compareAtPrice?: number;
  currency: string;
  images: CatalogImage[];
  specifications: CatalogSpecification[];
  compatibility: CatalogCompatibility[];
  stock: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  status: "draft" | "published" | "out_of_stock" | "archived";
  isFeatured: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedProductsResponse {
  message: string;
  data: CatalogProduct[];
  meta: CatalogPaginationMeta;
}

export interface CategoriesResponse {
  message: string;
  data: CatalogCategory[];
}

export interface BrandsResponse {
  message: string;
  data: CatalogBrand[];
}

export type CatalogSortOption =
  | "featured"
  | "newest"
  | "price_asc"
  | "price_desc";

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  isFeatured?: boolean;
  sortBy?: "price" | "createdAt" | "name" | "stock";
  sortOrder?: "asc" | "desc";
}
