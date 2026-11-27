/// <reference types="jest" />
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CategoriesService } from '../categories.service';
import { CATEGORY_REPOSITORY } from '../constants/category.constants';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let mockCategoryRepository: {
    create: jest.Mock;
    findById: jest.Mock;
    findBySlug: jest.Mock;
    findByName: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
    countByParent: jest.Mock;
  };

  const validObjectId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockCategoryRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      countByParent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CATEGORY_REPOSITORY,
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create category with auto-generated slug', async () => {
      mockCategoryRepository.findBySlug.mockResolvedValue(null);
      mockCategoryRepository.findByName.mockResolvedValue(null);
      mockCategoryRepository.create.mockImplementation((data) =>
        Promise.resolve({ _id: validObjectId, ...data }),
      );

      const result = await service.create({
        name: 'Wheels & Tires',
        description: 'Automotive wheels',
      });

      expect(result.slug).toBe('wheels-tires');
      expect(mockCategoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wheels & Tires',
          slug: 'wheels-tires',
        }),
      );
    });

    it('should throw ConflictException if slug already exists', async () => {
      mockCategoryRepository.findBySlug.mockResolvedValue({
        _id: validObjectId,
        slug: 'exhaust-systems',
      });

      await expect(
        service.create({
          name: 'Exhaust Systems',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if category name already exists', async () => {
      mockCategoryRepository.findBySlug.mockResolvedValue(null);
      mockCategoryRepository.findByName.mockResolvedValue({
        _id: validObjectId,
        name: 'Exhaust Systems',
      });

      await expect(
        service.create({
          name: 'Exhaust Systems',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if parent category does not exist', async () => {
      mockCategoryRepository.findBySlug.mockResolvedValue(null);
      mockCategoryRepository.findByName.mockResolvedValue(null);
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(
        service.create({
          name: 'Rims',
          parent: validObjectId,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return category when found', async () => {
      const mockCategory = {
        _id: validObjectId,
        name: 'Exhaust',
        slug: 'exhaust',
        status: 'active',
      };
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);

      const result = await service.findById(validObjectId);
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when not found', async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(service.findById(validObjectId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException on invalid ObjectId', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return category when found by slug', async () => {
      const mockCategory = {
        _id: validObjectId,
        name: 'Exhaust',
        slug: 'exhaust',
      };
      mockCategoryRepository.findBySlug.mockResolvedValue(mockCategory);

      const result = await service.findBySlug('exhaust');
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when slug does not exist', async () => {
      mockCategoryRepository.findBySlug.mockResolvedValue(null);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should successfully update category fields', async () => {
      const mockCategory = {
        _id: validObjectId,
        name: 'Wheels',
        slug: 'wheels',
        parent: null,
      };
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);
      mockCategoryRepository.findByName.mockResolvedValue(null);
      mockCategoryRepository.update.mockResolvedValue({
        ...mockCategory,
        name: 'Custom Wheels',
      });

      const result = await service.update(validObjectId, {
        name: 'Custom Wheels',
      });
      expect(result.name).toBe('Custom Wheels');
    });

    it('should throw BadRequestException if setting self as parent', async () => {
      const mockCategory = {
        _id: validObjectId,
        name: 'Wheels',
        slug: 'wheels',
      };
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);

      await expect(
        service.update(validObjectId, { parent: validObjectId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on circular category hierarchy', async () => {
      const catAId = '507f1f77bcf86cd799439011';
      const catBId = '507f1f77bcf86cd799439012';
      const catCId = '507f1f77bcf86cd799439013';

      mockCategoryRepository.findById.mockImplementation((id: string) => {
        if (id === catAId) {
          return Promise.resolve({
            _id: catAId,
            name: 'Root',
            slug: 'root',
            status: 'active',
            parent: null,
          });
        }
        if (id === catCId) {
          return Promise.resolve({
            _id: catCId,
            name: 'Grandchild',
            slug: 'grandchild',
            status: 'active',
            parent: catBId,
          });
        }
        if (id === catBId) {
          return Promise.resolve({
            _id: catBId,
            name: 'Child',
            slug: 'child',
            status: 'active',
            parent: catAId,
          });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.update(catAId, { parent: catCId }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate category when no children exist', async () => {
      const mockCategory = {
        _id: validObjectId,
        name: 'Wheels',
        status: 'active',
      };
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);
      mockCategoryRepository.countByParent.mockResolvedValue(0);
      mockCategoryRepository.update.mockResolvedValue({
        ...mockCategory,
        status: 'inactive',
      });

      const result = await service.deactivate(validObjectId);
      expect(result.status).toBe('inactive');
    });

    it('should throw ConflictException when active children exist', async () => {
      const mockCategory = {
        _id: validObjectId,
        name: 'Wheels',
        status: 'active',
      };
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);
      mockCategoryRepository.countByParent.mockResolvedValue(2);

      await expect(service.deactivate(validObjectId)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
