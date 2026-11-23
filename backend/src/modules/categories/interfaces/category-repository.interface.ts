import { Category, CategoryDocument } from '../schemas/category.schema';

export interface ICategoryRepository {
  create(data: Partial<Category>): Promise<CategoryDocument>;
  findById(id: string): Promise<CategoryDocument | null>;
  findBySlug(slug: string): Promise<CategoryDocument | null>;
  findByName(name: string): Promise<CategoryDocument | null>;
  findAll(filter?: {
    status?: 'active' | 'inactive';
    parent?: string | null;
  }): Promise<CategoryDocument[]>;
  update(id: string, data: Partial<Category>): Promise<CategoryDocument | null>;
  countByParent(parentId: string): Promise<number>;
}
