import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { IBrandRepository } from '../interfaces/brand-repository.interface';
import { Brand, BrandDocument } from '../schemas/brand.schema';

@Injectable()
export class MongoBrandRepository implements IBrandRepository {
  constructor(
    @InjectModel(Brand.name)
    private readonly brandModel: Model<BrandDocument>,
  ) {}

  async create(data: Partial<Brand>): Promise<BrandDocument> {
    const created = new this.brandModel(data);
    return created.save();
  }

  async findById(id: string): Promise<BrandDocument | null> {
    return this.brandModel.findById(id).exec();
  }

  async findBySlug(slug: string): Promise<BrandDocument | null> {
    return this.brandModel.findOne({ slug: slug.toLowerCase().trim() }).exec();
  }

  async findByName(name: string): Promise<BrandDocument | null> {
    return this.brandModel
      .findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } })
      .exec();
  }

  async findAll(filter?: {
    status?: 'active' | 'inactive';
  }): Promise<BrandDocument[]> {
    const query: FilterQuery<BrandDocument> = {};
    if (filter?.status) {
      query.status = filter.status;
    }
    return this.brandModel.find(query).sort({ name: 1 }).exec();
  }

  async update(
    id: string,
    data: Partial<Brand>,
  ): Promise<BrandDocument | null> {
    return this.brandModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }
}
