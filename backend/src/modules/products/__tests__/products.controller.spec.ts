/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from '../products.controller';
import { ProductsService } from '../products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let mockProductsService: {
    create: jest.Mock;
    findById: jest.Mock;
    findBySlug: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
    archive: jest.Mock;
    addImage: jest.Mock;
    removeImage: jest.Mock;
  };

  beforeEach(async () => {
    mockProductsService = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      archive: jest.fn(),
      addImage: jest.fn(),
      removeImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list products on findAll', async () => {
    mockProductsService.findAll.mockResolvedValue({
      data: [{ name: 'Brake Pad', availableStock: 10 }],
      meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });

    const result = await controller.findAll({ page: 1, limit: 12 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.message).toBe('Products retrieved successfully');
  });

  it('should create product', async () => {
    mockProductsService.create.mockResolvedValue({
      _id: 'p1',
      name: 'Turbocharger',
      availableStock: 5,
    });

    const result = await controller.create({
      name: 'Turbocharger',
      sku: 'TURBO-1',
      category: 'c1',
      brand: 'b1',
      price: 99900,
    });
    expect(result.data.name).toBe('Turbocharger');
  });

  it('should get product by id', async () => {
    mockProductsService.findById.mockResolvedValue({
      _id: 'p1',
      name: 'Turbocharger',
    });

    const result = await controller.findById('p1');
    expect(result.data._id).toBe('p1');
  });

  it('should get product by slug', async () => {
    mockProductsService.findBySlug.mockResolvedValue({
      _id: 'p1',
      slug: 'turbocharger',
    });

    const result = await controller.findBySlug('turbocharger');
    expect(result.data.slug).toBe('turbocharger');
  });

  it('should update product', async () => {
    mockProductsService.update.mockResolvedValue({
      _id: 'p1',
      price: 89900,
    });

    const result = await controller.update('p1', { price: 89900 });
    expect(result.data.price).toBe(89900);
  });

  it('should archive product', async () => {
    mockProductsService.archive.mockResolvedValue({
      _id: 'p1',
      status: 'archived',
    });

    const result = await controller.archive('p1');
    expect(result.data.status).toBe('archived');
  });

  it('should upload product image', async () => {
    mockProductsService.addImage.mockResolvedValue({
      _id: 'p1',
      images: [{ url: 'https://img.url' }],
    });

    const fakeFile = {
      buffer: Buffer.from('abc'),
    } as Express.Multer.File;

    const result = await controller.uploadImage(
      'p1',
      fakeFile,
      'Alt tag',
      true,
    );
    expect(mockProductsService.addImage).toHaveBeenCalledWith(
      'p1',
      fakeFile,
      'Alt tag',
      true,
    );
    expect(result.message).toBe('Product image uploaded successfully');
  });

  it('should remove product image', async () => {
    mockProductsService.removeImage.mockResolvedValue({
      _id: 'p1',
      images: [],
    });

    const result = await controller.removeImage('p1', 'cld_1');
    expect(mockProductsService.removeImage).toHaveBeenCalledWith('p1', 'cld_1');
    expect(result.message).toBe('Product image removed successfully');
  });
});
