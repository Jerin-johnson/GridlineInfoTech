/// <reference types="jest" />
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { BrandsService } from '../../brands/brands.service';
import { CategoriesService } from '../../categories/categories.service';
import { CloudinaryService } from '../../uploads/services/cloudinary.service';
import { PRODUCT_REPOSITORY } from '../constants/product.constants';
import { ProductsService } from '../products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockProductRepository: {
    create: jest.Mock;
    findById: jest.Mock;
    findBySlug: jest.Mock;
    findBySku: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
  };
  let mockCategoriesService: {
    findById: jest.Mock;
  };
  let mockBrandsService: {
    findById: jest.Mock;
  };
  let mockCloudinaryService: {
    uploadImage: jest.Mock;
    deleteImage: jest.Mock;
  };

  const validProductId = new Types.ObjectId().toString();
  const validCategoryId = new Types.ObjectId().toString();
  const validBrandId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockProductRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findBySku: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    };

    mockCategoriesService = {
      findById: jest.fn(),
    };

    mockBrandsService = {
      findById: jest.fn(),
    };

    mockCloudinaryService = {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
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
          useValue: mockCategoriesService,
        },
        {
          provide: BrandsService,
          useValue: mockBrandsService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a product with valid category and brand', async () => {
      mockCategoriesService.findById.mockResolvedValue({
        _id: validCategoryId,
        status: 'active',
      });
      mockBrandsService.findById.mockResolvedValue({
        _id: validBrandId,
        status: 'active',
      });
      mockProductRepository.findBySku.mockResolvedValue(null);
      mockProductRepository.findBySlug.mockResolvedValue(null);
      mockProductRepository.create.mockImplementation((data) =>
        Promise.resolve({
          _id: validProductId,
          ...data,
          toObject: () => ({ _id: validProductId, ...data }),
        }),
      );
      mockProductRepository.findById.mockImplementation((id) =>
        Promise.resolve({
          _id: id,
          name: 'Sport Exhaust System',
          slug: 'sport-exhaust-system',
          sku: 'EXH-001',
          stock: 10,
          reservedStock: 2,
          toObject: () => ({
            _id: id,
            name: 'Sport Exhaust System',
            slug: 'sport-exhaust-system',
            sku: 'EXH-001',
            stock: 10,
            reservedStock: 2,
          }),
        }),
      );

      const result = await service.create({
        name: 'Sport Exhaust System',
        sku: 'EXH-001',
        category: validCategoryId,
        brand: validBrandId,
        price: 49999,
        stock: 10,
        reservedStock: 2,
      });

      expect(result.sku).toBe('EXH-001');
      expect(result.availableStock).toBe(8);
      expect(mockProductRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if referenced category is not found or inactive', async () => {
      mockCategoriesService.findById.mockResolvedValue(null);

      await expect(
        service.create({
          name: 'Sport Exhaust',
          sku: 'EXH-001',
          category: validCategoryId,
          brand: validBrandId,
          price: 1999,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if referenced brand is not found or inactive', async () => {
      mockCategoriesService.findById.mockResolvedValue({
        _id: validCategoryId,
        status: 'active',
      });
      mockBrandsService.findById.mockResolvedValue({
        _id: validBrandId,
        status: 'inactive',
      });

      await expect(
        service.create({
          name: 'Sport Exhaust',
          sku: 'EXH-001',
          category: validCategoryId,
          brand: validBrandId,
          price: 1999,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if SKU already exists', async () => {
      mockCategoriesService.findById.mockResolvedValue({
        _id: validCategoryId,
        status: 'active',
      });
      mockBrandsService.findById.mockResolvedValue({
        _id: validBrandId,
        status: 'active',
      });
      mockProductRepository.findBySku.mockResolvedValue({
        _id: validProductId,
        sku: 'EXH-001',
      });

      await expect(
        service.create({
          name: 'Sport Exhaust',
          sku: 'EXH-001',
          category: validCategoryId,
          brand: validBrandId,
          price: 1999,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return product with computed availableStock', async () => {
      const mockProd = {
        _id: validProductId,
        name: 'Exhaust',
        stock: 20,
        reservedStock: 5,
        status: 'published',
        toObject: () => ({
          _id: validProductId,
          name: 'Exhaust',
          stock: 20,
          reservedStock: 5,
          status: 'published',
        }),
      };
      mockProductRepository.findById.mockResolvedValue(mockProd);

      const result = await service.findById(validProductId);
      expect(result.availableStock).toBe(15);
    });

    it('should throw NotFoundException if product is archived or not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(service.findById(validProductId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated products with metadata', async () => {
      const mockItems = [
        {
          _id: 'p1',
          name: 'Tire 1',
          stock: 5,
          reservedStock: 1,
          toObject: () => ({
            _id: 'p1',
            name: 'Tire 1',
            stock: 5,
            reservedStock: 1,
          }),
        },
      ];
      mockProductRepository.findAll.mockResolvedValue({
        data: mockItems,
        total: 1,
      });

      const result = await service.findAll({ page: 1, limit: 12 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].availableStock).toBe(4);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('archive', () => {
    it('should soft-archive a product', async () => {
      mockProductRepository.findById.mockResolvedValue({
        _id: validProductId,
        status: 'published',
      });
      mockProductRepository.update.mockResolvedValue({
        _id: validProductId,
        status: 'archived',
        toObject: () => ({ _id: validProductId, status: 'archived' }),
      });

      const result = await service.archive(validProductId);
      expect(result.status).toBe('archived');
    });
  });

  describe('addImage & removeImage', () => {
    it('should upload image to cloudinary and append to product images', async () => {
      const mockProduct = {
        _id: validProductId,
        name: 'Wheel',
        images: [],
        toObject: () => ({ _id: validProductId, name: 'Wheel', images: [] }),
      };
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCloudinaryService.uploadImage.mockResolvedValue({
        url: 'https://cloudinary.com/img.jpg',
        publicId: 'cld_1',
      });
      mockProductRepository.update.mockResolvedValue({
        ...mockProduct,
        images: [
          {
            url: 'https://cloudinary.com/img.jpg',
            publicId: 'cld_1',
            alt: 'Wheel',
            isPrimary: true,
            sortOrder: 0,
          },
        ],
        toObject: () => ({
          _id: validProductId,
          images: [{ url: 'https://cloudinary.com/img.jpg' }],
        }),
      });

      const fakeFile = {
        buffer: Buffer.from('img'),
        mimetype: 'image/png',
      } as Express.Multer.File;

      const result = await service.addImage(validProductId, fakeFile);
      expect(mockCloudinaryService.uploadImage).toHaveBeenCalledWith(
        fakeFile,
        'gridline/products',
      );
      expect(result).toBeDefined();
    });

    it('should remove image from product and destroy on cloudinary', async () => {
      const mockProduct = {
        _id: validProductId,
        images: [
          {
            url: 'https://cloudinary.com/img.jpg',
            publicId: 'cld_1',
            isPrimary: true,
            sortOrder: 0,
          },
        ],
        toObject: () => ({
          _id: validProductId,
          images: [
            {
              url: 'https://cloudinary.com/img.jpg',
              publicId: 'cld_1',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        }),
      };
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue({
        _id: validProductId,
        images: [],
        toObject: () => ({ _id: validProductId, images: [] }),
      });

      await service.removeImage(validProductId, 'cld_1');
      expect(mockCloudinaryService.deleteImage).toHaveBeenCalledWith('cld_1');
      expect(mockProductRepository.update).toHaveBeenCalledWith(
        validProductId,
        {
          images: [],
        },
      );
    });
  });
});
