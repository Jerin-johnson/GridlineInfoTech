/// <reference types="jest" />
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { Types } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { BRAND_REPOSITORY } from '../src/modules/brands/constants/brand.constants';
import { CATEGORY_REPOSITORY } from '../src/modules/categories/constants/category.constants';
import { PRODUCT_REPOSITORY } from '../src/modules/products/constants/product.constants';

describe('Product Catalog (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const catId = new Types.ObjectId().toString();
  const brandId = new Types.ObjectId().toString();
  const prod1Id = new Types.ObjectId().toString();
  const prod2Id = new Types.ObjectId().toString();

  const mockCategories = [
    {
      _id: catId,
      name: 'Brakes',
      slug: 'brakes',
      status: 'active',
    },
  ];

  const mockBrands = [
    {
      _id: brandId,
      name: 'Brembo',
      slug: 'brembo',
      status: 'active',
    },
  ];

  const mockProducts: any[] = [
    {
      _id: prod1Id,
      name: 'Brembo Big Brake Kit',
      slug: 'brembo-big-brake-kit',
      sku: 'BRM-BBK-01',
      category: { _id: catId, name: 'Brakes', slug: 'brakes' },
      brand: { _id: brandId, name: 'Brembo', slug: 'brembo' },
      price: 350000,
      currency: 'USD',
      stock: 10,
      reservedStock: 2,
      status: 'published',
      isFeatured: true,
      images: [],
      specifications: [],
      compatibility: [],
      toObject() {
        return { ...this };
      },
    },
    {
      _id: prod2Id,
      name: 'Brembo Sport Pads',
      slug: 'brembo-sport-pads',
      sku: 'BRM-PAD-01',
      category: { _id: catId, name: 'Brakes', slug: 'brakes' },
      brand: { _id: brandId, name: 'Brembo', slug: 'brembo' },
      price: 15000,
      currency: 'USD',
      stock: 20,
      reservedStock: 0,
      status: 'published',
      isFeatured: false,
      images: [],
      specifications: [],
      compatibility: [],
      toObject() {
        return { ...this };
      },
    },
  ];

  const mockCategoryRepository = {
    findById: jest.fn().mockImplementation((id: string) => {
      return Promise.resolve(mockCategories.find((c) => c._id === id) || null);
    }),
    findBySlug: jest.fn().mockImplementation((slug: string) => {
      return Promise.resolve(
        mockCategories.find((c) => c.slug === slug) || null,
      );
    }),
    findAll: jest.fn().mockResolvedValue(mockCategories),
    create: jest.fn().mockImplementation((data: any) => {
      const doc = { _id: new Types.ObjectId().toString(), ...data };
      mockCategories.push(doc);
      return Promise.resolve(doc);
    }),
    update: jest.fn().mockImplementation((id: string, data: any) => {
      const cat = mockCategories.find((c) => c._id === id);
      if (cat) Object.assign(cat, data);
      return Promise.resolve(cat || null);
    }),
  };

  const mockBrandRepository = {
    findById: jest.fn().mockImplementation((id: string) => {
      return Promise.resolve(mockBrands.find((b) => b._id === id) || null);
    }),
    findBySlug: jest.fn().mockImplementation((slug: string) => {
      return Promise.resolve(mockBrands.find((b) => b.slug === slug) || null);
    }),
    findAll: jest.fn().mockResolvedValue(mockBrands),
    create: jest.fn().mockImplementation((data: any) => {
      const doc = { _id: new Types.ObjectId().toString(), ...data };
      mockBrands.push(doc);
      return Promise.resolve(doc);
    }),
    update: jest.fn().mockImplementation((id: string, data: any) => {
      const brand = mockBrands.find((b) => b._id === id);
      if (brand) Object.assign(brand, data);
      return Promise.resolve(brand || null);
    }),
  };

  const mockProductRepository = {
    findById: jest.fn().mockImplementation((id: string) => {
      const p = mockProducts.find((item) => item._id.toString() === id);
      return Promise.resolve(p || null);
    }),
    findBySlug: jest.fn().mockImplementation((slug: string) => {
      const p = mockProducts.find((item) => item.slug === slug);
      return Promise.resolve(p || null);
    }),
    findBySku: jest.fn().mockImplementation((sku: string) => {
      const p = mockProducts.find((item) => item.sku === sku);
      return Promise.resolve(p || null);
    }),
    findAll: jest.fn().mockImplementation(() => {
      return Promise.resolve({
        data: mockProducts,
        total: mockProducts.length,
      });
    }),
    create: jest.fn().mockImplementation((data: any) => {
      const doc = {
        _id: new Types.ObjectId().toString(),
        ...data,
        toObject() {
          return { ...this };
        },
      };
      mockProducts.push(doc);
      return Promise.resolve(doc);
    }),
    update: jest.fn().mockImplementation((id: string, data: any) => {
      const p = mockProducts.find((item) => item._id.toString() === id);
      if (p) Object.assign(p, data);
      return Promise.resolve(p || null);
    }),
    findRelated: jest.fn().mockImplementation((id: string) => {
      const related = mockProducts.filter((p) => p._id.toString() !== id);
      return Promise.resolve(related);
    }),
    countByCategory: jest.fn().mockResolvedValue(1),
    countByBrand: jest.fn().mockResolvedValue(1),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CATEGORY_REPOSITORY)
      .useValue(mockCategoryRepository)
      .overrideProvider(BRAND_REPOSITORY)
      .useValue(mockBrandRepository)
      .overrideProvider(PRODUCT_REPOSITORY)
      .useValue(mockProductRepository)
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

  const generateToken = (role: 'customer' | 'admin') => {
    return jwtService.sign(
      { sub: 'user-123', email: `${role}@example.com`, role },
      {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          'default-access-secret-for-jwt-testing-purposes-min-32-chars',
      },
    );
  };

  describe('Public Discovery', () => {
    it('GET /api/v1/categories - should list active categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Categories retrieved successfully');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].slug).toBe('brakes');
    });

    it('GET /api/v1/brands - should list active brands', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/brands')
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Brands retrieved successfully');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].slug).toBe('brembo');
    });

    it('GET /api/v1/products - should list products with availableStock', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Products retrieved successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data[0].availableStock).toBe(8); // 10 - 2
    });

    it('GET /api/v1/products/:id - should get product by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${prod1Id}`)
        .expect(HttpStatus.OK);

      expect(res.body.data.name).toBe('Brembo Big Brake Kit');
      expect(res.body.data.availableStock).toBe(8);
    });

    it('GET /api/v1/products/:id/related - should get related products', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${prod1Id}/related`)
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Related products retrieved successfully');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Brembo Sport Pads');
    });

    it('GET /api/v1/products?status=draft - should reject public/customer request with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products?status=draft')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('Admin Role-Based Authorization', () => {
    it('POST /api/v1/products - should return 401 Unauthorized without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .send({ name: 'New Exhaust' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /api/v1/products - should return 403 Forbidden with customer token', async () => {
      const customerToken = generateToken('customer');
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'New Exhaust',
          sku: 'EXH-01',
          category: catId,
          brand: brandId,
          price: 10000,
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('POST /api/v1/products - should return 201 Created with admin token', async () => {
      const adminToken = generateToken('admin');
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Titanium Exhaust',
          sku: 'EXH-TIT-01',
          category: catId,
          brand: brandId,
          price: 150000,
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.message).toBe('Product created successfully');
      expect(res.body.data.name).toBe('Titanium Exhaust');
    });

    it('PATCH /api/v1/products/:id - should return 200 OK with admin token', async () => {
      const adminToken = generateToken('admin');
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${prod1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 360000,
        })
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Product updated successfully');
    });

    it('DELETE /api/v1/products/:id - should return 200 OK with admin token (soft archive)', async () => {
      const adminToken = generateToken('admin');
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/products/${prod1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Product archived successfully');
    });
  });
});
