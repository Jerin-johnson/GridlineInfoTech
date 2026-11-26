/// <reference types="jest" />
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { Types } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { BRAND_REPOSITORY } from '../src/modules/brands/constants/brand.constants';
import { CART_REPOSITORY } from '../src/modules/cart/constants/cart.constants';
import { CATEGORY_REPOSITORY } from '../src/modules/categories/constants/category.constants';
import { ORDER_REPOSITORY } from '../src/modules/orders/constants/order.constants';
import { PAYMENT_REPOSITORY } from '../src/modules/payments/constants/payment.constants';
import { BlockchainVerifierService } from '../src/modules/payments/services/blockchain-verifier.service';
import { PRODUCT_REPOSITORY } from '../src/modules/products/constants/product.constants';
import { USER_REPOSITORY } from '../src/modules/users/constants/user.constants';

describe('Crypto Payments API (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const userId = new Types.ObjectId().toString();
  const prodId = new Types.ObjectId().toString();
  const orderId1 = new Types.ObjectId().toString();
  const orderId2 = new Types.ObjectId().toString();
  const walletAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const merchantAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const tokenAddress = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238';
  const txHash1 =
    '0x1111111111111111111111111111111111111111111111111111111111111111';
  const txHash2 =
    '0x2222222222222222222222222222222222222222222222222222222222222222';
  const txHash3 =
    '0x3333333333333333333333333333333333333333333333333333333333333333';

  let productState: any;
  let ordersStore: any[];
  let paymentsStore: any[];

  const resetState = () => {
    productState = {
      _id: prodId,
      name: 'Brembo GT Brake Kit',
      slug: 'brembo-gt-brake-kit',
      sku: 'BRM-GT-01',
      price: 35000,
      stock: 5,
      reservedStock: 2,
      status: 'published',
    };

    ordersStore = [
      {
        _id: new Types.ObjectId(orderId1),
        orderNumber: 'ORD-20261126-111111',
        paymentReference: 'PAY-ORDER1',
        user: new Types.ObjectId(userId),
        customerEmail: 'alex@gridline.com',
        items: [
          {
            product: new Types.ObjectId(prodId),
            name: 'Brembo GT Brake Kit',
            sku: 'BRM-GT-01',
            slug: 'brembo-gt-brake-kit',
            unitPrice: 35000,
            quantity: 2,
            lineTotal: 70000,
          },
        ],
        shippingAddress: {
          addressId: new Types.ObjectId(),
          label: 'Home',
          fullName: 'Alex Vance',
          phone: '+1-555-0199',
          line1: '742 Evergreen Terrace',
          city: 'Springfield',
          state: 'IL',
          postalCode: '62704',
          country: 'US',
        },
        subtotal: 70000,
        shippingCost: 0,
        taxAmount: 0,
        totalAmount: 70000, // 700_000_000 USDC base units
        currency: 'USD',
        paymentMethod: 'crypto_wallet',
        paymentStatus: 'pending',
        fulfilmentStatus: 'placed',
        statusHistory: [],
        stockReserved: true,
        paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        toObject() {
          return { ...this };
        },
      },
      {
        _id: new Types.ObjectId(orderId2),
        orderNumber: 'ORD-20261126-222222',
        paymentReference: 'PAY-ORDER2',
        user: new Types.ObjectId(userId),
        customerEmail: 'alex@gridline.com',
        items: [
          {
            product: new Types.ObjectId(prodId),
            name: 'Brembo GT Brake Kit',
            sku: 'BRM-GT-01',
            slug: 'brembo-gt-brake-kit',
            unitPrice: 35000,
            quantity: 1,
            lineTotal: 35000,
          },
        ],
        shippingAddress: {
          addressId: new Types.ObjectId(),
          label: 'Home',
          fullName: 'Alex Vance',
          phone: '+1-555-0199',
          line1: '742 Evergreen Terrace',
          city: 'Springfield',
          state: 'IL',
          postalCode: '62704',
          country: 'US',
        },
        subtotal: 35000,
        shippingCost: 0,
        taxAmount: 0,
        totalAmount: 35000,
        currency: 'USD',
        paymentMethod: 'crypto_wallet',
        paymentStatus: 'pending',
        fulfilmentStatus: 'placed',
        statusHistory: [],
        stockReserved: true,
        paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        toObject() {
          return { ...this };
        },
      },
    ];

    paymentsStore = [];
  };

  const mockBlockchainVerifier = {
    verifyTransaction: jest.fn(),
  };

  const mockOrderRepository = {
    findByIdAndUser: jest.fn().mockImplementation((oId: string, uId: string) => {
      const found = ordersStore.find(
        (o) => o._id.toString() === oId && o.user.toString() === uId,
      );
      return Promise.resolve(found ?? null);
    }),
    updatePaymentStateAtomically: jest
      .fn()
      .mockImplementation((oId: string, uId: string, data: any) => {
        const found = ordersStore.find(
          (o) =>
            o._id.toString() === oId &&
            o.user.toString() === uId &&
            data.allowedCurrentPaymentStatuses.includes(o.paymentStatus) &&
            data.allowedCurrentFulfilmentStatuses.includes(o.fulfilmentStatus),
        );
        if (!found) return Promise.resolve(null);
        found.paymentStatus = data.paymentStatus;
        if (data.fulfilmentStatus !== undefined) {
          found.fulfilmentStatus = data.fulfilmentStatus;
        }
        if (data.stockReserved !== undefined) {
          found.stockReserved = data.stockReserved;
        }
        found.statusHistory.push({
          status: data.historyStatus,
          note: data.historyNote,
          actor: data.actor ?? 'system',
          changedAt: data.changedAt,
        });
        return Promise.resolve(found);
      }),
  };

  const mockProductRepository = {
    releaseStock: jest.fn().mockImplementation((id: string, qty: number) => {
      if (id !== prodId || productState.reservedStock < qty) {
        return Promise.resolve(false);
      }
      productState.reservedStock -= qty;
      return Promise.resolve(true);
    }),
    confirmStockDeduction: jest
      .fn()
      .mockImplementation((id: string, qty: number) => {
        if (
          id !== prodId ||
          productState.stock < qty ||
          productState.reservedStock < qty
        ) {
          return Promise.resolve(false);
        }
        productState.stock -= qty;
        productState.reservedStock -= qty;
        return Promise.resolve(true);
      }),
  };

  const mockPaymentRepository = {
    create: jest.fn().mockImplementation((data: any) => {
      const doc = {
        _id: new Types.ObjectId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject() {
          return { ...this };
        },
      };
      paymentsStore.push(doc);
      return Promise.resolve(doc);
    }),
    save: jest.fn().mockImplementation((doc: any) => {
      doc.updatedAt = new Date();
      return Promise.resolve(doc);
    }),
    findLatestByOrderAndUser: jest
      .fn()
      .mockImplementation((oId: string, uId: string) => {
        const matches = paymentsStore
          .filter(
            (p) => p.order.toString() === oId && p.user.toString() === uId,
          )
          .sort((a, b) => b.attemptNumber - a.attemptNumber);
        return Promise.resolve(matches[0] ?? null);
      }),
    findByOrderAndTxHash: jest
      .fn()
      .mockImplementation((oId: string, txHash: string) => {
        const found = paymentsStore.find(
          (p) =>
            p.order.toString() === oId &&
            p.transactionHash === txHash.toLowerCase(),
        );
        return Promise.resolve(found ?? null);
      }),
    findByChainAndTxHash: jest
      .fn()
      .mockImplementation((chainId: number, txHash: string) => {
        const found = paymentsStore.find(
          (p) =>
            p.chainId === chainId &&
            p.transactionHash === txHash.toLowerCase(),
        );
        return Promise.resolve(found ?? null);
      }),
    findVerifiedByOrder: jest.fn().mockImplementation((oId: string) => {
      const found = paymentsStore.find(
        (p) => p.order.toString() === oId && p.verificationStatus === 'verified',
      );
      return Promise.resolve(found ?? null);
    }),
    countByOrder: jest.fn().mockImplementation((oId: string) => {
      return Promise.resolve(
        paymentsStore.filter((p) => p.order.toString() === oId).length,
      );
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ORDER_REPOSITORY)
      .useValue(mockOrderRepository)
      .overrideProvider(PRODUCT_REPOSITORY)
      .useValue(mockProductRepository)
      .overrideProvider(PAYMENT_REPOSITORY)
      .useValue(mockPaymentRepository)
      .overrideProvider(BlockchainVerifierService)
      .useValue(mockBlockchainVerifier)
      .overrideProvider(USER_REPOSITORY)
      .useValue({ findById: jest.fn() })
      .overrideProvider(CART_REPOSITORY)
      .useValue({ findByUserId: jest.fn() })
      .overrideProvider(CATEGORY_REPOSITORY)
      .useValue({ findById: jest.fn(), findAll: jest.fn() })
      .overrideProvider(BRAND_REPOSITORY)
      .useValue({ findById: jest.fn(), findAll: jest.fn() })
      .compile();

    const configService = moduleFixture.get<ConfigService>(ConfigService);
    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      const overrides: Record<string, unknown> = {
        CRYPTO_CHAIN_ID: 11155111,
        CRYPTO_NETWORK: 'Sepolia',
        CRYPTO_TOKEN_SYMBOL: 'USDC',
        CRYPTO_TOKEN_ADDRESS: tokenAddress,
        CRYPTO_TOKEN_DECIMALS: 6,
        CRYPTO_REQUIRED_CONFIRMATIONS: 3,
        PAYMENT_WALLET_ADDRESS: merchantAddress,
        JWT_ACCESS_SECRET:
          process.env.JWT_ACCESS_SECRET ||
          'default-access-secret-for-jwt-testing-purposes-min-32-chars',
      };
      return overrides[key] ?? process.env[key];
    });

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  beforeEach(() => {
    resetState();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const signToken = () =>
    jwtService.sign(
      { sub: userId, email: 'alex@gridline.com', role: 'customer' },
      {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          'default-access-secret-for-jwt-testing-purposes-min-32-chars',
      },
    );

  describe('Public Config & Auth Enforcement', () => {
    it('GET /api/v1/payments/config - should be public and expose only safe config', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/payments/config')
        .expect(HttpStatus.OK);

      expect(res.body.data).toEqual({
        chainId: 11155111,
        network: 'Sepolia',
        token: 'USDC',
        tokenAddress,
        tokenDecimals: 6,
        destinationAddress: merchantAddress,
        requiredConfirmations: 3,
      });
      expect(res.body.data.rpcUrl).toBeUndefined();
    });

    it('should reject unauthenticated requests on protected payment routes', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .send({ orderId: orderId1, walletAddress })
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .post('/api/v1/payments/verify')
        .send({
          orderId: orderId1,
          transactionHash: txHash1,
          walletAddress,
          chainId: 11155111,
        })
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .get(`/api/v1/payments/order/${orderId1}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Payment Initiation & Verification Flows', () => {
    it('should initiate payment, reject underpaid attempt, allow retry, confirm, and finalize stock', async () => {
      const token = signToken();

      const initRes = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: orderId1, walletAddress, chainId: 11155111 })
        .expect(HttpStatus.OK);

      expect(initRes.body.data.expectedAmount).toBe('700000000');
      expect(initRes.body.data.verificationStatus).toBe('pending');

      // 1. Underpaid tx -> terminal rejection for txHash1
      mockBlockchainVerifier.verifyTransaction.mockResolvedValueOnce({
        outcome: 'underpaid',
        receivedAmount: '500000000',
        blockNumber: 100,
        confirmations: 5,
      });

      const underpaidRes = await request(app.getHttpServer())
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: orderId1,
          transactionHash: txHash1,
          walletAddress,
          chainId: 11155111,
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(underpaidRes.body.message).toBe(
        'Payment underpaid. Please send the correct amount.',
      );
      expect(underpaidRes.body.verificationStatus).toBe('underpaid');
      expect(productState.stock).toBe(5);
      expect(productState.reservedStock).toBe(2);

      // 2. Retry with txHash2 -> confirming (< 3 confirmations)
      mockBlockchainVerifier.verifyTransaction.mockResolvedValueOnce({
        outcome: 'valid',
        receivedAmount: '700000000',
        blockNumber: 101,
        confirmations: 1,
      });

      const confirmingRes = await request(app.getHttpServer())
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: orderId1,
          transactionHash: txHash2,
          walletAddress,
          chainId: 11155111,
        })
        .expect(HttpStatus.OK);

      expect(confirmingRes.body.data.verificationStatus).toBe('confirming');
      expect(ordersStore[0].paymentStatus).toBe('confirming');
      expect(productState.stock).toBe(5);

      // 3. Re-verify txHash2 with >= 3 confirmations -> verified & stock deducted
      mockBlockchainVerifier.verifyTransaction.mockResolvedValueOnce({
        outcome: 'valid',
        receivedAmount: '700000000',
        blockNumber: 101,
        confirmations: 3,
      });

      const verifiedRes = await request(app.getHttpServer())
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: orderId1,
          transactionHash: txHash2,
          walletAddress,
          chainId: 11155111,
        })
        .expect(HttpStatus.OK);

      expect(verifiedRes.body.data.verificationStatus).toBe('verified');
      expect(ordersStore[0].paymentStatus).toBe('paid');
      expect(ordersStore[0].fulfilmentStatus).toBe('payment_confirmed');
      expect(productState.stock).toBe(3);
      expect(productState.reservedStock).toBe(0);

      // 4. Idempotent re-verify -> 200 OK without double deduction
      await request(app.getHttpServer())
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: orderId1,
          transactionHash: txHash2,
          walletAddress,
          chainId: 11155111,
        })
        .expect(HttpStatus.OK);

      expect(productState.stock).toBe(3);

      // 5. Duplicate txHash2 on orderId2 -> 409 Conflict
      await request(app.getHttpServer())
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: orderId2,
          transactionHash: txHash2,
          walletAddress,
          chainId: 11155111,
        })
        .expect(HttpStatus.CONFLICT);
    });

    it('should reject overpaid tx immediately and record reconciliation when submitted after expiration', async () => {
      const token = signToken();

      // Overpaid on orderId1
      mockBlockchainVerifier.verifyTransaction.mockResolvedValueOnce({
        outcome: 'overpaid',
        receivedAmount: '900000000',
        blockNumber: 110,
        confirmations: 5,
      });

      const overpaidRes = await request(app.getHttpServer())
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: orderId1,
          transactionHash: txHash1,
          walletAddress,
          chainId: 11155111,
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(overpaidRes.body.message).toBe(
        'Payment amount exceeds the required amount. Please contact support.',
      );
      expect(overpaidRes.body.verificationStatus).toBe('overpaid');

      // Expired orderId2 with late txHash3 -> preserved for reconciliation
      ordersStore[1].paymentExpiresAt = new Date(Date.now() - 60_000);
      mockBlockchainVerifier.verifyTransaction.mockResolvedValueOnce({
        outcome: 'valid',
        receivedAmount: '350000000',
        blockNumber: 112,
        confirmations: 4,
      });

      const expiredRes = await request(app.getHttpServer())
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: orderId2,
          transactionHash: txHash3,
          walletAddress,
          chainId: 11155111,
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(expiredRes.body.verificationStatus).toBe('expired');
      expect(expiredRes.body.transactionHash).toBe(txHash3);
      expect(ordersStore[1].paymentStatus).toBe('expired');
      expect(ordersStore[1].fulfilmentStatus).toBe('cancelled');
    });
  });
});
