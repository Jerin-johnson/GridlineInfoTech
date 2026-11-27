import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../../orders/orders.service';
import { AdminPaymentsService } from '../admin-payments.service';
import { PAYMENT_REPOSITORY } from '../constants/payment.constants';

describe('AdminPaymentsService', () => {
  let service: AdminPaymentsService;

  const validPaymentId = '507f1f77bcf86cd799439011';
  const validOrderId = '507f1f77bcf86cd799439012';
  const validUserId = '507f1f77bcf86cd799439013';

  const mockPaymentRepository = {
    countFailedOrExpiredAttempts: jest.fn(),
    findAllForAdmin: jest.fn(),
    findByIdForAdmin: jest.fn(),
    findAllByOrderIdForAdmin: jest.fn(),
  };

  const mockOrdersService = {
    getPaymentRevenueSummaryForAdmin: jest.fn(),
    countFailedOrExpiredCodOrdersForAdmin: jest.fn(),
    findCodOrdersForAdminPayments: jest.fn(),
    findCodOrderByIdForAdminPayment: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminPaymentsService,
        {
          provide: PAYMENT_REPOSITORY,
          useValue: mockPaymentRepository,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    service = module.get<AdminPaymentsService>(AdminPaymentsService);
  });

  describe('getSummary', () => {
    it('should combine order-level revenue summary with failed/expired attempt counts', async () => {
      mockOrdersService.getPaymentRevenueSummaryForAdmin.mockResolvedValue({
        collectedRevenue: 150000,
        successfulPayments: 3,
        pendingPayments: 2,
        cryptoRevenue: 100000,
        codCollected: 50000,
      });
      mockPaymentRepository.countFailedOrExpiredAttempts.mockResolvedValue(4);
      mockOrdersService.countFailedOrExpiredCodOrdersForAdmin.mockResolvedValue(
        1,
      );

      const summary = await service.getSummary();

      expect(summary).toEqual({
        collectedRevenue: 150000,
        successfulPayments: 3,
        pendingPayments: 2,
        failedExpiredPayments: 5,
        cryptoRevenue: 100000,
        codCollected: 50000,
      });
    });

    it('should return zeroes when no orders or payments exist', async () => {
      mockOrdersService.getPaymentRevenueSummaryForAdmin.mockResolvedValue({
        collectedRevenue: 0,
        successfulPayments: 0,
        pendingPayments: 0,
        cryptoRevenue: 0,
        codCollected: 0,
      });
      mockPaymentRepository.countFailedOrExpiredAttempts.mockResolvedValue(0);
      mockOrdersService.countFailedOrExpiredCodOrdersForAdmin.mockResolvedValue(
        0,
      );

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
    it('should query only IPaymentRepository when paymentMethod is crypto_wallet', async () => {
      mockPaymentRepository.findAllForAdmin.mockResolvedValue({
        data: [
          {
            id: validPaymentId,
            paymentReference: 'PAY-1001',
            orderId: validOrderId,
            orderNumber: 'ORD-1001',
            customerId: validUserId,
            customerName: 'Alex Mercer',
            customerEmail: 'alex@example.com',
            paymentMethod: 'crypto_wallet',
            currency: 'USD',
            orderTotalAmount: 50000,
            expectedAmount: '500000000',
            token: 'USDC',
            tokenDecimals: 6,
            network: 'Sepolia',
            chainId: 11155111,
            status: 'verified',
            confirmations: 3,
            requiredConfirmations: 3,
            attemptNumber: 1,
            expiresAt: new Date('2026-11-27T12:00:00Z'),
            createdAt: new Date('2026-11-27T11:00:00Z'),
          },
        ],
        total: 1,
      });

      const res = await service.findAllTransactions({
        page: 1,
        limit: 15,
        paymentMethod: 'crypto_wallet',
        status: 'verified',
        search: 'ORD-1001',
      });

      expect(mockPaymentRepository.findAllForAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'verified', search: 'ORD-1001' }),
        { page: 1, limit: 15 },
      );
      expect(
        mockOrdersService.findCodOrdersForAdminPayments,
      ).not.toHaveBeenCalled();
      expect(res.data[0].source).toBe('payment');
      expect(res.meta).toEqual({ page: 1, limit: 15, total: 1, totalPages: 1 });
    });

    it('should query only OrdersService when paymentMethod is cod', async () => {
      mockOrdersService.findCodOrdersForAdminPayments.mockResolvedValue({
        data: [
          {
            id: validOrderId,
            orderNumber: 'ORD-COD-1',
            paymentReference: 'PAY-COD-1',
            customerId: validUserId,
            customerName: 'Elena Vance',
            customerEmail: 'elena@example.com',
            paymentMethod: 'cod',
            currency: 'USD',
            orderTotalAmount: 35000,
            paymentStatus: 'paid',
            fulfilmentStatus: 'delivered',
            paidAt: new Date('2026-11-27T12:00:00Z'),
            createdAt: new Date('2026-11-27T10:00:00Z'),
          },
        ],
        total: 1,
      });

      const res = await service.findAllTransactions({
        page: 1,
        limit: 15,
        paymentMethod: 'cod',
      });

      expect(
        mockOrdersService.findCodOrdersForAdminPayments,
      ).toHaveBeenCalledWith(expect.any(Object), { page: 1, limit: 15 });
      expect(mockPaymentRepository.findAllForAdmin).not.toHaveBeenCalled();
      expect(res.data[0].source).toBe('cod_order');
    });

    it('should merge-sort bounded windows from crypto and COD when paymentMethod is all', async () => {
      mockPaymentRepository.findAllForAdmin.mockResolvedValue({
        data: [
          {
            id: validPaymentId,
            paymentReference: 'PAY-NEW',
            orderId: validOrderId,
            orderNumber: 'ORD-2',
            customerId: validUserId,
            customerName: 'A',
            customerEmail: 'a@example.com',
            paymentMethod: 'crypto_wallet',
            currency: 'USD',
            orderTotalAmount: 10000,
            expectedAmount: '100',
            token: 'USDC',
            tokenDecimals: 6,
            network: 'Sepolia',
            chainId: 11155111,
            status: 'verified',
            confirmations: 3,
            requiredConfirmations: 3,
            attemptNumber: 1,
            expiresAt: new Date(),
            createdAt: new Date('2026-11-27T12:00:00Z'),
          },
          {
            id: '507f1f77bcf86cd799439099',
            paymentReference: 'PAY-OLD',
            orderId: validOrderId,
            orderNumber: 'ORD-0',
            customerId: validUserId,
            customerName: 'A',
            customerEmail: 'a@example.com',
            paymentMethod: 'crypto_wallet',
            currency: 'USD',
            orderTotalAmount: 10000,
            expectedAmount: '100',
            token: 'USDC',
            tokenDecimals: 6,
            network: 'Sepolia',
            chainId: 11155111,
            status: 'failed',
            confirmations: 0,
            requiredConfirmations: 3,
            attemptNumber: 1,
            expiresAt: new Date(),
            createdAt: new Date('2026-11-27T08:00:00Z'),
          },
        ],
        total: 2,
      });

      mockOrdersService.findCodOrdersForAdminPayments.mockResolvedValue({
        data: [
          {
            id: validOrderId,
            orderNumber: 'ORD-1',
            paymentReference: 'PAY-MID',
            customerId: validUserId,
            customerName: 'B',
            customerEmail: 'b@example.com',
            paymentMethod: 'cod',
            currency: 'USD',
            orderTotalAmount: 20000,
            paymentStatus: 'pending',
            fulfilmentStatus: 'placed',
            createdAt: new Date('2026-11-27T10:00:00Z'),
          },
        ],
        total: 1,
      });

      const res = await service.findAllTransactions({
        page: 2,
        limit: 1,
        paymentMethod: 'all',
      });

      expect(mockPaymentRepository.findAllForAdmin).toHaveBeenCalledWith(
        expect.any(Object),
        { page: 1, limit: 2 },
      );
      expect(res.data).toHaveLength(1);
      expect(res.data[0].paymentReference).toBe('PAY-MID');
      expect(res.meta).toEqual({ page: 2, limit: 1, total: 3, totalPages: 3 });
    });

    it('should reject invalid date range and excessive combined window depth', async () => {
      await expect(
        service.findAllTransactions({
          dateFrom: '2026-12-10',
          dateTo: '2026-12-01',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.findAllTransactions({
          page: 50,
          limit: 50,
          paymentMethod: 'all',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findTransactionById', () => {
    it('should return crypto payment detail with attempt history', async () => {
      mockPaymentRepository.findByIdForAdmin.mockResolvedValue({
        id: validPaymentId,
        paymentReference: 'PAY-1',
        orderPaymentReference: 'ORDPAY-1',
        attemptNumber: 2,
        order: {
          id: validOrderId,
          orderNumber: 'ORD-1001',
          totalAmount: 50000,
          currency: 'USD',
          paymentStatus: 'paid',
          fulfilmentStatus: 'processing',
          paymentMethod: 'crypto_wallet',
        },
        customer: {
          id: validUserId,
          name: 'Alex Mercer',
          email: 'alex@example.com',
        },
        paymentMethod: 'crypto_wallet',
        expectedAmount: '500000000',
        currency: 'USD',
        orderTotalAmount: 50000,
        status: 'verified',
        chainId: 11155111,
        network: 'Sepolia',
        token: 'USDC',
        tokenDecimals: 6,
        destinationAddress: '0xdest',
        walletAddress: '0xuser',
        confirmations: 3,
        requiredConfirmations: 3,
        expiresAt: new Date(),
      });
      mockPaymentRepository.findAllByOrderIdForAdmin.mockResolvedValue([
        {
          id: validPaymentId,
          paymentReference: 'PAY-1',
          attemptNumber: 2,
          status: 'verified',
          expectedAmount: '500000000',
        },
      ]);

      const detail = await service.findTransactionById(validPaymentId);
      expect(detail.source).toBe('payment');
      expect(detail.attemptHistory).toHaveLength(1);
    });

    it('should fall back to OrdersService COD lookup when not in paymentRepository', async () => {
      mockPaymentRepository.findByIdForAdmin.mockResolvedValue(null);
      mockOrdersService.findCodOrderByIdForAdminPayment.mockResolvedValue({
        id: validOrderId,
        orderNumber: 'ORD-COD-9',
        paymentReference: 'PAY-COD-9',
        customerId: validUserId,
        customerName: 'Elena Vance',
        customerEmail: 'elena@example.com',
        paymentMethod: 'cod',
        currency: 'USD',
        orderTotalAmount: 35000,
        paymentStatus: 'paid',
        fulfilmentStatus: 'delivered',
        paidAt: new Date(),
        createdAt: new Date(),
      });
      mockPaymentRepository.findAllByOrderIdForAdmin.mockResolvedValue([]);

      const detail = await service.findTransactionById(validOrderId);
      expect(detail.source).toBe('cod_order');
      expect(detail.receivedAmount).toBe('35000');
    });

    it('should reject invalid ID and throw NotFoundException when missing', async () => {
      await expect(service.findTransactionById('invalid')).rejects.toThrow(
        BadRequestException,
      );

      mockPaymentRepository.findByIdForAdmin.mockResolvedValue(null);
      mockOrdersService.findCodOrderByIdForAdminPayment.mockResolvedValue(null);
      await expect(service.findTransactionById(validPaymentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
