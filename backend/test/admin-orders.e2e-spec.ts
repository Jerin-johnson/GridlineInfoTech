/// <reference types="jest" />
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
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
import { PRODUCT_REPOSITORY } from '../src/modules/products/constants/product.constants';
import { USER_REPOSITORY } from '../src/modules/users/constants/user.constants';

describe('Admin Order Management API (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const adminId = new Types.ObjectId().toString();
  const customerId = new Types.ObjectId().toString();
  const prodId = new Types.ObjectId().toString();
  const paidOrderId = new Types.ObjectId().toString();
  const unpaidOrderId = new Types.ObjectId().toString();

  let productState: any;
  let ordersStore: any[];

  const resetState = () => {
    productState = {
      _id: prodId,
      stock: 10,
      reservedStock: 2,
    };

    ordersStore = [
      {
        _id: new Types.ObjectId(paidOrderId),
        orderNumber: 'ORD-20261126-PAID01',
        paymentReference: 'PAY-PAID01',
        user: {
          _id: new Types.ObjectId(customerId),
          firstName: 'Alex',
          lastName: 'Vance',
          email: 'alex@gridline.com',
          phone: '+1-555-0199',
        },
        customerEmail: 'alex@gridline.com',
        items: [
          {
            product: new Types.ObjectId(prodId),
            name: 'Brembo Brake Kit',
            sku: 'BRM-01',
            slug: 'brembo-brake-kit',
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
        paymentStatus: 'paid',
        fulfilmentStatus: 'payment_confirmed',
        statusHistory: [
          {
            status: 'placed',
            note: 'Order placed',
            actor: 'customer',
            changedAt: new Date(),
          },
          {
            status: 'payment_confirmed',
            note: 'Crypto payment verified',
            actor: 'system',
            changedAt: new Date(),
          },
        ],
        stockReserved: false,
        paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject() {
          return { ...this };
        },
      },
      {
        _id: new Types.ObjectId(unpaidOrderId),
        orderNumber: 'ORD-20261126-UNPD02',
        paymentReference: 'PAY-UNPD02',
        user: null,
        customerEmail: 'deleted@gridline.com',
        items: [
          {
            product: new Types.ObjectId(prodId),
            name: 'Brembo Brake Kit',
            sku: 'BRM-01',
            slug: 'brembo-brake-kit',
            unitPrice: 35000,
            quantity: 2,
            lineTotal: 70000,
          },
        ],
        shippingAddress: {
          addressId: new Types.ObjectId(),
          label: 'Home',
          fullName: 'Former User',
          phone: '+1-555-0100',
          line1: '100 Main St',
          city: 'Austin',
          state: 'TX',
          postalCode: '78701',
          country: 'US',
        },
        subtotal: 70000,
        shippingCost: 0,
        taxAmount: 0,
        totalAmount: 70000,
        currency: 'USD',
        paymentMethod: 'crypto_wallet',
        paymentStatus: 'pending',
        fulfilmentStatus: 'placed',
        statusHistory: [],
        stockReserved: true,
        paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(Date.now() - 10_000),
        updatedAt: new Date(Date.now() - 10_000),
        toObject() {
          return { ...this };
        },
      },
    ];
  };

  const mockOrderRepository = {
    findAllForAdmin: jest
      .fn()
      .mockImplementation((filter: any, options: { page: number; limit: number }) => {
        let filtered = [...ordersStore];
        if (filter.fulfilmentStatus) {
          filtered = filtered.filter(
            (o) => o.fulfilmentStatus === filter.fulfilmentStatus,
          );
        }
        if (filter.paymentStatus) {
          filtered = filtered.filter(
            (o) => o.paymentStatus === filter.paymentStatus,
          );
        }
        if (filter.search) {
          const q = filter.search.toLowerCase();
          filtered = filtered.filter(
            (o) =>
              o.orderNumber.toLowerCase().includes(q) ||
              o.customerEmail.toLowerCase().includes(q),
          );
        }
        const skip = (options.page - 1) * options.limit;
        return Promise.resolve({
          data: filtered.slice(skip, skip + options.limit),
          total: filtered.length,
        });
      }),
    findByIdForAdmin: jest.fn().mockImplementation((oId: string) => {
      const found = ordersStore.find((o) => o._id.toString() === oId);
      return Promise.resolve(found ?? null);
    }),
    updateAdminStatusAtomically: jest
      .fn()
      .mockImplementation((oId: string, data: any) => {
        const found = ordersStore.find(
          (o) =>
            o._id.toString() === oId &&
            o.fulfilmentStatus === data.expectedCurrentStatus &&
            (!data.allowedPaymentStatuses ||
              data.allowedPaymentStatuses.includes(o.paymentStatus)),
        );
        if (!found) return Promise.resolve(null);
        found.fulfilmentStatus = data.fulfilmentStatus;
        if (data.shippingProvider !== undefined) {
          found.shippingProvider = data.shippingProvider;
        }
        if (data.trackingNumber !== undefined) {
          found.trackingNumber = data.trackingNumber;
        }
        if (data.trackingUrl !== undefined) {
          found.trackingUrl = data.trackingUrl;
        }
        if (data.shippedAt !== undefined) found.shippedAt = data.shippedAt;
        if (data.deliveredAt !== undefined) found.deliveredAt = data.deliveredAt;
        if (data.cancelledAt !== undefined) found.cancelledAt = data.cancelledAt;
        if (data.cancellationReason !== undefined) {
          found.cancellationReason = data.cancellationReason;
        }
        if (data.stockReserved !== undefined) {
          found.stockReserved = data.stockReserved;
        }
        found.statusHistory.push({
          status: data.fulfilmentStatus,
          note: data.historyNote,
          actor: `admin:${data.adminUserId}`,
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
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ORDER_REPOSITORY)
      .useValue(mockOrderRepository)
      .overrideProvider(PRODUCT_REPOSITORY)
      .useValue(mockProductRepository)
      .overrideProvider(USER_REPOSITORY)
      .useValue({ findById: jest.fn() })
      .overrideProvider(CART_REPOSITORY)
      .useValue({ findByUserId: jest.fn() })
      .overrideProvider(CATEGORY_REPOSITORY)
      .useValue({ findById: jest.fn(), findAll: jest.fn() })
      .overrideProvider(BRAND_REPOSITORY)
      .useValue({ findById: jest.fn(), findAll: jest.fn() })
      .compile();

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

  const signToken = (sub: string, role: 'admin' | 'customer') =>
    jwtService.sign(
      { sub, email: `${role}@gridline.com`, role },
      {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          'default-access-secret-for-jwt-testing-purposes-min-32-chars',
      },
    );

  describe('Authorization Enforcement', () => {
    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/orders')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 403 Forbidden when accessed by a customer', async () => {
      const customerToken = signToken(customerId, 'customer');

      await request(app.getHttpServer())
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(HttpStatus.FORBIDDEN);

      await request(app.getHttpServer())
        .get(`/api/v1/admin/orders/${paidOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(HttpStatus.FORBIDDEN);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${paidOrderId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ fulfilmentStatus: 'processing' })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('Admin Order Listing, Search & Detail', () => {
    it('should list, search by orderNumber, filter by status, and view detail even when user is null', async () => {
      const adminToken = signToken(adminId, 'admin');

      const allRes = await request(app.getHttpServer())
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
      expect(allRes.body.data).toHaveLength(2);
      expect(allRes.body.meta.total).toBe(2);

      const searchRes = await request(app.getHttpServer())
        .get('/api/v1/admin/orders?search=PAID01&paymentStatus=paid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
      expect(searchRes.body.data).toHaveLength(1);
      expect(searchRes.body.data[0].orderNumber).toBe('ORD-20261126-PAID01');

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/admin/orders/${unpaidOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
      expect(detailRes.body.data.customer).toBeNull();
      expect(detailRes.body.data.customerEmail).toBe('deleted@gridline.com');
    });
  });

  describe('Admin Fulfilment Transitions', () => {
    it('should reject non-whitelisted paymentStatus, invalid trackingUrl, missing tracking on shipped, and invalid transitions', async () => {
      const adminToken = signToken(adminId, 'admin');

      // Cannot mutate paymentStatus
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${unpaidOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fulfilmentStatus: 'processing', paymentStatus: 'paid' })
        .expect(HttpStatus.BAD_REQUEST);

      // Cannot advance unpaid order
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${unpaidOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fulfilmentStatus: 'processing' })
        .expect(HttpStatus.BAD_REQUEST);

      // Cannot cancel paid order
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${paidOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fulfilmentStatus: 'cancelled' })
        .expect(HttpStatus.BAD_REQUEST);

      // Valid transition: payment_confirmed -> processing
      const procRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${paidOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fulfilmentStatus: 'processing', note: 'Packing started' })
        .expect(HttpStatus.OK);
      expect(procRes.body.data.fulfilmentStatus).toBe('processing');

      // Shipped requires shippingProvider and trackingNumber
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${paidOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fulfilmentStatus: 'shipped' })
        .expect(HttpStatus.BAD_REQUEST);

      // Invalid trackingUrl rejected
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${paidOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fulfilmentStatus: 'shipped',
          shippingProvider: 'DHL',
          trackingNumber: 'DHL-123',
          trackingUrl: 'not-a-url',
        })
        .expect(HttpStatus.BAD_REQUEST);

      // Valid shipped -> out_for_delivery -> delivered
      const shipRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${paidOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fulfilmentStatus: 'shipped',
          shippingProvider: 'DHL',
          trackingNumber: 'DHL-123',
          trackingUrl: 'https://dhl.com/track/DHL-123',
        })
        .expect(HttpStatus.OK);
      expect(shipRes.body.data.trackingNumber).toBe('DHL-123');
      expect(shipRes.body.data.shippedAt).toBeDefined();

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${paidOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fulfilmentStatus: 'out_for_delivery' })
        .expect(HttpStatus.OK);

      const delivRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${paidOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fulfilmentStatus: 'delivered' })
        .expect(HttpStatus.OK);
      expect(delivRes.body.data.fulfilmentStatus).toBe('delivered');
      expect(delivRes.body.data.deliveredAt).toBeDefined();

      // Terminal delivered cannot transition further
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${paidOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fulfilmentStatus: 'shipped' })
        .expect(HttpStatus.BAD_REQUEST);

      // Cancelling unpaid placed order releases reserved stock
      const cancelRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${unpaidOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fulfilmentStatus: 'cancelled', note: 'Customer abandoned' })
        .expect(HttpStatus.OK);
      expect(cancelRes.body.data.fulfilmentStatus).toBe('cancelled');
      expect(cancelRes.body.data.stockReserved).toBe(false);
      expect(productState.reservedStock).toBe(0);
    });
  });
});
