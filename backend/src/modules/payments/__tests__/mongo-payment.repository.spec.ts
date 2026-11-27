import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { MongoPaymentRepository } from '../repositories/mongo-payment.repository';
import { Payment } from '../schemas/payment.schema';

describe('MongoPaymentRepository (Admin Queries)', () => {
  let repository: MongoPaymentRepository;

  const validPaymentId = new Types.ObjectId().toHexString();
  const validOrderId = new Types.ObjectId().toHexString();
  const validUserId = new Types.ObjectId().toHexString();

  const createExecChain = (resolvedValue: unknown) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(resolvedValue),
  });

  const mockPaymentModel = {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoPaymentRepository,
        {
          provide: getModelToken(Payment.name),
          useValue: mockPaymentModel,
        },
      ],
    }).compile();

    repository = module.get<MongoPaymentRepository>(MongoPaymentRepository);
  });

  it('should count failed and expired payment attempts', async () => {
    mockPaymentModel.countDocuments.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(3),
    });

    const count = await repository.countFailedOrExpiredAttempts();
    expect(count).toBe(3);
    expect(mockPaymentModel.countDocuments).toHaveBeenCalledWith({
      verificationStatus: {
        $in: expect.arrayContaining(['failed', 'expired', 'underpaid']),
      },
    });
  });

  it('should execute bounded paginated aggregation in findAllForAdmin', async () => {
    mockPaymentModel.aggregate.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue([
        {
          data: [
            {
              id: validPaymentId,
              paymentReference: 'PAY-1',
              orderNumber: 'ORD-1',
              status: 'verified',
            },
          ],
          total: [{ count: 1 }],
        },
      ]),
    });

    const res = await repository.findAllForAdmin(
      { status: 'verified', search: 'ORD-1' },
      { page: 1, limit: 15 },
    );

    expect(res.data).toHaveLength(1);
    expect(res.total).toBe(1);
  });

  it('should map populated payment document to plain AdminCryptoPaymentDetailRecord in findByIdForAdmin', async () => {
    mockPaymentModel.findById.mockReturnValueOnce(
      createExecChain({
        _id: new Types.ObjectId(validPaymentId),
        paymentReference: 'PAY-1',
        orderPaymentReference: 'ORDPAY-1',
        attemptNumber: 1,
        paymentMethod: 'crypto_wallet',
        chainId: 11155111,
        network: 'Sepolia',
        token: 'USDC',
        tokenDecimals: 6,
        destinationAddress: '0xdest',
        walletAddress: '0xuser',
        expectedAmount: '500000000',
        confirmations: 3,
        requiredConfirmations: 3,
        verificationStatus: 'verified',
        expiresAt: new Date(),
        order: {
          _id: new Types.ObjectId(validOrderId),
          orderNumber: 'ORD-1',
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
      }),
    );

    const detail = await repository.findByIdForAdmin(validPaymentId);
    expect(detail?.id).toBe(validPaymentId);
    expect(detail?.order?.orderNumber).toBe('ORD-1');
    expect(detail?.customer?.name).toBe('Alex Mercer');
  });

  it('should return sorted plain attempt records in findAllByOrderIdForAdmin', async () => {
    mockPaymentModel.find.mockReturnValueOnce(
      createExecChain([
        {
          _id: new Types.ObjectId(validPaymentId),
          paymentReference: 'PAY-2',
          attemptNumber: 2,
          verificationStatus: 'verified',
          expectedAmount: '500000000',
        },
      ]),
    );

    const attempts = await repository.findAllByOrderIdForAdmin(validOrderId);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].attemptNumber).toBe(2);
    expect(attempts[0].status).toBe('verified');
  });
});
