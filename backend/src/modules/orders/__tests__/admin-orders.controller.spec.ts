/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { AdminOrdersController } from '../admin-orders.controller';
import { OrdersService } from '../orders.service';

describe('AdminOrdersController', () => {
  let controller: AdminOrdersController;
  let mockOrdersService: {
    findAllOrdersForAdmin: jest.Mock;
    findOrderByIdForAdmin: jest.Mock;
    updateOrderStatusByAdmin: jest.Mock;
  };

  beforeEach(async () => {
    mockOrdersService = {
      findAllOrdersForAdmin: jest.fn(),
      findOrderByIdForAdmin: jest.fn(),
      updateOrderStatusByAdmin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<AdminOrdersController>(AdminOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list orders for admin', async () => {
    const paginated = {
      data: [{ id: 'ord-1' }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    mockOrdersService.findAllOrdersForAdmin.mockResolvedValue(paginated);

    const res = await controller.getAllOrders({ page: 1, limit: 10 });
    expect(res).toEqual({
      message: 'Orders retrieved successfully',
      data: paginated.data,
      meta: paginated.meta,
    });
  });

  it('should get order detail for admin', async () => {
    const order = { id: 'ord-1' };
    mockOrdersService.findOrderByIdForAdmin.mockResolvedValue(order);

    const res = await controller.getOrderById('ord-1');
    expect(res).toEqual({
      message: 'Order retrieved successfully',
      data: order,
    });
  });

  it('should update order status for admin', async () => {
    const updated = { id: 'ord-1', fulfilmentStatus: 'processing' };
    mockOrdersService.updateOrderStatusByAdmin.mockResolvedValue(updated);

    const res = await controller.updateOrderStatus('ord-1', 'admin-1', {
      fulfilmentStatus: 'processing',
    });
    expect(mockOrdersService.updateOrderStatusByAdmin).toHaveBeenCalledWith(
      'ord-1',
      'admin-1',
      { fulfilmentStatus: 'processing' },
    );
    expect(res).toEqual({
      message: 'Order status updated successfully',
      data: updated,
    });
  });
});
