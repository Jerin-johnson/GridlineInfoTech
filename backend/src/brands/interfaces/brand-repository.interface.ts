import { Brand, BrandDocument } from '../schemas/brand.schema';

export interface IBrandRepository {
  create(data: Partial<Brand>): Promise<BrandDocument>;
  findById(id: string): Promise<BrandDocument | null>;
  findBySlug(slug: string): Promise<BrandDocument | null>;
  findByName(name: string): Promise<BrandDocument | null>;
  findAll(filter?: {
    status?: 'active' | 'inactive';
  }): Promise<BrandDocument[]>;
  update(id: string, data: Partial<Brand>): Promise<BrandDocument | null>;
}
