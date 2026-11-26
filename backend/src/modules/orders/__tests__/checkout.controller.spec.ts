/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutController } from '../checkout.controller';
import { OrdersService } from '../orders.service';

describe('CheckoutController', () => {
  let controller: CheckoutController;
  let mockOrdersService: {
    checkout: jest.Mock;
  };

  beforeEach(async () => {
    mockOrdersService = {
      checkout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<CheckoutController>(CheckoutController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate checkout to OrdersService and return formatted response', async () => {
    const order = { id: 'ord-1', orderNumber: 'ORD-20261126-ABC123' };
    mockOrdersService.checkout.mockResolvedValue(order);

    const dto = { addressId: '6740a1b2c3d4e5f678901aa1' };
    const result = await controller.checkout('user-1', dto);

    expect(mockOrdersService.checkout).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual({
      message: 'Order created successfully',
      data: order,
    });
  });
});
