import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CATEGORY_REPOSITORY } from './constants/category.constants';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import type { ICategoryRepository } from './interfaces/category-repository.interface';
import { CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);

    const existingSlug = await this.categoryRepository.findBySlug(slug);
    if (existingSlug) {
      throw new ConflictException(`Category slug '${slug}' already exists`);
    }

    const existingName = await this.categoryRepository.findByName(dto.name);
    if (existingName) {
      throw new ConflictException(
        `Category with name '${dto.name}' already exists`,
      );
    }

    let parentId: Types.ObjectId | null = null;
    if (dto.parent) {
      const parent = await this.categoryRepository.findById(dto.parent);
      if (!parent || parent.status !== 'active') {
        throw new BadRequestException('Parent category not found or inactive');
      }
      parentId = new Types.ObjectId(dto.parent);
    }

    return this.categoryRepository.create({
      name: dto.name.trim(),
      slug,
      description: dto.description?.trim(),
      image: dto.image?.trim(),
      parent: parentId,
      status: dto.status ?? 'active',
    });
  }

  async findAll(filter?: {
    status?: 'active' | 'inactive';
    parent?: string | null;
  }): Promise<CategoryDocument[]> {
    return this.categoryRepository.findAll(filter);
  }

  async findById(id: string): Promise<CategoryDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID format');
    }

    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return category;
  }

  async findBySlug(slug: string): Promise<CategoryDocument> {
    const category = await this.categoryRepository.findBySlug(
      slug.toLowerCase().trim(),
    );
    if (!category) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    const existing = await this.findById(id);

    if (
      dto.name &&
      dto.name.trim().toLowerCase() !== existing.name.toLowerCase()
    ) {
      const duplicateName = await this.categoryRepository.findByName(dto.name);
      if (duplicateName && duplicateName._id.toString() !== id) {
        throw new ConflictException(
          `Category with name '${dto.name}' already exists`,
        );
      }
    }

    let slug = existing.slug;
    if (dto.slug) {
      slug = this.slugify(dto.slug);
      if (slug !== existing.slug) {
        const duplicateSlug = await this.categoryRepository.findBySlug(slug);
        if (duplicateSlug && duplicateSlug._id.toString() !== id) {
          throw new ConflictException(`Category slug '${slug}' already exists`);
        }
      }
    }

    let parentId = existing.parent;
    if (dto.parent !== undefined) {
      if (dto.parent === null || dto.parent === '') {
        parentId = null;
      } else {
        if (dto.parent === id) {
          throw new BadRequestException('A category cannot be its own parent');
        }
        const parent = await this.categoryRepository.findById(dto.parent);
        if (!parent || parent.status !== 'active') {
          throw new BadRequestException(
            'Parent category not found or inactive',
          );
        }
        // Prevent circular hierarchy by walking ancestors
        let cursor: CategoryDocument | null = parent;
        let depth = 0;
        while (cursor?.parent && depth < 10) {
          const ancestorId = cursor.parent.toString();
          if (ancestorId === id) {
            throw new BadRequestException(
              'Circular category hierarchy is not allowed',
            );
          }
          cursor = await this.categoryRepository.findById(ancestorId);
          depth += 1;
        }
        parentId = new Types.ObjectId(dto.parent);
      }
    }

    const updated = await this.categoryRepository.update(id, {
      ...(dto.name && { name: dto.name.trim() }),
      slug,
      ...(dto.description !== undefined && {
        description: dto.description?.trim(),
      }),
      ...(dto.image !== undefined && { image: dto.image?.trim() }),
      parent: parentId,
      ...(dto.status && { status: dto.status }),
    });

    if (!updated) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    return updated;
  }

  async deactivate(id: string): Promise<CategoryDocument> {
    await this.findById(id);

    const childCount = await this.categoryRepository.countByParent(id);
    if (childCount > 0) {
      throw new ConflictException(
        `Cannot deactivate category: ${childCount} active child category(ies) depend on it`,
      );
    }

    const updated = await this.categoryRepository.update(id, {
      status: 'inactive',
    });

    if (!updated) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
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
