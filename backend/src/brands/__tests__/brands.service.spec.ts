/// <reference types="jest" />
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { BrandsService } from '../brands.service';
import { BRAND_REPOSITORY } from '../constants/brand.constants';

describe('BrandsService', () => {
  let service: BrandsService;
  let mockBrandRepository: {
    create: jest.Mock;
    findById: jest.Mock;
    findBySlug: jest.Mock;
    findByName: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
  };

  const validObjectId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockBrandRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        {
          provide: BRAND_REPOSITORY,
          useValue: mockBrandRepository,
        },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create brand with auto-generated slug', async () => {
      mockBrandRepository.findBySlug.mockResolvedValue(null);
      mockBrandRepository.findByName.mockResolvedValue(null);
      mockBrandRepository.create.mockImplementation((data) =>
        Promise.resolve({ _id: validObjectId, ...data }),
      );

      const result = await service.create({
        name: 'Brembo Brakes',
        description: 'Performance brakes',
      });

      expect(result.slug).toBe('brembo-brakes');
      expect(mockBrandRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Brembo Brakes',
          slug: 'brembo-brakes',
        }),
      );
    });

    it('should throw ConflictException if slug already exists', async () => {
      mockBrandRepository.findBySlug.mockResolvedValue({
        _id: validObjectId,
        slug: 'brembo',
      });

      await expect(
        service.create({
          name: 'Brembo',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if brand name already exists', async () => {
      mockBrandRepository.findBySlug.mockResolvedValue(null);
      mockBrandRepository.findByName.mockResolvedValue({
        _id: validObjectId,
        name: 'Brembo',
      });

      await expect(
        service.create({
          name: 'Brembo',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return brand when found', async () => {
      const mockBrand = {
        _id: validObjectId,
        name: 'Brembo',
        slug: 'brembo',
        status: 'active',
      };
      mockBrandRepository.findById.mockResolvedValue(mockBrand);

      const result = await service.findById(validObjectId);
      expect(result).toEqual(mockBrand);
    });

    it('should throw NotFoundException when not found', async () => {
      mockBrandRepository.findById.mockResolvedValue(null);

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
    it('should return brand when found by slug', async () => {
      const mockBrand = {
        _id: validObjectId,
        name: 'Brembo',
        slug: 'brembo',
      };
      mockBrandRepository.findBySlug.mockResolvedValue(mockBrand);

      const result = await service.findBySlug('brembo');
      expect(result).toEqual(mockBrand);
    });

    it('should throw NotFoundException when slug does not exist', async () => {
      mockBrandRepository.findBySlug.mockResolvedValue(null);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should successfully update brand fields', async () => {
      const mockBrand = {
        _id: validObjectId,
        name: 'Brembo',
        slug: 'brembo',
      };
      mockBrandRepository.findById.mockResolvedValue(mockBrand);
      mockBrandRepository.findByName.mockResolvedValue(null);
      mockBrandRepository.update.mockResolvedValue({
        ...mockBrand,
        name: 'Brembo Performance',
      });

      const result = await service.update(validObjectId, {
        name: 'Brembo Performance',
      });
      expect(result.name).toBe('Brembo Performance');
    });
  });

  describe('deactivate', () => {
    it('should deactivate brand', async () => {
      const mockBrand = {
        _id: validObjectId,
        name: 'Brembo',
        status: 'active',
      };
      mockBrandRepository.findById.mockResolvedValue(mockBrand);
      mockBrandRepository.update.mockResolvedValue({
        ...mockBrand,
        status: 'inactive',
      });

      const result = await service.deactivate(validObjectId);
      expect(result.status).toBe('inactive');
    });
  });
});
