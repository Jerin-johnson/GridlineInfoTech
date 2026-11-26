import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
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

  async findRelated(
    productId: string,
    categoryId: string,
    brandId: string,
    limit = 4,
  ): Promise<ProductDocument[]> {
    return this.productModel
      .find({
        _id: { $ne: new Types.ObjectId(productId) },
        status: { $in: ['published', 'out_of_stock'] },
        $or: [
          { category: new Types.ObjectId(categoryId) },
          { brand: new Types.ObjectId(brandId) },
        ],
      })
      .populate('category', 'name slug image status')
      .populate('brand', 'name slug logo status')
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(limit)
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

  async reserveStock(
    productId: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await this.productModel.updateOne(
      {
        _id: new Types.ObjectId(productId),
        status: 'published',
        $expr: {
          $gte: [{ $subtract: ['$stock', '$reservedStock'] }, quantity],
        },
      },
      { $inc: { reservedStock: quantity } },
      { session },
    );
    return result.modifiedCount === 1;
  }

  async releaseStock(
    productId: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await this.productModel.updateOne(
      {
        _id: new Types.ObjectId(productId),
        reservedStock: { $gte: quantity },
      },
      { $inc: { reservedStock: -quantity } },
      { session },
    );
    return result.modifiedCount === 1;
  }

  async confirmStockDeduction(
    productId: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await this.productModel.updateOne(
      {
        _id: new Types.ObjectId(productId),
        stock: { $gte: quantity },
        reservedStock: { $gte: quantity },
      },
      { $inc: { stock: -quantity, reservedStock: -quantity } },
      { session },
    );
    return result.modifiedCount === 1;
  }
}
