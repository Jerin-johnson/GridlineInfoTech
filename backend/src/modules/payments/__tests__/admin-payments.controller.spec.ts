import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../../auth/constants/auth.constants';
import { AdminPaymentsController } from '../admin-payments.controller';
import { AdminPaymentsService } from '../admin-payments.service';
import { AdminPaymentQueryDto } from '../dto/admin-payment-query.dto';
import { ReconcilePaymentDto } from '../dto/reconcile-payment.dto';

describe('AdminPaymentsController', () => {
  let controller: AdminPaymentsController;

  const mockService = {
    getSummary: jest.fn(),
    findAllTransactions: jest.fn(),
    findTransactionById: jest.fn(),
    reconcileTransaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPaymentsController],
      providers: [
        {
          provide: AdminPaymentsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AdminPaymentsController>(AdminPaymentsController);
  });

  it('should require admin role via @Roles("admin") metadata', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminPaymentsController);
    expect(roles).toEqual(['admin']);
  });

  it('should return payment summary', async () => {
    mockService.getSummary.mockResolvedValue({
      collectedRevenue: 10000,
      successfulPayments: 1,
      pendingPayments: 0,
      failedExpiredPayments: 0,
      cryptoRevenue: 10000,
      codCollected: 0,
    });

    const res = await controller.getSummary();
    expect(res.message).toBe('Payment summary retrieved successfully');
    expect(res.data.collectedRevenue).toBe(10000);
  });

  it('should reject invalid query parameters in AdminPaymentQueryDto', async () => {
    const dto = plainToInstance(AdminPaymentQueryDto, {
      status: 'bogus_status',
      paymentMethod: 'credit_card',
      dateFrom: 'not-a-date',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it('should delegate reconcileTransaction to AdminPaymentsService', async () => {
    mockService.reconcileTransaction.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      status: 'verified',
    });

    const res = await controller.reconcileTransaction(
      '507f1f77bcf86cd799439011',
      { action: 'fulfill', note: 'Confirmed' },
      '507f1f77bcf86cd799439013',
    );

    expect(mockService.reconcileTransaction).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      { action: 'fulfill', note: 'Confirmed' },
      '507f1f77bcf86cd799439013',
    );
    expect(res.message).toBe('Expired payment reconciled and order fulfilled');
  });

  it('should validate ReconcilePaymentDto for fulfill and refund actions', async () => {
    const validFulfill = plainToInstance(ReconcilePaymentDto, {
      action: 'fulfill',
    });
    expect(await validate(validFulfill)).toHaveLength(0);

    const invalidRefund = plainToInstance(ReconcilePaymentDto, {
      action: 'refund',
    });
    expect((await validate(invalidRefund)).length).toBeGreaterThanOrEqual(1);

    const validRefund = plainToInstance(ReconcilePaymentDto, {
      action: 'refund',
      refundTxHash: '0x' + 'b'.repeat(64),
    });
    expect(await validate(validRefund)).toHaveLength(0);
  });
});
