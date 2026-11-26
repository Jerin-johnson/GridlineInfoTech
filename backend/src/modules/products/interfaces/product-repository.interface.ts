import { ClientSession, FilterQuery } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';

export interface ProductQueryResult {
  data: ProductDocument[];
  total: number;
}

export interface IProductRepository {
  create(data: Partial<Product>): Promise<ProductDocument>;
  findById(id: string): Promise<ProductDocument | null>;
  findBySlug(slug: string): Promise<ProductDocument | null>;
  findBySku(sku: string): Promise<ProductDocument | null>;
  findByName(name: string): Promise<ProductDocument | null>;
  findAll(
    filter: FilterQuery<ProductDocument>,
    options: {
      page: number;
      limit: number;
      sort: Record<string, 1 | -1>;
    },
  ): Promise<ProductQueryResult>;
  update(id: string, data: Partial<Product>): Promise<ProductDocument | null>;
  findRelated(
    productId: string,
    categoryId: string,
    brandId: string,
    limit?: number,
  ): Promise<ProductDocument[]>;
  countByCategory(categoryId: string): Promise<number>;
  countByBrand(brandId: string): Promise<number>;
  reserveStock(
    productId: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<boolean>;
  releaseStock(
    productId: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<boolean>;
}
