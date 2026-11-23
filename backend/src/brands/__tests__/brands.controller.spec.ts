/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { BrandsController } from '../brands.controller';
import { BrandsService } from '../brands.service';

describe('BrandsController', () => {
  let controller: BrandsController;
  let mockBrandsService: {
    create: jest.Mock;
    findById: jest.Mock;
    findBySlug: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
  };

  beforeEach(async () => {
    mockBrandsService = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandsController],
      providers: [
        {
          provide: BrandsService,
          useValue: mockBrandsService,
        },
      ],
    }).compile();

    controller = module.get<BrandsController>(BrandsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list active brands on findAll', async () => {
    mockBrandsService.findAll.mockResolvedValue([
      { name: 'Brembo', slug: 'brembo', status: 'active' },
    ]);

    const result = await controller.findAll('active');
    expect(result.data).toHaveLength(1);
    expect(result.message).toBe('Brands retrieved successfully');
  });

  it('should create a brand', async () => {
    mockBrandsService.create.mockResolvedValue({
      _id: 'b1',
      name: 'Michelin',
      slug: 'michelin',
    });

    const result = await controller.create({ name: 'Michelin' });
    expect(result.data.name).toBe('Michelin');
  });

  it('should get brand by id', async () => {
    mockBrandsService.findById.mockResolvedValue({
      _id: 'b1',
      name: 'Michelin',
    });

    const result = await controller.findById('b1');
    expect(result.data._id).toBe('b1');
  });

  it('should get brand by slug', async () => {
    mockBrandsService.findBySlug.mockResolvedValue({
      _id: 'b1',
      slug: 'michelin',
    });

    const result = await controller.findBySlug('michelin');
    expect(result.data.slug).toBe('michelin');
  });

  it('should update a brand', async () => {
    mockBrandsService.update.mockResolvedValue({
      _id: 'b1',
      name: 'Michelin Tires',
    });

    const result = await controller.update('b1', { name: 'Michelin Tires' });
    expect(result.data.name).toBe('Michelin Tires');
  });

  it('should deactivate a brand', async () => {
    mockBrandsService.deactivate.mockResolvedValue({
      _id: 'b1',
      status: 'inactive',
    });

    const result = await controller.deactivate('b1');
    expect(result.data.status).toBe('inactive');
  });
});
