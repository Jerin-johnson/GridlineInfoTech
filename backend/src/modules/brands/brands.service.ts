import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { BRAND_REPOSITORY } from './constants/brand.constants';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import type { IBrandRepository } from './interfaces/brand-repository.interface';
import { BrandDocument } from './schemas/brand.schema';

@Injectable()
export class BrandsService {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brandRepository: IBrandRepository,
  ) {}

  async create(dto: CreateBrandDto): Promise<BrandDocument> {
    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);

    const existingSlug = await this.brandRepository.findBySlug(slug);
    if (existingSlug) {
      throw new ConflictException(`Brand slug '${slug}' already exists`);
    }

    const existingName = await this.brandRepository.findByName(dto.name);
    if (existingName) {
      throw new ConflictException(
        `Brand with name '${dto.name}' already exists`,
      );
    }

    return this.brandRepository.create({
      name: dto.name.trim(),
      slug,
      logo: dto.logo?.trim(),
      description: dto.description?.trim(),
      status: dto.status ?? 'active',
    });
  }

  async findAll(filter?: {
    status?: 'active' | 'inactive';
  }): Promise<BrandDocument[]> {
    return this.brandRepository.findAll(filter);
  }

  async findById(id: string): Promise<BrandDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid brand ID format');
    }

    const brand = await this.brandRepository.findById(id);
    if (!brand) {
      throw new NotFoundException(`Brand with ID '${id}' not found`);
    }
    return brand;
  }

  async findBySlug(slug: string): Promise<BrandDocument> {
    const brand = await this.brandRepository.findBySlug(
      slug.toLowerCase().trim(),
    );
    if (!brand) {
      throw new NotFoundException(`Brand with slug '${slug}' not found`);
    }
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto): Promise<BrandDocument> {
    const existing = await this.findById(id);

    if (
      dto.name &&
      dto.name.trim().toLowerCase() !== existing.name.toLowerCase()
    ) {
      const duplicateName = await this.brandRepository.findByName(dto.name);
      if (duplicateName && duplicateName._id.toString() !== id) {
        throw new ConflictException(
          `Brand with name '${dto.name}' already exists`,
        );
      }
    }

    let slug = existing.slug;
    if (dto.slug) {
      slug = this.slugify(dto.slug);
      if (slug !== existing.slug) {
        const duplicateSlug = await this.brandRepository.findBySlug(slug);
        if (duplicateSlug && duplicateSlug._id.toString() !== id) {
          throw new ConflictException(`Brand slug '${slug}' already exists`);
        }
      }
    }

    const updated = await this.brandRepository.update(id, {
      ...(dto.name && { name: dto.name.trim() }),
      slug,
      ...(dto.logo !== undefined && { logo: dto.logo?.trim() }),
      ...(dto.description !== undefined && {
        description: dto.description?.trim(),
      }),
      ...(dto.status && { status: dto.status }),
    });

    if (!updated) {
      throw new NotFoundException(`Brand with ID '${id}' not found`);
    }

    return updated;
  }

  async deactivate(id: string): Promise<BrandDocument> {
    await this.findById(id);

    const updated = await this.brandRepository.update(id, {
      status: 'inactive',
    });

    if (!updated) {
      throw new NotFoundException(`Brand with ID '${id}' not found`);
    }

    return updated;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
