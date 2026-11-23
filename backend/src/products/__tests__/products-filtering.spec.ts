/// <reference types="jest" />
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { BrandsService } from '../../brands/brands.service';
import { CategoriesService } from '../../categories/categories.service';
import { PRODUCT_REPOSITORY } from '../constants/product.constants';
import { ProductsService } from '../products.service';

describe('ProductsService - Filtering and Pagination', () => {
  let service: ProductsService;
  let mockProductRepository: {
    create: jest.Mock;
    findById: jest.Mock;
    findBySlug: jest.Mock;
    findBySku: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
  };

  const validCategoryId = new Types.ObjectId().toString();
  const validBrandId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockProductRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findBySku: jest.fn(),
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PRODUCT_REPOSITORY,
          useValue: mockProductRepository,
        },
        {
          provide: CategoriesService,
          useValue: {},
        },
        {
          provide: BrandsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should apply text search query in MongoDB filter', async () => {
    await service.findAll({ search: 'ceramic brakes' });

    expect(mockProductRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        $text: { $search: 'ceramic brakes' },
      }),
      expect.any(Object),
    );
  });

  it('should apply category filter with ObjectId', async () => {
    await service.findAll({ category: validCategoryId });

    expect(mockProductRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        category: new Types.ObjectId(validCategoryId),
      }),
      expect.any(Object),
    );
  });

  it('should throw BadRequestException if category is invalid ObjectId', async () => {
    await expect(service.findAll({ category: 'invalid-cat' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should apply brand filter with ObjectId', async () => {
    await service.findAll({ brand: validBrandId });

    expect(mockProductRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: new Types.ObjectId(validBrandId),
      }),
      expect.any(Object),
    );
  });

  it('should throw BadRequestException if brand is invalid ObjectId', async () => {
    await expect(service.findAll({ brand: 'invalid-brand' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should apply price range filters', async () => {
    await service.findAll({ minPrice: 5000, maxPrice: 20000 });

    expect(mockProductRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        price: { $gte: 5000, $lte: 20000 },
      }),
      expect.any(Object),
    );
  });

  it('should apply inStockOnly filter with $expr', async () => {
    await service.findAll({ inStockOnly: true });

    expect(mockProductRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        $expr: { $gt: [{ $subtract: ['$stock', '$reservedStock'] }, 0] },
      }),
      expect.any(Object),
    );
  });

  it('should apply custom sorting by price ascending', async () => {
    await service.findAll({ sortBy: 'price', sortOrder: 'asc' });

    expect(mockProductRepository.findAll).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        sort: { price: 1 },
      }),
    );
  });

  it('should apply pagination and calculate correct totalPages', async () => {
    mockProductRepository.findAll.mockResolvedValue({
      data: Array(5).fill({
        _id: 'p',
        stock: 10,
        reservedStock: 2,
        toObject: () => ({ _id: 'p', stock: 10, reservedStock: 2 }),
      }),
      total: 25,
    });

    const result = await service.findAll({ page: 2, limit: 5 });

    expect(mockProductRepository.findAll).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        page: 2,
        limit: 5,
      }),
    );
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(5);
    expect(result.meta.total).toBe(25);
    expect(result.meta.totalPages).toBe(5);
  });
});
