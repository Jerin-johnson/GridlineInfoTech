/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from '../cart.controller';
import { CartService } from '../cart.service';

describe('CartController', () => {
  let controller: CartController;
  let mockCartService: {
    getCart: jest.Mock;
    addItem: jest.Mock;
    updateItem: jest.Mock;
    removeItem: jest.Mock;
    clearCart: jest.Mock;
  };

  const userId = 'user-123';
  const productId = 'prod-456';

  beforeEach(async () => {
    mockCartService = {
      getCart: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get cart for user', async () => {
    mockCartService.getCart.mockResolvedValue({
      items: [],
      subtotal: 0,
      total: 0,
    });

    const result = await controller.getCart(userId);
    expect(mockCartService.getCart).toHaveBeenCalledWith(userId);
    expect(result.message).toBe('Cart retrieved successfully');
    expect(result.data.subtotal).toBe(0);
  });

  it('should add item to cart', async () => {
    mockCartService.addItem.mockResolvedValue({
      items: [{ productId, quantity: 2 }],
      subtotal: 50000,
    });

    const result = await controller.addItem(userId, { productId, quantity: 2 });
    expect(mockCartService.addItem).toHaveBeenCalledWith(userId, {
      productId,
      quantity: 2,
    });
    expect(result.message).toBe('Item added to cart successfully');
    expect(result.data.subtotal).toBe(50000);
  });

  it('should update item quantity in cart', async () => {
    mockCartService.updateItem.mockResolvedValue({
      items: [{ productId, quantity: 4 }],
      subtotal: 100000,
    });

    const result = await controller.updateItem(userId, productId, {
      quantity: 4,
    });
    expect(mockCartService.updateItem).toHaveBeenCalledWith(userId, productId, {
      quantity: 4,
    });
    expect(result.message).toBe('Cart item updated successfully');
  });

  it('should remove item from cart', async () => {
    mockCartService.removeItem.mockResolvedValue({
      items: [],
      subtotal: 0,
    });

    const result = await controller.removeItem(userId, productId);
    expect(mockCartService.removeItem).toHaveBeenCalledWith(userId, productId);
    expect(result.message).toBe('Cart item removed successfully');
  });

  it('should clear cart', async () => {
    mockCartService.clearCart.mockResolvedValue({
      items: [],
      subtotal: 0,
    });

    const result = await controller.clearCart(userId);
    expect(mockCartService.clearCart).toHaveBeenCalledWith(userId);
    expect(result.message).toBe('Cart cleared successfully');
  });
});
