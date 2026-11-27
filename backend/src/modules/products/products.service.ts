import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../categories/categories.service';
import { CloudinaryService } from '../uploads/services/cloudinary.service';
import { PRODUCT_REPOSITORY } from './constants/product.constants';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import type { IProductRepository } from './interfaces/product-repository.interface';
import {
  InventoryMovement,
  InventoryMovementDocument,
  InventoryMovementType,
} from './schemas/inventory-movement.schema';
import {
  Product,
  ProductDocument,
  ProductImage,
} from './schemas/product.schema';

export interface FormattedProduct extends Record<string, unknown> {
  availableStock: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly categoriesService: CategoriesService,
    private readonly brandsService: BrandsService,
    private readonly cloudinaryService: CloudinaryService,
    @Optional()
    @InjectModel(InventoryMovement.name)
    private readonly movementModel?: Model<InventoryMovementDocument>,
  ) {}

  async create(dto: CreateProductDto): Promise<FormattedProduct> {
    const category = await this.categoriesService.findById(dto.category);
    if (!category || category.status !== 'active') {
      throw new BadRequestException(
        'Referenced category does not exist or is inactive',
      );
    }

    const brand = await this.brandsService.findById(dto.brand);
    if (!brand || brand.status !== 'active') {
      throw new BadRequestException(
        'Referenced brand does not exist or is inactive',
      );
    }

    const sku = dto.sku.toUpperCase().trim();
    const existingSku = await this.productRepository.findBySku(sku);
    if (existingSku) {
      throw new ConflictException(`Product SKU '${sku}' already exists`);
    }

    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);
    const existingSlug = await this.productRepository.findBySlug(slug);
    if (existingSlug) {
      throw new ConflictException(`Product slug '${slug}' already exists`);
    }

    const stock = dto.stock ?? 0;
    const reservedStock = dto.reservedStock ?? 0;

    let status = dto.status ?? 'draft';
    if (status === 'published' && stock <= 0) {
      status = 'out_of_stock';
    }

    const productData: Partial<Product> = {
      name: dto.name.trim(),
      slug,
      sku,
      description: dto.description?.trim(),
      category: new Types.ObjectId(dto.category),
      brand: new Types.ObjectId(dto.brand),
      price: dto.price,
      compareAtPrice: dto.compareAtPrice,
      currency: dto.currency?.toUpperCase() ?? 'USD',
      images: (dto.images ?? []).map((img, index) => ({
        url: img.url.trim(),
        publicId: img.publicId?.trim(),
        alt: img.alt?.trim(),
        isPrimary: img.isPrimary ?? index === 0,
        sortOrder: img.sortOrder ?? index,
      })),
      specifications: (dto.specifications ?? []).map((s) => ({
        key: s.key.trim(),
        value: s.value.trim(),
      })),
      compatibility: (dto.compatibility ?? []).map((c) => ({
        make: c.make.trim(),
        model: c.model.trim(),
        yearFrom: c.yearFrom,
        yearTo: c.yearTo,
        notes: c.notes?.trim(),
      })),
      stock,
      reservedStock,
      lowStockThreshold: dto.lowStockThreshold ?? 5,
      status,
      isFeatured: dto.isFeatured ?? false,
    };

    const created = await this.productRepository.create(productData);
    if (stock > 0 && this.movementModel) {
      await this.recordMovement({
        productId: created._id.toString(),
        type: 'initial_stock',
        quantity: stock,
        delta: stock,
        previousStock: 0,
        resultingStock: stock,
        previousReservedStock: 0,
        resultingReservedStock: reservedStock,
        reason: 'Initial product stock on creation',
      });
    }
    const populated = await this.productRepository.findById(
      created._id.toString(),
    );
    return this.formatProduct(populated || created);
  }

  async findById(id: string): Promise<FormattedProduct> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID format');
    }

    const product = await this.productRepository.findById(id);
    if (!product || product.status === 'archived') {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return this.formatProduct(product);
  }

  async findBySlug(slug: string): Promise<FormattedProduct> {
    const product = await this.productRepository.findBySlug(
      slug.toLowerCase().trim(),
    );
    if (!product || product.status === 'archived') {
      throw new NotFoundException(`Product with slug '${slug}' not found`);
    }

    return this.formatProduct(product);
  }

  async getRelatedProducts(
    idOrSlug: string,
    limit = 4,
  ): Promise<FormattedProduct[]> {
    let product: ProductDocument | null = null;
    if (Types.ObjectId.isValid(idOrSlug)) {
      product = await this.productRepository.findById(idOrSlug);
    }
    if (!product) {
      product = await this.productRepository.findBySlug(idOrSlug);
    }
    if (!product || product.status === 'archived') {
      throw new NotFoundException(`Product '${idOrSlug}' not found`);
    }

    const categoryId = this.extractId(product.category);
    const brandId = this.extractId(product.brand);

    if (!categoryId || !brandId) {
      return [];
    }

    const related = await this.productRepository.findRelated(
      product._id.toString(),
      categoryId,
      brandId,
      limit,
    );

    return related.map((item) => this.formatProduct(item));
  }

  private extractId(entity: unknown): string {
    if (!entity) return '';
    if (entity instanceof Types.ObjectId) return entity.toHexString();
    if (typeof entity === 'string') return entity;
    if (typeof entity === 'object' && entity !== null && '_id' in entity) {
      const id = entity._id;
      if (id instanceof Types.ObjectId) return id.toHexString();
      if (typeof id === 'string') return id;
    }
    return '';
  }

  async update(id: string, dto: UpdateProductDto): Promise<FormattedProduct> {
    const existing = await this.productRepository.findById(id);
    if (!existing || existing.status === 'archived') {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    if (dto.category) {
      const category = await this.categoriesService.findById(dto.category);
      if (!category || category.status !== 'active') {
        throw new BadRequestException(
          'Referenced category does not exist or is inactive',
        );
      }
    }

    if (dto.brand) {
      const brand = await this.brandsService.findById(dto.brand);
      if (!brand || brand.status !== 'active') {
        throw new BadRequestException(
          'Referenced brand does not exist or is inactive',
        );
      }
    }

    let sku = existing.sku;
    if (dto.sku) {
      sku = dto.sku.toUpperCase().trim();
      if (sku !== existing.sku) {
        const duplicateSku = await this.productRepository.findBySku(sku);
        if (duplicateSku && duplicateSku._id.toString() !== id) {
          throw new ConflictException(`Product SKU '${sku}' already exists`);
        }
      }
    }

    let slug = existing.slug;
    if (dto.slug) {
      slug = this.slugify(dto.slug);
      if (slug !== existing.slug) {
        const duplicateSlug = await this.productRepository.findBySlug(slug);
        if (duplicateSlug && duplicateSlug._id.toString() !== id) {
          throw new ConflictException(`Product slug '${slug}' already exists`);
        }
      }
    }

    if (
      dto.stock !== undefined &&
      dto.stock < (existing.reservedStock ?? 0)
    ) {
      throw new BadRequestException(
        `Stock cannot be reduced below reserved quantity (${existing.reservedStock ?? 0})`,
      );
    }

    const updateData: Partial<Product> = {
      ...(dto.name && { name: dto.name.trim() }),
      slug,
      sku,
      ...(dto.description !== undefined && {
        description: dto.description?.trim(),
      }),
      ...(dto.category && { category: new Types.ObjectId(dto.category) }),
      ...(dto.brand && { brand: new Types.ObjectId(dto.brand) }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.compareAtPrice !== undefined && {
        compareAtPrice: dto.compareAtPrice,
      }),
      ...(dto.currency && { currency: dto.currency.toUpperCase() }),
      ...(dto.images && { images: dto.images as Product['images'] }),
      ...(dto.specifications && {
        specifications: dto.specifications,
      }),
      ...(dto.compatibility && {
        compatibility: dto.compatibility,
      }),
      ...(dto.stock !== undefined && { stock: dto.stock }),
      ...(dto.reservedStock !== undefined && {
        reservedStock: dto.reservedStock,
      }),
      ...(dto.lowStockThreshold !== undefined && {
        lowStockThreshold: dto.lowStockThreshold,
      }),
      ...(dto.status && { status: dto.status }),
      ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
    };

    const updated = await this.productRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return this.formatProduct(updated);
  }

  async addImage(
    productId: string,
    file: Express.Multer.File,
    alt?: string,
    isPrimary?: boolean,
  ): Promise<FormattedProduct> {
    const product = await this.findById(productId);
    const uploaded = await this.cloudinaryService.uploadImage(
      file,
      'gridline/products',
    );

    const existingImages = ((product.images as ProductImage[]) || []).slice();
    const shouldBePrimary = isPrimary ?? existingImages.length === 0;

    if (shouldBePrimary) {
      existingImages.forEach((img) => {
        img.isPrimary = false;
      });
    }

    const newImage: ProductImage = {
      url: uploaded.url,
      publicId: uploaded.publicId,
      alt: alt ?? (product.name as string),
      isPrimary: shouldBePrimary,
      sortOrder: existingImages.length,
    };

    existingImages.push(newImage);

    const updated = await this.productRepository.update(productId, {
      images: existingImages,
    });

    if (!updated) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    return this.formatProduct(updated);
  }

  async removeImage(
    productId: string,
    publicId: string,
  ): Promise<FormattedProduct> {
    const product = await this.findById(productId);
    const existingImages = ((product.images as ProductImage[]) || []).slice();

    const filtered = existingImages.filter((img) => img.publicId !== publicId);
    if (filtered.length === existingImages.length) {
      throw new NotFoundException(
        `Image with publicId '${publicId}' not found on product`,
      );
    }

    await this.cloudinaryService.deleteImage(publicId);

    const updated = await this.productRepository.update(productId, {
      images: filtered,
    });

    if (!updated) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    return this.formatProduct(updated);
  }

  async archive(id: string): Promise<FormattedProduct> {
    const existing = await this.productRepository.findById(id);
    if (!existing || existing.status === 'archived') {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    const updated = await this.productRepository.update(id, {
      status: 'archived',
    });

    if (!updated) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return this.formatProduct(updated);
  }

  async findAll(
    query: ProductQueryDto,
    isAdmin = false,
  ): Promise<{
    data: FormattedProduct[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const filter: FilterQuery<ProductDocument> = {};

    if (!isAdmin) {
      if (query.status) {
        if (query.status === 'draft' || query.status === 'archived') {
          throw new ForbiddenException(
            'Access denied: insufficient permissions to view non-published products',
          );
        }
        filter.status = query.status;
      } else {
        filter.status = query.inStockOnly
          ? 'published'
          : { $in: ['published', 'out_of_stock'] };
      }
    } else {
      if (query.status) {
        filter.status = query.status;
      } else {
        filter.status = { $ne: 'archived' };
      }
    }

    if (query.search) {
      filter.$text = { $search: query.search.trim() };
    }

    if (query.category) {
      if (!Types.ObjectId.isValid(query.category)) {
        throw new BadRequestException('Invalid category ID format');
      }
      filter.category = new Types.ObjectId(query.category);
    }

    if (query.brand) {
      if (!Types.ObjectId.isValid(query.brand)) {
        throw new BadRequestException('Invalid brand ID format');
      }
      filter.brand = new Types.ObjectId(query.brand);
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceFilter: { $gte?: number; $lte?: number } = {};
      if (query.minPrice !== undefined) {
        priceFilter.$gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        priceFilter.$lte = query.maxPrice;
      }
      filter.price = priceFilter;
    }

    if (query.inStockOnly) {
      filter.$expr = { $gt: [{ $subtract: ['$stock', '$reservedStock'] }, 0] };
    }

    if (query.isFeatured !== undefined) {
      filter.isFeatured = query.isFeatured;
    }

    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder: 1 | -1 = query.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    const { data, total } = await this.productRepository.findAll(filter, {
      page,
      limit,
      sort,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((item) => this.formatProduct(item)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async reserveStock(
    productId: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID format');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be a positive integer');
    }

    const reserved = await this.productRepository.reserveStock(
      productId,
      quantity,
      session,
    );
    if (reserved && this.movementModel) {
      const latest = await this.productRepository.findById(productId);
      if (latest) {
        await this.recordMovement(
          {
            productId,
            type: 'stock_reservation',
            quantity,
            delta: -quantity,
            previousStock: latest.stock,
            resultingStock: latest.stock,
            previousReservedStock: Math.max(0, latest.reservedStock - quantity),
            resultingReservedStock: latest.reservedStock,
            reason: 'Stock reserved for order checkout',
          },
          session,
        );
      }
    }
    return reserved;
  }

  async releaseStock(
    productId: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID format');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be a positive integer');
    }

    const released = await this.productRepository.releaseStock(
      productId,
      quantity,
      session,
    );
    if (released && this.movementModel) {
      const latest = await this.productRepository.findById(productId);
      if (latest) {
        await this.recordMovement(
          {
            productId,
            type: 'reservation_release',
            quantity,
            delta: quantity,
            previousStock: latest.stock,
            resultingStock: latest.stock,
            previousReservedStock: latest.reservedStock + quantity,
            resultingReservedStock: latest.reservedStock,
            reason: 'Reserved stock released',
          },
          session,
        );
      }
    }
    return released;
  }

  async confirmStockDeduction(
    productId: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID format');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be a positive integer');
    }

    const deducted = await this.productRepository.confirmStockDeduction(
      productId,
      quantity,
      session,
    );
    if (deducted && this.movementModel) {
      const latest = await this.productRepository.findById(productId);
      if (latest) {
        await this.recordMovement(
          {
            productId,
            type: 'order_fulfillment',
            quantity,
            delta: -quantity,
            previousStock: latest.stock + quantity,
            resultingStock: latest.stock,
            previousReservedStock: latest.reservedStock + quantity,
            resultingReservedStock: latest.reservedStock,
            reason: 'Stock finalized for order fulfillment',
          },
          session,
        );
      }
    }
    return deducted;
  }

  private async recordMovement(
    entry: {
      productId: string;
      type: InventoryMovementType;
      quantity: number;
      delta: number;
      previousStock: number;
      resultingStock: number;
      previousReservedStock: number;
      resultingReservedStock: number;
      reason: string;
    },
    session?: ClientSession,
  ): Promise<void> {
    if (!this.movementModel) return;
    await this.movementModel.create(
      [
        {
          product: new Types.ObjectId(entry.productId),
          type: entry.type,
          quantity: entry.quantity,
          delta: entry.delta,
          previousStock: entry.previousStock,
          resultingStock: entry.resultingStock,
          previousReservedStock: entry.previousReservedStock,
          resultingReservedStock: entry.resultingReservedStock,
          reason: entry.reason,
        },
      ],
      session ? { session } : undefined,
    );
  }

  private formatProduct(product: ProductDocument): FormattedProduct {
    const raw = product.toObject ? product.toObject() : product;
    const availableStock = Math.max(
      0,
      (raw.stock ?? 0) - (raw.reservedStock ?? 0),
    );
    return {
      ...raw,
      availableStock,
    };
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
