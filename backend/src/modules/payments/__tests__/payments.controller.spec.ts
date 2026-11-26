/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from '../payments.controller';
import { PaymentsService } from '../payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let mockPaymentsService: {
    getPublicConfig: jest.Mock;
    initiatePayment: jest.Mock;
    verifyPayment: jest.Mock;
    getPaymentByOrder: jest.Mock;
  };

  beforeEach(async () => {
    mockPaymentsService = {
      getPublicConfig: jest.fn(),
      initiatePayment: jest.fn(),
      verifyPayment: jest.fn(),
      getPaymentByOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockPaymentsService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should return public config', () => {
    const cfg = { chainId: 11155111, network: 'Sepolia', token: 'USDC' };
    mockPaymentsService.getPublicConfig.mockReturnValue(cfg);

    expect(controller.getConfig()).toEqual({
      message: 'Payment configuration retrieved successfully',
      data: cfg,
    });
  });

  it('should initiate payment', async () => {
    const payment = { id: 'pay-1', verificationStatus: 'pending' };
    mockPaymentsService.initiatePayment.mockResolvedValue(payment);

    const dto = {
      orderId: '6740a1b2c3d4e5f678901001',
      walletAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    };
    const res = await controller.initiatePayment('user-1', dto);

    expect(res).toEqual({
      message: 'Payment initiated successfully',
      data: payment,
    });
  });

  it('should verify payment', async () => {
    const payment = { id: 'pay-1', verificationStatus: 'verified' };
    mockPaymentsService.verifyPayment.mockResolvedValue(payment);

    const dto = {
      orderId: '6740a1b2c3d4e5f678901001',
      transactionHash:
        '0x1111111111111111111111111111111111111111111111111111111111111111',
      walletAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      chainId: 11155111,
    };
    const res = await controller.verifyPayment('user-1', dto);

    expect(res).toEqual({
      message: 'Payment verified successfully',
      data: payment,
    });
  });
});
