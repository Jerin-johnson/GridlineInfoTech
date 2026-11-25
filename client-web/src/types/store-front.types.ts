export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  tagline: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brandName: string;
  categoryName: string;
  price: number;
  stock: number;
  image: string;
  fitment: string;
}

export interface LandingPageData {
  brands: BrandSummary[];
  categories: CategorySummary[];
  featuredProducts: ProductSummary[];
}
