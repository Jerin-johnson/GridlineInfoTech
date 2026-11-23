import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ICategoryRepository } from '../interfaces/category-repository.interface';
import { Category, CategoryDocument } from '../schemas/category.schema';

@Injectable()
export class MongoCategoryRepository implements ICategoryRepository {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(data: Partial<Category>): Promise<CategoryDocument> {
    const created = new this.categoryModel(data);
    return created.save();
  }

  async findById(id: string): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findById(id)
      .populate('parent', 'name slug status')
      .exec();
  }

  async findBySlug(slug: string): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findOne({ slug: slug.toLowerCase().trim() })
      .populate('parent', 'name slug status')
      .exec();
  }

  async findByName(name: string): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } })
      .exec();
  }

  async findAll(filter?: {
    status?: 'active' | 'inactive';
    parent?: string | null;
  }): Promise<CategoryDocument[]> {
    const query: FilterQuery<CategoryDocument> = {};

    if (filter?.status) {
      query.status = filter.status;
    }

    if (filter?.parent !== undefined) {
      query.parent = filter.parent ? new Types.ObjectId(filter.parent) : null;
    }

    return this.categoryModel
      .find(query)
      .populate('parent', 'name slug status')
      .sort({ name: 1 })
      .exec();
  }

  async update(
    id: string,
    data: Partial<Category>,
  ): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate('parent', 'name slug status')
      .exec();
  }

  async countByParent(parentId: string): Promise<number> {
    return this.categoryModel
      .countDocuments({
        parent: new Types.ObjectId(parentId),
        status: 'active',
      })
      .exec();
  }
}
