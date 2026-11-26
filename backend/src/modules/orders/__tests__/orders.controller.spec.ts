/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from '../orders.controller';
import { OrdersService } from '../orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let mockOrdersService: {
    findUserOrders: jest.Mock;
    findUserOrderById: jest.Mock;
    cancelOrder: jest.Mock;
  };

  beforeEach(async () => {
    mockOrdersService = {
      findUserOrders: jest.fn(),
      findUserOrderById: jest.fn(),
      cancelOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return paginated orders', async () => {
    const paginated = {
      data: [{ id: 'ord-1' }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    mockOrdersService.findUserOrders.mockResolvedValue(paginated);

    const result = await controller.getOrders('user-1', { page: 1, limit: 10 });

    expect(mockOrdersService.findUserOrders).toHaveBeenCalledWith('user-1', {
      page: 1,
      limit: 10,
    });
    expect(result).toEqual({
      message: 'Orders retrieved successfully',
      data: paginated.data,
      meta: paginated.meta,
    });
  });

  it('should return a single order by id', async () => {
    const order = { id: 'ord-1' };
    mockOrdersService.findUserOrderById.mockResolvedValue(order);

    const result = await controller.getOrderById('user-1', 'ord-1');

    expect(mockOrdersService.findUserOrderById).toHaveBeenCalledWith(
      'user-1',
      'ord-1',
    );
    expect(result).toEqual({
      message: 'Order retrieved successfully',
      data: order,
    });
  });

  it('should cancel an order', async () => {
    const order = { id: 'ord-1', fulfilmentStatus: 'cancelled' };
    mockOrdersService.cancelOrder.mockResolvedValue(order);

    const result = await controller.cancelOrder('user-1', 'ord-1', {
      reason: 'Ordered by mistake',
    });

    expect(mockOrdersService.cancelOrder).toHaveBeenCalledWith(
      'user-1',
      'ord-1',
      { reason: 'Ordered by mistake' },
    );
    expect(result).toEqual({
      message: 'Order cancelled successfully',
      data: order,
    });
  });
});
