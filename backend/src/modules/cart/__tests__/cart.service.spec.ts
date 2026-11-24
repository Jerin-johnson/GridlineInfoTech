/// <reference types="jest" />
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ProductsService } from '../../products/products.service';
import { CartService } from '../cart.service';
import { CART_REPOSITORY } from '../constants/cart.constants';

describe('CartService', () => {
  let service: CartService;
  let mockCartRepository: {
    findByUserId: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    clear: jest.Mock;
  };
  let mockProductsService: {
    findById: jest.Mock;
  };

  const validUserId = new Types.ObjectId().toString();
  const validProductId = new Types.ObjectId().toString();
  const validProduct2Id = new Types.ObjectId().toString();

  const mockProduct = {
    _id: validProductId,
    name: 'Brembo Brake Rotor',
    slug: 'brembo-brake-rotor',
    sku: 'BRM-ROTOR-1',
    price: 25000, // $250.00
    availableStock: 10,
    status: 'published',
    images: [{ url: 'https://img.com/rotor.jpg', isPrimary: true }],
  };

  beforeEach(async () => {
    mockCartRepository = {
      findByUserId: jest.fn(),
      create: jest.fn(),
      save: jest.fn().mockImplementation((cart) => Promise.resolve(cart)),
      clear: jest.fn(),
    };

    mockProductsService = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: CART_REPOSITORY,
          useValue: mockCartRepository,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return empty cart if user has no items', async () => {
      mockCartRepository.findByUserId.mockResolvedValue({
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(validUserId),
        items: [],
      });

      const result = await service.getCart(validUserId);
      expect(result.items).toHaveLength(0);
      expect(result.subtotal).toBe(0);
      expect(result.totalQuantity).toBe(0);
    });

    it('should create cart if none exists for user', async () => {
      mockCartRepository.findByUserId.mockResolvedValue(null);
      mockCartRepository.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(validUserId),
        items: [],
      });

      const result = await service.getCart(validUserId);
      expect(mockCartRepository.create).toHaveBeenCalledWith(validUserId);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('addItem', () => {
    it('should add product to cart and calculate totals', async () => {
      mockProductsService.findById.mockResolvedValue(mockProduct);
      const existingCart = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(validUserId),
        items: [],
      };
      mockCartRepository.findByUserId.mockResolvedValue(existingCart);

      const result = await service.addItem(validUserId, {
        productId: validProductId,
        quantity: 2,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe(validProductId);
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].price).toBe(25000);
      expect(result.items[0].itemTotal).toBe(50000);
      expect(result.subtotal).toBe(50000);
      expect(result.total).toBe(50000);
    });

    it('should increment quantity if product is already in cart', async () => {
      mockProductsService.findById.mockResolvedValue(mockProduct);
      const existingCart = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(validUserId),
        items: [
          {
            product: new Types.ObjectId(validProductId),
            quantity: 3,
          },
        ],
      };
      mockCartRepository.findByUserId.mockResolvedValue(existingCart);

      const result = await service.addItem(validUserId, {
        productId: validProductId,
        quantity: 2,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(5);
      expect(result.subtotal).toBe(125000); // 5 * 25000
    });

    it('should throw BadRequestException if adding quantity exceeds available stock', async () => {
      mockProductsService.findById.mockResolvedValue({
        ...mockProduct,
        availableStock: 5,
      });
      const existingCart = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(validUserId),
        items: [],
      };
      mockCartRepository.findByUserId.mockResolvedValue(existingCart);

      await expect(
        service.addItem(validUserId, {
          productId: validProductId,
          quantity: 6,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if product is out of stock', async () => {
      mockProductsService.findById.mockResolvedValue({
        ...mockProduct,
        availableStock: 0,
      });

      await expect(
        service.addItem(validUserId, {
          productId: validProductId,
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if product is not published', async () => {
      mockProductsService.findById.mockResolvedValue({
        ...mockProduct,
        status: 'draft',
      });

      await expect(
        service.addItem(validUserId, {
          productId: validProductId,
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateItem', () => {
    it('should update item quantity in cart', async () => {
      mockProductsService.findById.mockResolvedValue(mockProduct);
      const existingCart = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(validUserId),
        items: [
          {
            product: new Types.ObjectId(validProductId),
            quantity: 2,
          },
        ],
      };
      mockCartRepository.findByUserId.mockResolvedValue(existingCart);

      const result = await service.updateItem(validUserId, validProductId, {
        quantity: 4,
      });

      expect(result.items[0].quantity).toBe(4);
      expect(result.subtotal).toBe(100000); // 4 * 25000
    });

    it('should throw BadRequestException if updated quantity exceeds stock', async () => {
      mockProductsService.findById.mockResolvedValue({
        ...mockProduct,
        availableStock: 5,
      });
      const existingCart = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(validUserId),
        items: [
          {
            product: new Types.ObjectId(validProductId),
            quantity: 2,
          },
        ],
      };
      mockCartRepository.findByUserId.mockResolvedValue(existingCart);

      await expect(
        service.updateItem(validUserId, validProductId, { quantity: 8 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if product is not in cart', async () => {
      const existingCart = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(validUserId),
        items: [],
      };
      mockCartRepository.findByUserId.mockResolvedValue(existingCart);

      await expect(
        service.updateItem(validUserId, validProduct2Id, { quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem', () => {
    it('should remove product from cart', async () => {
      mockProductsService.findById.mockResolvedValue(mockProduct);
      const existingCart = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(validUserId),
        items: [
          {
            product: new Types.ObjectId(validProductId),
            quantity: 2,
          },
        ],
      };
      mockCartRepository.findByUserId.mockResolvedValue(existingCart);

      const result = await service.removeItem(validUserId, validProductId);
      expect(result.items).toHaveLength(0);
      expect(result.subtotal).toBe(0);
    });

    it('should throw NotFoundException if product is not found in cart', async () => {
      const existingCart = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(validUserId),
        items: [],
      };
      mockCartRepository.findByUserId.mockResolvedValue(existingCart);

      await expect(
        service.removeItem(validUserId, validProductId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from user cart', async () => {
      const emptyCart = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(validUserId),
        items: [],
      };
      mockCartRepository.clear.mockResolvedValue(emptyCart);

      const result = await service.clearCart(validUserId);
      expect(result.items).toHaveLength(0);
      expect(result.subtotal).toBe(0);
      expect(mockCartRepository.clear).toHaveBeenCalledWith(validUserId);
    });
  });

  describe('product availability handling', () => {
    it('should flag item as unavailable and exclude from subtotal if stock drops below quantity', async () => {
      mockProductsService.findById.mockResolvedValue({
        ...mockProduct,
        availableStock: 1, // Only 1 available, but cart has 3
      });
      const existingCart = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(validUserId),
        items: [
          {
            product: new Types.ObjectId(validProductId),
            quantity: 3,
          },
        ],
      };
      mockCartRepository.findByUserId.mockResolvedValue(existingCart);

      const result = await service.getCart(validUserId);
      expect(result.items[0].isAvailable).toBe(false);
      expect(result.subtotal).toBe(0); // Excluded from subtotal
    });
  });
});
