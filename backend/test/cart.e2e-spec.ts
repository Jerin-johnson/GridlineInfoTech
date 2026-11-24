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
import { PRODUCT_REPOSITORY } from '../src/modules/products/constants/product.constants';

describe('Cart API (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const userId = new Types.ObjectId().toString();
  const prodId = new Types.ObjectId().toString();
  const otherProdId = new Types.ObjectId().toString();

  const mockProduct = {
    _id: prodId,
    name: 'Brembo Brake Rotor',
    slug: 'brembo-brake-rotor',
    sku: 'BRM-ROTOR-01',
    price: 35000, // $350.00
    currency: 'USD',
    stock: 10,
    reservedStock: 2,
    availableStock: 8,
    status: 'published',
    images: [{ url: 'https://img.com/rotor.jpg', isPrimary: true }],
    toObject() {
      return { ...this };
    },
  };

  let userCart: any = {
    _id: new Types.ObjectId().toString(),
    user: new Types.ObjectId(userId),
    items: [],
  };

  const mockCartRepository = {
    findByUserId: jest.fn().mockImplementation((uId: string) => {
      if (uId === userId) {
        return Promise.resolve(userCart);
      }
      return Promise.resolve(null);
    }),
    create: jest.fn().mockImplementation((uId: string) => {
      userCart = {
        _id: new Types.ObjectId().toString(),
        user: new Types.ObjectId(uId),
        items: [],
      };
      return Promise.resolve(userCart);
    }),
    save: jest.fn().mockImplementation((cart: any) => {
      userCart = cart;
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
        return Promise.resolve(mockProduct);
      }
      return Promise.resolve(null);
    }),
    findBySlug: jest.fn().mockResolvedValue(null),
    findBySku: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue({ data: [mockProduct], total: 1 }),
    countByCategory: jest.fn().mockResolvedValue(0),
    countByBrand: jest.fn().mockResolvedValue(0),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CART_REPOSITORY)
      .useValue(mockCartRepository)
      .overrideProvider(PRODUCT_REPOSITORY)
      .useValue(mockProductRepository)
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

  afterAll(async () => {
    await app.close();
  });

  const getCustomerToken = () => {
    return jwtService.sign(
      { sub: userId, email: 'customer@gridline.com', role: 'customer' },
      {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          'default-access-secret-for-jwt-testing-purposes-min-32-chars',
      },
    );
  };

  describe('Authentication Enforcement', () => {
    it('GET /api/v1/cart - should return 401 Unauthorized without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/cart')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /api/v1/cart/items - should return 401 Unauthorized without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({ productId: prodId, quantity: 1 })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('PATCH /api/v1/cart/items/:id - should return 401 Unauthorized without auth token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/cart/items/${prodId}`)
        .send({ quantity: 2 })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('DELETE /api/v1/cart/items/:id - should return 401 Unauthorized without auth token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/cart/items/${prodId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('DELETE /api/v1/cart - should return 401 Unauthorized without auth token', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/cart')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Authenticated Customer Cart Operations', () => {
    it('GET /api/v1/cart - should return empty cart initially', async () => {
      const token = getCustomerToken();
      const res = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Cart retrieved successfully');
      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.subtotal).toBe(0);
      expect(res.body.data.total).toBe(0);
    });

    it('POST /api/v1/cart/items - should add product to cart and compute subtotal', async () => {
      const token = getCustomerToken();
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: prodId, quantity: 2 })
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Item added to cart successfully');
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].productId).toBe(prodId);
      expect(res.body.data.items[0].quantity).toBe(2);
      expect(res.body.data.items[0].itemTotal).toBe(70000); // 2 * 35000
      expect(res.body.data.subtotal).toBe(70000);
      expect(res.body.data.total).toBe(70000);
    });

    it('POST /api/v1/cart/items - should reject adding quantity that exceeds available stock', async () => {
      const token = getCustomerToken();
      // Cart already has 2, availableStock is 8. Trying to add 7 more (total 9) should fail.
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: prodId, quantity: 7 })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.message).toContain('available stock');
    });

    it('PATCH /api/v1/cart/items/:id - should update item quantity in cart', async () => {
      const token = getCustomerToken();
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/cart/items/${prodId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 4 })
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Cart item updated successfully');
      expect(res.body.data.items[0].quantity).toBe(4);
      expect(res.body.data.subtotal).toBe(140000); // 4 * 35000
    });

    it('PATCH /api/v1/cart/items/:id - should return 404 for item not in cart', async () => {
      const token = getCustomerToken();
      await request(app.getHttpServer())
        .patch(`/api/v1/cart/items/${otherProdId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 1 })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('DELETE /api/v1/cart/items/:id - should remove item from cart', async () => {
      const token = getCustomerToken();
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/cart/items/${prodId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Cart item removed successfully');
      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.subtotal).toBe(0);
    });

    it('DELETE /api/v1/cart - should clear entire cart', async () => {
      const token = getCustomerToken();
      // Add item back first
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: prodId, quantity: 1 })
        .expect(HttpStatus.OK);

      const res = await request(app.getHttpServer())
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Cart cleared successfully');
      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.subtotal).toBe(0);
    });
  });
});
