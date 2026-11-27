import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Order } from '../../orders/schemas/order.schema';
import { User } from '../../users/schemas/user.schema';
import { AdminPaymentsService } from '../admin-payments.service';
import { Payment } from '../schemas/payment.schema';

describe('AdminPaymentsService', () => {
  let service: AdminPaymentsService;

  const validPaymentId = new Types.ObjectId().toHexString();
  const validOrderId = new Types.ObjectId().toHexString();
  const validUserId = new Types.ObjectId().toHexString();

  const createExecChain = (resolvedValue: unknown) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(resolvedValue),
  });

  const mockPaymentModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
  };

  const mockOrderModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserModel = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminPaymentsService,
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<AdminPaymentsService>(AdminPaymentsService);
  });

  describe('getSummary', () => {
    it('should return accurate revenue excluding pending/failed/uncollected COD and without double counting attempts', async () => {
      mockOrderModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          {
            collectedRevenue: 150000,
            successfulPayments: 3,
            pendingPayments: 2,
            cryptoRevenue: 100000,
            codCollected: 50000,
          },
        ]),
      });
      mockPaymentModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(4),
      });
      mockOrderModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(1),
      });

      const summary = await service.getSummary();

      expect(summary).toEqual({
        collectedRevenue: 150000,
        successfulPayments: 3,
        pendingPayments: 2,
        failedExpiredPayments: 5,
        cryptoRevenue: 100000,
        codCollected: 50000,
      });

      // Verify revenue aggregation matches orders once per order (never payments attempts)
      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[0]).toEqual({
        $match: { fulfilmentStatus: { $ne: 'cancelled' } },
      });
    });

    it('should handle empty database gracefully with zeroes', async () => {
      mockOrderModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([]),
      });
      mockPaymentModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(0),
      });
      mockOrderModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(0),
      });

      const summary = await service.getSummary();
      expect(summary).toEqual({
        collectedRevenue: 0,
        successfulPayments: 0,
        pendingPayments: 0,
        failedExpiredPayments: 0,
        cryptoRevenue: 0,
        codCollected: 0,
      });
    });
  });

  describe('findAllTransactions', () => {
    it('should return paginated transactions across crypto and COD', async () => {
      mockPaymentModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          {
            data: [
              {
                id: validPaymentId,
                source: 'payment',
                paymentReference: 'PAY-1001',
                orderNumber: 'ORD-1001',
                paymentMethod: 'crypto_wallet',
                status: 'verified',
              },
            ],
            total: [{ count: 1 }],
          },
        ]),
      });

      const res = await service.findAllTransactions({
        page: 1,
        limit: 15,
        search: 'ORD-1001',
        status: 'verified',
        paymentMethod: 'all',
      });

      expect(res.data).toHaveLength(1);
      expect(res.meta).toEqual({
        page: 1,
        limit: 15,
        total: 1,
        totalPages: 1,
      });
    });

    it('should query COD orders directly when paymentMethod is cod', async () => {
      mockOrderModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          {
            data: [
              {
                id: validOrderId,
                source: 'cod_order',
                paymentReference: 'PAY-COD-1',
                orderNumber: 'ORD-COD-1',
                paymentMethod: 'cod',
                status: 'pending',
              },
            ],
            total: [{ count: 1 }],
          },
        ]),
      });

      const res = await service.findAllTransactions({
        page: 1,
        limit: 15,
        paymentMethod: 'cod',
      });

      expect(mockOrderModel.aggregate).toHaveBeenCalledTimes(1);
      expect(res.data[0].source).toBe('cod_order');
    });

    it('should reject invalid date range where dateFrom > dateTo', async () => {
      await expect(
        service.findAllTransactions({
          dateFrom: '2026-12-10',
          dateTo: '2026-12-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return empty data and zero totalPages when no matches exist', async () => {
      mockPaymentModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([{ data: [], total: [] }]),
      });

      const res = await service.findAllTransactions({ page: 1, limit: 15 });
      expect(res.data).toEqual([]);
      expect(res.meta).toEqual({
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe('findTransactionById', () => {
    it('should return crypto payment detail and sibling attempt history', async () => {
      const mockPayment = {
        _id: new Types.ObjectId(validPaymentId),
        paymentReference: 'PAY-1',
        orderPaymentReference: 'ORDPAY-1',
        attemptNumber: 2,
        paymentMethod: 'crypto_wallet',
        chainId: 11155111,
        network: 'sepolia',
        token: 'ETH',
        tokenDecimals: 18,
        destinationAddress: '0xdest',
        walletAddress: '0xuser',
        transactionHash: '0xtxhash',
        expectedAmount: '100000000000000000',
        receivedAmount: '100000000000000000',
        confirmations: 3,
        requiredConfirmations: 3,
        verificationStatus: 'verified',
        expiresAt: new Date(),
        verifiedAt: new Date(),
        createdAt: new Date(),
        order: {
          _id: new Types.ObjectId(validOrderId),
          orderNumber: 'ORD-1001',
          totalAmount: 50000,
          currency: 'USD',
          paymentStatus: 'paid',
          fulfilmentStatus: 'processing',
          paymentMethod: 'crypto_wallet',
        },
        user: {
          _id: new Types.ObjectId(validUserId),
          firstName: 'Alex',
          lastName: 'Mercer',
          email: 'alex@example.com',
        },
      };

      mockPaymentModel.findById.mockReturnValueOnce(
        createExecChain(mockPayment),
      );
      mockPaymentModel.find.mockReturnValueOnce(
        createExecChain([
          mockPayment,
          {
            _id: new Types.ObjectId(),
            paymentReference: 'PAY-0',
            attemptNumber: 1,
            verificationStatus: 'failed',
            expectedAmount: '100000000000000000',
            failureReason: 'Reverted',
            createdAt: new Date(),
          },
        ]),
      );

      const detail = await service.findTransactionById(validPaymentId);
      expect(detail.source).toBe('payment');
      expect(detail.attemptHistory).toHaveLength(2);
      expect(detail.order?.orderNumber).toBe('ORD-1001');
    });

    it('should fall back to COD order detail when payment ID is not in payments collection', async () => {
      mockPaymentModel.findById.mockReturnValueOnce(createExecChain(null));
      mockOrderModel.findOne.mockReturnValueOnce(
        createExecChain({
          _id: new Types.ObjectId(validOrderId),
          orderNumber: 'ORD-COD-9',
          paymentReference: 'PAY-COD-9',
          totalAmount: 35000,
          currency: 'USD',
          paymentStatus: 'paid',
          fulfilmentStatus: 'delivered',
          paymentMethod: 'cod',
          paidAt: new Date(),
          createdAt: new Date(),
          user: {
            _id: new Types.ObjectId(validUserId),
            firstName: 'Elena',
            lastName: 'Vance',
            email: 'elena@example.com',
          },
        }),
      );
      mockPaymentModel.find.mockReturnValueOnce(createExecChain([]));

      const detail = await service.findTransactionById(validOrderId);
      expect(detail.source).toBe('cod_order');
      expect(detail.status).toBe('paid');
      expect(detail.receivedAmount).toBe('35000');
    });

    it('should reject invalid ID and throw NotFoundException when missing', async () => {
      await expect(service.findTransactionById('invalid-id')).rejects.toThrow(
        BadRequestException,
      );

      mockPaymentModel.findById.mockReturnValueOnce(createExecChain(null));
      mockOrderModel.findOne.mockReturnValueOnce(createExecChain(null));
      await expect(
        service.findTransactionById(validPaymentId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
