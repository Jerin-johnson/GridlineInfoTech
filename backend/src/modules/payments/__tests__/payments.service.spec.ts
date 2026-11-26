/// <reference types="jest" />
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { OrdersService } from '../../orders/orders.service';
import { ProductsService } from '../../products/products.service';
import { PAYMENT_REPOSITORY } from '../constants/payment.constants';
import { PaymentsService } from '../payments.service';
import { BlockchainVerifierService } from '../services/blockchain-verifier.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPaymentRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findLatestByOrderAndUser: jest.Mock;
    findByOrderAndTxHash: jest.Mock;
    findByChainAndTxHash: jest.Mock;
    findVerifiedByOrder: jest.Mock;
    countByOrder: jest.Mock;
  };
  let mockOrdersService: {
    findUserOrderById: jest.Mock;
    updateOrderPaymentState: jest.Mock;
  };
  let mockProductsService: {
    confirmStockDeduction: jest.Mock;
    releaseStock: jest.Mock;
  };
  let mockVerifier: {
    verifyTransaction: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  const userId = new Types.ObjectId().toString();
  const orderId = new Types.ObjectId().toString();
  const prodId = new Types.ObjectId().toString();
  const walletAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const merchantAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const tokenAddress = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238';
  const txHash =
    '0x1111111111111111111111111111111111111111111111111111111111111111';

  const makeOrder = (overrides: Record<string, unknown> = {}) => ({
    id: orderId,
    orderNumber: 'ORD-20261126-ABC123',
    paymentReference: 'PAY-123456',
    customerEmail: 'alex@gridline.com',
    items: [
      {
        productId: prodId,
        name: 'Brake Rotor',
        sku: 'BRM-01',
        slug: 'brake-rotor',
        unitPrice: 10000,
        quantity: 1,
        lineTotal: 10000,
      },
    ],
    totalAmount: 10000, // $100.00 -> 100_000_000 USDC base units
    currency: 'USD',
    paymentMethod: 'crypto_wallet',
    paymentStatus: 'pending',
    fulfilmentStatus: 'placed',
    stockReserved: true,
    paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
    ...overrides,
  });

  const makePaymentDoc = (overrides: Record<string, unknown> = {}) => {
    const base = {
      _id: new Types.ObjectId(),
      order: new Types.ObjectId(orderId),
      user: new Types.ObjectId(userId),
      paymentReference: 'PAY-123456',
      orderPaymentReference: 'PAY-123456',
      attemptNumber: 1,
      paymentMethod: 'crypto_wallet',
      chainId: 11155111,
      network: 'Sepolia',
      token: 'USDC',
      tokenAddress,
      tokenDecimals: 6,
      destinationAddress: merchantAddress,
      walletAddress,
      expectedAmount: '100000000',
      confirmations: 0,
      requiredConfirmations: 3,
      verificationStatus: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      ...overrides,
    };
    return {
      ...base,
      toObject() {
        return { ...base };
      },
    };
  };

  beforeEach(async () => {
    mockPaymentRepository = {
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve(makePaymentDoc(data)),
      ),
      save: jest.fn().mockImplementation((doc) => Promise.resolve(doc)),
      findLatestByOrderAndUser: jest.fn().mockResolvedValue(null),
      findByOrderAndTxHash: jest.fn().mockResolvedValue(null),
      findByChainAndTxHash: jest.fn().mockResolvedValue(null),
      findVerifiedByOrder: jest.fn().mockResolvedValue(null),
      countByOrder: jest.fn().mockResolvedValue(0),
    };

    mockOrdersService = {
      findUserOrderById: jest.fn().mockResolvedValue(makeOrder()),
      updateOrderPaymentState: jest.fn().mockResolvedValue(makeOrder()),
    };

    mockProductsService = {
      confirmStockDeduction: jest.fn().mockResolvedValue(true),
      releaseStock: jest.fn().mockResolvedValue(true),
    };

    mockVerifier = {
      verifyTransaction: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const map: Record<string, unknown> = {
          CRYPTO_CHAIN_ID: 11155111,
          CRYPTO_NETWORK: 'Sepolia',
          CRYPTO_TOKEN_SYMBOL: 'USDC',
          CRYPTO_TOKEN_ADDRESS: tokenAddress,
          CRYPTO_TOKEN_DECIMALS: 6,
          CRYPTO_REQUIRED_CONFIRMATIONS: 3,
          PAYMENT_WALLET_ADDRESS: merchantAddress,
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PAYMENT_REPOSITORY, useValue: mockPaymentRepository },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: BlockchainVerifierService, useValue: mockVerifier },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should compute integer USD-to-USDC expectedAmount without floating point', () => {
    expect(service.calculateExpectedAmount(10000, 6)).toBe('100000000');
    expect(service.calculateExpectedAmount(1999, 6)).toBe('19990000');
    expect(service.calculateExpectedAmount(100, 18)).toBe(
      '1000000000000000000',
    );
  });

  it('should return safe public config without RPC URL', () => {
    const config = service.getPublicConfig();
    expect(config).toEqual({
      chainId: 11155111,
      network: 'Sepolia',
      token: 'USDC',
      tokenAddress,
      tokenDecimals: 6,
      destinationAddress: merchantAddress,
      requiredConfirmations: 3,
    });
    expect((config as unknown as Record<string, unknown>).rpcUrl).toBeUndefined();
  });

  describe('initiatePayment', () => {
    it('should initiate payment and create a new Payment attempt', async () => {
      const result = await service.initiatePayment(userId, {
        orderId,
        walletAddress,
        chainId: 11155111,
      });

      expect(result.expectedAmount).toBe('100000000');
      expect(result.verificationStatus).toBe('pending');
      expect(mockPaymentRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should expire order and release stock when payment window elapsed', async () => {
      mockOrdersService.findUserOrderById.mockResolvedValue(
        makeOrder({ paymentExpiresAt: new Date(Date.now() - 60_000) }),
      );

      await expect(
        service.initiatePayment(userId, { orderId, walletAddress }),
      ).rejects.toThrow(BadRequestException);

      expect(mockOrdersService.updateOrderPaymentState).toHaveBeenCalledWith(
        orderId,
        userId,
        expect.objectContaining({
          paymentStatus: 'expired',
          fulfilmentStatus: 'cancelled',
          stockReserved: false,
        }),
        undefined,
      );
      expect(mockProductsService.releaseStock).toHaveBeenCalledWith(
        prodId,
        1,
        undefined,
      );
    });
  });

  describe('verifyPayment', () => {
    it('should immediately reject underpaid tx as terminal and not deduct stock', async () => {
      mockVerifier.verifyTransaction.mockResolvedValue({
        outcome: 'underpaid',
        receivedAmount: '50000000',
        blockNumber: 100,
        confirmations: 5,
        reason: 'Payment underpaid. Please send the correct amount.',
      });

      await expect(
        service.verifyPayment(userId, {
          orderId,
          transactionHash: txHash,
          walletAddress,
          chainId: 11155111,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPaymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationStatus: 'underpaid',
          receivedAmount: '50000000',
        }),
        undefined,
      );
      expect(mockOrdersService.updateOrderPaymentState).toHaveBeenCalledWith(
        orderId,
        userId,
        expect.objectContaining({ paymentStatus: 'failed' }),
      );
      expect(mockProductsService.confirmStockDeduction).not.toHaveBeenCalled();
    });

    it('should immediately reject overpaid tx as terminal and not deduct stock', async () => {
      mockVerifier.verifyTransaction.mockResolvedValue({
        outcome: 'overpaid',
        receivedAmount: '150000000',
        blockNumber: 100,
        confirmations: 5,
      });

      await expect(
        service.verifyPayment(userId, {
          orderId,
          transactionHash: txHash,
          walletAddress,
          chainId: 11155111,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPaymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationStatus: 'overpaid',
          receivedAmount: '150000000',
        }),
        undefined,
      );
      expect(mockProductsService.confirmStockDeduction).not.toHaveBeenCalled();
    });

    it('should allow retry with a new transaction after a previous underpaid attempt', async () => {
      mockOrdersService.findUserOrderById.mockResolvedValue(
        makeOrder({ paymentStatus: 'failed' }),
      );
      mockPaymentRepository.countByOrder.mockResolvedValue(1);
      mockVerifier.verifyTransaction.mockResolvedValue({
        outcome: 'valid',
        receivedAmount: '100000000',
        blockNumber: 105,
        confirmations: 3,
      });

      const result = await service.verifyPayment(userId, {
        orderId,
        transactionHash: txHash,
        walletAddress,
        chainId: 11155111,
      });

      expect(result.verificationStatus).toBe('verified');
      expect(result.attemptNumber).toBe(2);
      expect(result.paymentReference).toBe('PAY-123456-2');
      expect(mockProductsService.confirmStockDeduction).toHaveBeenCalledWith(
        prodId,
        1,
        undefined,
      );
    });

    it('should keep order confirming when confirmations < requiredConfirmations', async () => {
      mockVerifier.verifyTransaction.mockResolvedValue({
        outcome: 'valid',
        receivedAmount: '100000000',
        blockNumber: 105,
        confirmations: 1,
      });

      const result = await service.verifyPayment(userId, {
        orderId,
        transactionHash: txHash,
        walletAddress,
        chainId: 11155111,
      });

      expect(result.verificationStatus).toBe('confirming');
      expect(mockProductsService.confirmStockDeduction).not.toHaveBeenCalled();
    });

    it('should preserve tx details for reconciliation when submitted after expiration', async () => {
      mockOrdersService.findUserOrderById.mockResolvedValue(
        makeOrder({ paymentExpiresAt: new Date(Date.now() - 10_000) }),
      );
      mockVerifier.verifyTransaction.mockResolvedValue({
        outcome: 'valid',
        receivedAmount: '100000000',
        blockNumber: 105,
        confirmations: 4,
      });

      await expect(
        service.verifyPayment(userId, {
          orderId,
          transactionHash: txHash,
          walletAddress,
          chainId: 11155111,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPaymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationStatus: 'expired',
          transactionHash: txHash,
          receivedAmount: '100000000',
        }),
        undefined,
      );
      expect(mockProductsService.confirmStockDeduction).not.toHaveBeenCalled();
    });

    it('should reject duplicate transactionHash used by another order with 409', async () => {
      mockPaymentRepository.findByChainAndTxHash.mockResolvedValue(
        makePaymentDoc({ order: new Types.ObjectId() }),
      );

      await expect(
        service.verifyPayment(userId, {
          orderId,
          transactionHash: txHash,
          walletAddress,
          chainId: 11155111,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should prevent duplicate stock deduction when concurrent verify loses atomic order update', async () => {
      mockVerifier.verifyTransaction.mockResolvedValue({
        outcome: 'valid',
        receivedAmount: '100000000',
        blockNumber: 105,
        confirmations: 3,
      });
      mockOrdersService.updateOrderPaymentState.mockResolvedValue(null);

      await expect(
        service.verifyPayment(userId, {
          orderId,
          transactionHash: txHash,
          walletAddress,
          chainId: 11155111,
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockProductsService.confirmStockDeduction).not.toHaveBeenCalled();
    });
  });
});
