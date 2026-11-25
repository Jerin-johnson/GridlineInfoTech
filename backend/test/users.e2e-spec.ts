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
import { USER_REPOSITORY } from '../src/modules/users/constants/user.constants';

describe('Users API (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();
  const addressA1Id = new Types.ObjectId().toString();

  const mockUsers: any[] = [
    {
      _id: new Types.ObjectId(userAId),
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      passwordHash: 'secret_hash_a',
      authProvider: 'local',
      role: 'customer',
      phone: '+1 555-0101',
      avatar: 'https://avatar.com/alice.jpg',
      isActive: true,
      isEmailVerified: true,
      addresses: [
        {
          _id: new Types.ObjectId(addressA1Id),
          label: 'Home',
          fullName: 'Alice Smith',
          phone: '+1 555-0101',
          line1: '100 Main St',
          city: 'Automotive City',
          state: 'MI',
          postalCode: '48201',
          country: 'US',
          isDefault: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      markModified: jest.fn(),
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    },
    {
      _id: new Types.ObjectId(userBId),
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@example.com',
      passwordHash: 'secret_hash_b',
      authProvider: 'local',
      role: 'customer',
      phone: '+1 555-0102',
      avatar: 'https://avatar.com/bob.jpg',
      isActive: true,
      isEmailVerified: true,
      addresses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      markModified: jest.fn(),
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    },
  ];

  const mockUserRepository = {
    findById: jest.fn().mockImplementation((id: string) => {
      const user = mockUsers.find((u) => u._id.toString() === id);
      return Promise.resolve(user || null);
    }),
    findByEmail: jest.fn().mockImplementation((email: string) => {
      const user = mockUsers.find((u) => u.email === email);
      return Promise.resolve(user || null);
    }),
    findByEmailWithPassword: jest.fn().mockImplementation((email: string) => {
      const user = mockUsers.find((u) => u.email === email);
      return Promise.resolve(user || null);
    }),
    create: jest.fn(),
    updateLastLogin: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockImplementation((id: string, data: any) => {
      const user = mockUsers.find((u) => u._id.toString() === id);
      if (user) Object.assign(user, data);
      return Promise.resolve(user || null);
    }),
    save: jest.fn().mockImplementation((user: any) => Promise.resolve(user)),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(mockUserRepository)
      .overrideProvider(CART_REPOSITORY)
      .useValue({ findByUserId: jest.fn().mockResolvedValue(null) })
      .overrideProvider(PRODUCT_REPOSITORY)
      .useValue({ findById: jest.fn().mockResolvedValue(null) })
      .overrideProvider(CATEGORY_REPOSITORY)
      .useValue({ findById: jest.fn().mockResolvedValue(null) })
      .overrideProvider(BRAND_REPOSITORY)
      .useValue({ findById: jest.fn().mockResolvedValue(null) })
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

  const getToken = (id: string, email: string) => {
    return jwtService.sign(
      { sub: id, email, role: 'customer' },
      {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          'default-access-secret-for-jwt-testing-purposes-min-32-chars',
      },
    );
  };

  describe('Authentication Enforcement', () => {
    it('GET /api/v1/users/me - should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('PATCH /api/v1/users/me - should return 401 without token', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .send({ firstName: 'Test' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('GET /api/v1/users/me/addresses - should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me/addresses')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /api/v1/users/me/addresses - should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/me/addresses')
        .send({ label: 'Home' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('User Profile Operations', () => {
    it('GET /api/v1/users/me - should return sanitized profile of authenticated user', async () => {
      const token = getToken(userAId, 'alice@example.com');
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('User profile retrieved successfully');
      expect(res.body.data.id).toBe(userAId);
      expect(res.body.data.firstName).toBe('Alice');
      expect(res.body.data.email).toBe('alice@example.com');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('PATCH /api/v1/users/me - should update permitted fields', async () => {
      const token = getToken(userAId, 'alice@example.com');
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Alicia',
          phone: '+1 555-9999',
        })
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('User profile updated successfully');
      expect(res.body.data.firstName).toBe('Alicia');
      expect(res.body.data.phone).toBe('+1 555-9999');
    });

    it('PATCH /api/v1/users/me - should reject modification of forbidden fields with 400 Bad Request', async () => {
      const token = getToken(userAId, 'alice@example.com');
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'admin',
        })
        .expect(HttpStatus.BAD_REQUEST);

      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'newemail@example.com',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Address Management Operations', () => {
    it('GET /api/v1/users/me/addresses - should return addresses for user', async () => {
      const token = getToken(userAId, 'alice@example.com');
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me/addresses')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Addresses retrieved successfully');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]._id.toString()).toBe(addressA1Id);
    });

    it('POST /api/v1/users/me/addresses - should add second address for user and handle default correctly', async () => {
      const token = getToken(userAId, 'alice@example.com');
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/me/addresses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          label: 'Track Garage',
          fullName: 'Alice Smith',
          phone: '+1 555-0101',
          line1: '200 Raceway Dr',
          city: 'Speedway',
          state: 'IN',
          postalCode: '46224',
          country: 'US',
          isDefault: true,
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.message).toBe('Address added successfully');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].isDefault).toBe(false); // Former default unset
      expect(res.body.data[1].isDefault).toBe(true); // New default
    });

    it('PATCH /api/v1/users/me/addresses/:addressId - should update address fields', async () => {
      const token = getToken(userAId, 'alice@example.com');
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/me/addresses/${addressA1Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          line2: 'Suite 4B',
        })
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Address updated successfully');
      const updated = res.body.data.find(
        (a: any) => a._id.toString() === addressA1Id,
      );
      expect(updated.line2).toBe('Suite 4B');
    });

    it('PATCH /api/v1/users/me/addresses/:addressId/default - should switch default address', async () => {
      const token = getToken(userAId, 'alice@example.com');
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/me/addresses/${addressA1Id}/default`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Default address updated successfully');
      const addrA1 = res.body.data.find(
        (a: any) => a._id.toString() === addressA1Id,
      );
      expect(addrA1.isDefault).toBe(true);
      expect(res.body.data[1].isDefault).toBe(false);
    });

    it('DELETE /api/v1/users/me/addresses/:addressId - should delete address and promote remaining to default', async () => {
      const token = getToken(userAId, 'alice@example.com');
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/users/me/addresses/${addressA1Id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body.message).toBe('Address deleted successfully');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].isDefault).toBe(true); // Remaining address promoted to default
    });
  });

  describe('Address Ownership & Isolation', () => {
    it('PATCH /api/v1/users/me/addresses/:addressId - should reject cross-user address modification with 404', async () => {
      // User B tries to update User A's remaining address
      const remainingUserAAddressId = mockUsers[0].addresses[0]._id.toString();
      const tokenB = getToken(userBId, 'bob@example.com');

      await request(app.getHttpServer())
        .patch(`/api/v1/users/me/addresses/${remainingUserAAddressId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ label: 'Malicious Update' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('DELETE /api/v1/users/me/addresses/:addressId - should reject cross-user address deletion with 404', async () => {
      const remainingUserAAddressId = mockUsers[0].addresses[0]._id.toString();
      const tokenB = getToken(userBId, 'bob@example.com');

      await request(app.getHttpServer())
        .delete(`/api/v1/users/me/addresses/${remainingUserAAddressId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
