import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  IProductRepository,
  ProductQueryResult,
} from '../interfaces/product-repository.interface';
import { Product, ProductDocument } from '../schemas/product.schema';

@Injectable()
export class MongoProductRepository implements IProductRepository {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(data: Partial<Product>): Promise<ProductDocument> {
    const created = new this.productModel(data);
    return created.save();
  }

  async findById(id: string): Promise<ProductDocument | null> {
    return this.productModel
      .findById(id)
      .populate('category', 'name slug image status')
      .populate('brand', 'name slug logo status')
      .exec();
  }

  async findBySlug(slug: string): Promise<ProductDocument | null> {
    return this.productModel
      .findOne({ slug: slug.toLowerCase().trim() })
      .populate('category', 'name slug image status')
      .populate('brand', 'name slug logo status')
      .exec();
  }

  async findBySku(sku: string): Promise<ProductDocument | null> {
    return this.productModel
      .findOne({ sku: sku.toUpperCase().trim() })
      .populate('category', 'name slug image status')
      .populate('brand', 'name slug logo status')
      .exec();
  }

  async findByName(name: string): Promise<ProductDocument | null> {
    return this.productModel
      .findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } })
      .exec();
  }

  async findAll(
    filter: FilterQuery<ProductDocument>,
    options: {
      page: number;
      limit: number;
      sort: Record<string, 1 | -1>;
    },
  ): Promise<ProductQueryResult> {
    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('category', 'name slug image status')
        .populate('brand', 'name slug logo status')
        .sort(options.sort)
        .skip(skip)
        .limit(options.limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: Partial<Product>,
  ): Promise<ProductDocument | null> {
    return this.productModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate('category', 'name slug image status')
      .populate('brand', 'name slug logo status')
      .exec();
  }

  async countByCategory(categoryId: string): Promise<number> {
    return this.productModel
      .countDocuments({
        category: new Types.ObjectId(categoryId),
        status: { $ne: 'archived' },
      })
      .exec();
  }

  async countByBrand(brandId: string): Promise<number> {
    return this.productModel
      .countDocuments({
        brand: new Types.ObjectId(brandId),
        status: { $ne: 'archived' },
      })
      .exec();
  }
}
