/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from '../categories.controller';
import { CategoriesService } from '../categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let mockCategoriesService: {
    create: jest.Mock;
    findById: jest.Mock;
    findBySlug: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
  };

  beforeEach(async () => {
    mockCategoriesService = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list active categories on findAll', async () => {
    mockCategoriesService.findAll.mockResolvedValue([
      { name: 'Wheels', slug: 'wheels', status: 'active' },
    ]);

    const result = await controller.findAll('active');
    expect(result.data).toHaveLength(1);
    expect(result.message).toBe('Categories retrieved successfully');
  });

  it('should create a category', async () => {
    mockCategoriesService.create.mockResolvedValue({
      _id: 'c1',
      name: 'Interior',
      slug: 'interior',
    });

    const result = await controller.create({ name: 'Interior' });
    expect(result.data.name).toBe('Interior');
  });

  it('should get category by id', async () => {
    mockCategoriesService.findById.mockResolvedValue({
      _id: 'c1',
      name: 'Interior',
    });

    const result = await controller.findById('c1');
    expect(result.data._id).toBe('c1');
  });

  it('should get category by slug', async () => {
    mockCategoriesService.findBySlug.mockResolvedValue({
      _id: 'c1',
      slug: 'interior',
    });

    const result = await controller.findBySlug('interior');
    expect(result.data.slug).toBe('interior');
  });

  it('should update a category', async () => {
    mockCategoriesService.update.mockResolvedValue({
      _id: 'c1',
      name: 'Updated Interior',
    });

    const result = await controller.update('c1', { name: 'Updated Interior' });
    expect(result.data.name).toBe('Updated Interior');
  });

  it('should deactivate a category', async () => {
    mockCategoriesService.deactivate.mockResolvedValue({
      _id: 'c1',
      status: 'inactive',
    });

    const result = await controller.deactivate('c1');
    expect(result.data.status).toBe('inactive');
  });
});
