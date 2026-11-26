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

describe('Checkout & Orders API (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const userId = new Types.ObjectId().toString();
  const otherUserId = new Types.ObjectId().toString();
  const addressId = new Types.ObjectId().toString();
  const otherUserAddressId = new Types.ObjectId().toString();
  const prodId = new Types.ObjectId().toString();

  let productState: any;
  let userCart: any;
  let ordersStore: any[];

  const resetState = () => {
    productState = {
      _id: prodId,
      name: 'Brembo GT Brake Kit',
      slug: 'brembo-gt-brake-kit',
      sku: 'BRM-GT-01',
      price: 35000,
      currency: 'USD',
      stock: 5,
      reservedStock: 0,
      status: 'published',
      images: [{ url: 'https://img.com/brembo.jpg', isPrimary: true }],
      toObject() {
        return { ...this };
      },
    };

    userCart = {
      _id: new Types.ObjectId().toString(),
      user: new Types.ObjectId(userId),
      items: [],
    };

    ordersStore = [];
  };

  const mockUsers = {
    [userId]: {
      _id: new Types.ObjectId(userId),
      firstName: 'Alex',
      lastName: 'Vance',
      email: 'alex@gridline.com',
      authProvider: 'local',
      role: 'customer',
      isActive: true,
      isEmailVerified: true,
      addresses: [
        {
          _id: new Types.ObjectId(addressId),
          label: 'Home',
          fullName: 'Alex Vance',
          phone: '+1-555-0199',
          line1: '742 Evergreen Terrace',
          line2: 'Apt 4B',
          city: 'Springfield',
          state: 'IL',
          postalCode: '62704',
          country: 'US',
          isDefault: true,
        },
      ],
    },
    [otherUserId]: {
      _id: new Types.ObjectId(otherUserId),
      firstName: 'Other',
      lastName: 'User',
      email: 'other@gridline.com',
      authProvider: 'local',
      role: 'customer',
      isActive: true,
      isEmailVerified: true,
      addresses: [
        {
          _id: new Types.ObjectId(otherUserAddressId),
          label: 'Work',
          fullName: 'Other User',
          phone: '+1-555-0200',
          line1: '100 Main St',
          city: 'Austin',
          state: 'TX',
          postalCode: '78701',
          country: 'US',
          isDefault: true,
        },
      ],
    },
  };

  const mockUserRepository = {
    findById: jest.fn().mockImplementation((id: string) => {
      return Promise.resolve(mockUsers[id] ?? null);
    }),
    findByEmail: jest.fn().mockResolvedValue(null),
    findByEmailWithPassword: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCartRepository = {
    findByUserId: jest.fn().mockImplementation((uId: string) => {
      if (uId === userId) {
        return Promise.resolve(userCart);
      }
      return Promise.resolve(null);
    }),
    create: jest.fn().mockImplementation((uId: string) => {
      const cart = {
        _id: new Types.ObjectId().toString(),
        user: new Types.ObjectId(uId),
        items: [],
      };
      if (uId === userId) userCart = cart;
      return Promise.resolve(cart);
    }),
    save: jest.fn().mockImplementation((cart: any) => {
      if (cart.user.toString() === userId) userCart = cart;
      return Promise.resolve(cart);
    }),
    clear: jest.fn().mockImplementation((uId: string) => {
      if (uId === userId) {
        userCart.items = [];
        return Promise.resolve(userCart);
      }
      return Promise.resolve(null);
    }),
  };

  const mockProductRepository = {
    findById: jest.fn().mockImplementation((id: string) => {
      if (id === prodId) {
        return Promise.resolve(productState);
      }
      return Promise.resolve(null);
    }),
    findBySlug: jest.fn().mockResolvedValue(null),
    findBySku: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    countByCategory: jest.fn().mockResolvedValue(0),
    countByBrand: jest.fn().mockResolvedValue(0),
    reserveStock: jest
      .fn()
      .mockImplementation((id: string, quantity: number) => {
        if (id !== prodId || productState.status !== 'published') {
          return Promise.resolve(false);
        }
        const available = productState.stock - productState.reservedStock;
        if (available < quantity) {
          return Promise.resolve(false);
        }
        productState.reservedStock += quantity;
        return Promise.resolve(true);
      }),
    releaseStock: jest
      .fn()
      .mockImplementation((id: string, quantity: number) => {
        if (id !== prodId || productState.reservedStock < quantity) {
          return Promise.resolve(false);
        }
        productState.reservedStock -= quantity;
        return Promise.resolve(true);
      }),
  };

  const mockOrderRepository = {
    create: jest.fn().mockImplementation((data: any) => {
      if (
        data.idempotencyKey &&
        ordersStore.some(
          (o) =>
            o.user.toString() === data.user.toString() &&
            o.idempotencyKey === data.idempotencyKey,
        )
      ) {
        return Promise.reject({ code: 11000 });
      }
      const doc = {
        _id: new Types.ObjectId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject() {
          return { ...this };
        },
      };
      ordersStore.push(doc);
      return Promise.resolve(doc);
    }),
    findByIdAndUser: jest
      .fn()
      .mockImplementation((orderId: string, uId: string) => {
        const found = ordersStore.find(
          (o) => o._id.toString() === orderId && o.user.toString() === uId,
        );
        return Promise.resolve(found ?? null);
      }),
    findByIdempotencyKey: jest
      .fn()
      .mockImplementation((uId: string, key: string) => {
        const found = ordersStore.find(
          (o) => o.user.toString() === uId && o.idempotencyKey === key,
        );
        return Promise.resolve(found ?? null);
      }),
    findAllByUser: jest
      .fn()
      .mockImplementation(
        (uId: string, filter: any, options: { page: number; limit: number }) => {
          let filtered = ordersStore.filter((o) => o.user.toString() === uId);
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
          const skip = (options.page - 1) * options.limit;
          return Promise.resolve({
            data: filtered.slice(skip, skip + options.limit),
            total: filtered.length,
          });
        },
      ),
    cancelOrderAtomically: jest
      .fn()
      .mockImplementation((orderId: string, uId: string, data: any) => {
        const found = ordersStore.find(
          (o) =>
            o._id.toString() === orderId &&
            o.user.toString() === uId &&
            o.fulfilmentStatus === 'placed' &&
            ['pending', 'failed'].includes(o.paymentStatus),
        );
        if (!found) {
          return Promise.resolve(null);
        }
        found.fulfilmentStatus = 'cancelled';
        found.stockReserved = false;
        found.cancelledAt = data.cancelledAt;
        if (data.reason) {
          found.cancellationReason = data.reason;
        }
        found.statusHistory.push({
          status: 'cancelled',
          note: data.historyNote,
          actor: 'customer',
          changedAt: data.cancelledAt,
        });
        return Promise.resolve(found);
      }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(mockUserRepository)
      .overrideProvider(CART_REPOSITORY)
      .useValue(mockCartRepository)
      .overrideProvider(PRODUCT_REPOSITORY)
      .useValue(mockProductRepository)
      .overrideProvider(ORDER_REPOSITORY)
      .useValue(mockOrderRepository)
      .overrideProvider(CATEGORY_REPOSITORY)
      .useValue({
        findById: jest.fn().mockResolvedValue(null),
        findAll: jest.fn().mockResolvedValue([]),
      })
      .overrideProvider(BRAND_REPOSITORY)
      .useValue({
        findById: jest.fn().mockResolvedValue(null),
        findAll: jest.fn().mockResolvedValue([]),
      })
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

  const signToken = (sub: string, email: string) =>
    jwtService.sign(
      { sub, email, role: 'customer' },
      {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          'default-access-secret-for-jwt-testing-purposes-min-32-chars',
      },
    );

  describe('Authentication Enforcement', () => {
    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .send({ addressId })
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .get('/api/v1/orders')
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .get(`/api/v1/orders/${new Types.ObjectId().toString()}`)
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .post(`/api/v1/orders/${new Types.ObjectId().toString()}/cancel`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /api/v1/checkout', () => {
    it('should reject non-whitelisted fields like price or totalAmount with 400', async () => {
      const token = signToken(userId, 'alex@gridline.com');
      await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId, totalAmount: 1 })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject checkout with an empty cart (400)', async () => {
      const token = signToken(userId, 'alex@gridline.com');
      await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject checkout with an address belonging to another user (404)', async () => {
      const token = signToken(userId, 'alex@gridline.com');
      userCart.items = [{ product: new Types.ObjectId(prodId), quantity: 1 }];

      await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId: otherUserAddressId })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject unavailable or non-published product (400)', async () => {
      const token = signToken(userId, 'alex@gridline.com');
      productState.status = 'draft';
      userCart.items = [{ product: new Types.ObjectId(prodId), quantity: 1 }];

      await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject insufficient stock (409)', async () => {
      const token = signToken(userId, 'alex@gridline.com');
      userCart.items = [{ product: new Types.ObjectId(prodId), quantity: 10 }];

      await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId })
        .expect(HttpStatus.CONFLICT);
    });

    it('should create an order with snapshots, pending payment, reserved stock, and cleared cart', async () => {
      const token = signToken(userId, 'alex@gridline.com');
      userCart.items = [{ product: new Types.ObjectId(prodId), quantity: 2 }];

      const res = await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressId,
          notes: 'Call on arrival',
          idempotencyKey: 'checkout-key-1',
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.message).toBe('Order created successfully');
      expect(res.body.data.orderNumber).toMatch(/^ORD-\d{8}-[A-F0-9]{6}$/);
      expect(res.body.data.paymentReference).toMatch(/^PAY-/);
      expect(res.body.data.subtotal).toBe(70000);
      expect(res.body.data.totalAmount).toBe(70000);
      expect(res.body.data.paymentStatus).toBe('pending');
      expect(res.body.data.fulfilmentStatus).toBe('placed');
      expect(res.body.data.stockReserved).toBe(true);
      expect(res.body.data.shippingAddress.line1).toBe('742 Evergreen Terrace');
      expect(res.body.data.items).toHaveLength(1);
      expect(productState.reservedStock).toBe(2);
      expect(userCart.items).toHaveLength(0);

      // Duplicate idempotencyKey should return 409 Conflict
      userCart.items = [{ product: new Types.ObjectId(prodId), quantity: 1 }];
      await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressId,
          idempotencyKey: 'checkout-key-1',
        })
        .expect(HttpStatus.CONFLICT);
    });

    it('should prevent overselling on concurrent checkout requests', async () => {
      const token = signToken(userId, 'alex@gridline.com');
      productState.stock = 3;
      userCart.items = [{ product: new Types.ObjectId(prodId), quantity: 3 }];

      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/v1/checkout')
          .set('Authorization', `Bearer ${token}`)
          .send({ addressId }),
        request(app.getHttpServer())
          .post('/api/v1/checkout')
          .set('Authorization', `Bearer ${token}`)
          .send({ addressId }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses[0]).toBe(HttpStatus.CREATED);
      expect([HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT]).toContain(
        statuses[1],
      );
      expect(productState.reservedStock).toBe(3);
      expect(ordersStore).toHaveLength(1);
    });
  });

  describe('Orders Retrieval & Cancellation', () => {
    it('should retrieve user orders, enforce ownership on single order, and cancel eligible orders', async () => {
      const token = signToken(userId, 'alex@gridline.com');
      const otherToken = signToken(otherUserId, 'other@gridline.com');
      userCart.items = [{ product: new Types.ObjectId(prodId), quantity: 2 }];

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId })
        .expect(HttpStatus.CREATED);

      const createdOrderId = createRes.body.data.id;

      const listRes = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.meta.total).toBe(1);

      // Other user cannot access this order
      await request(app.getHttpServer())
        .get(`/api/v1/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(HttpStatus.NOT_FOUND);

      // Owner can retrieve order
      await request(app.getHttpServer())
        .get(`/api/v1/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      // Cancel order
      const cancelRes = await request(app.getHttpServer())
        .post(`/api/v1/orders/${createdOrderId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Changed my mind' })
        .expect(HttpStatus.OK);

      expect(cancelRes.body.data.fulfilmentStatus).toBe('cancelled');
      expect(cancelRes.body.data.stockReserved).toBe(false);
      expect(productState.reservedStock).toBe(0);

      // Second cancel attempt should fail with 400
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${createdOrderId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Duplicate cancel' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
