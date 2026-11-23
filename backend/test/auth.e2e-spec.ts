/// <reference types="jest" />
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  AUTH_COOKIE_NAMES,
  REFRESH_TOKEN_REPOSITORY,
} from '../src/modules/auth/constants/auth.constants';
import { GoogleAuthService } from '../src/modules/auth/services/google-auth.service';
import { USER_REPOSITORY } from '../src/modules/users/constants/user.constants';

describe('Auth API (e2e)', () => {
  let app: INestApplication;

  const mockUsers: any[] = [];
  const mockTokens: any[] = [];

  const mockUserRepository = {
    findByEmail: jest.fn().mockImplementation((email: string) => {
      return Promise.resolve(mockUsers.find((u) => u.email === email) || null);
    }),
    findByEmailWithPassword: jest.fn().mockImplementation((email: string) => {
      return Promise.resolve(mockUsers.find((u) => u.email === email) || null);
    }),
    findById: jest.fn().mockImplementation((id: string) => {
      return Promise.resolve(mockUsers.find((u) => u.id === id) || null);
    }),
    create: jest.fn().mockImplementation((data: any) => {
      const newUser = {
        id: `user-${Date.now()}`,
        ...data,
      };
      mockUsers.push(newUser);
      return Promise.resolve(newUser);
    }),
    updateLastLogin: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  };

  const mockRefreshTokenRepository = {
    create: jest.fn().mockImplementation((data: any) => {
      mockTokens.push({ ...data, isRevoked: false });
      return Promise.resolve(data);
    }),
    findByTokenHash: jest.fn().mockImplementation((tokenHash: string) => {
      return Promise.resolve(
        mockTokens.find((t) => t.tokenHash === tokenHash) || null,
      );
    }),
    revokeByTokenHash: jest.fn().mockImplementation((tokenHash: string) => {
      const token = mockTokens.find((t) => t.tokenHash === tokenHash);
      if (token) token.isRevoked = true;
      return Promise.resolve();
    }),
    revokeFamily: jest.fn().mockImplementation((family: string) => {
      mockTokens
        .filter((t) => t.family === family)
        .forEach((t) => (t.isRevoked = true));
      return Promise.resolve();
    }),
    revokeAllByUserId: jest.fn().mockResolvedValue(undefined),
  };

  const mockGoogleAuthService = {
    verifyIdToken: jest.fn().mockResolvedValue({
      email: 'googleuser@example.com',
      firstName: 'Google',
      lastName: 'Tester',
      avatar: 'https://avatar.url/pic.jpg',
      emailVerified: true,
    }),
  };

  beforeAll(async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_ACCESS_SECRET =
      'very_long_access_secret_key_at_least_32_characters';
    process.env.JWT_REFRESH_SECRET =
      'very_long_refresh_secret_key_at_least_32_characters';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(mockUserRepository)
      .overrideProvider(REFRESH_TOKEN_REPOSITORY)
      .useValue(mockRefreshTokenRepository)
      .overrideProvider(GoogleAuthService)
      .useValue(mockGoogleAuthService)
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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should reject invalid registration data', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should register a new user and set HttpOnly cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          password: 'Password123!',
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('alice@example.com');
      expect(res.body.user.passwordHash).toBeUndefined();

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const hasAccessCookie = cookies.some(
        (c) =>
          c.includes(AUTH_COOKIE_NAMES.ACCESS_TOKEN) && c.includes('HttpOnly'),
      );
      const hasRefreshCookie = cookies.some(
        (c) =>
          c.includes(AUTH_COOKIE_NAMES.REFRESH_TOKEN) && c.includes('HttpOnly'),
      );
      expect(hasAccessCookie).toBe(true);
      expect(hasRefreshCookie).toBe(true);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'WrongPassword!',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should login successfully with correct credentials and set cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'Password123!',
        })
        .expect(HttpStatus.OK);

      expect(res.body.user.email).toBe('alice@example.com');
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(
        cookies.some((c) => c.includes(AUTH_COOKIE_NAMES.ACCESS_TOKEN)),
      ).toBe(true);
    });
  });

  describe('POST /api/v1/auth/google', () => {
    it('should login with Google ID token credential', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({
          credential: 'mock-google-id-token',
        })
        .expect(HttpStatus.OK);

      expect(res.body.user.email).toBe('googleuser@example.com');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token using cookie', async () => {
      // First login to get a cookie
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'Password123!',
        });

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies.find((c) =>
        c.includes(AUTH_COOKIE_NAMES.REFRESH_TOKEN),
      );

      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', [refreshCookie!])
        .expect(HttpStatus.OK);

      expect(refreshRes.body.message).toBe('Token refreshed successfully');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear cookies on logout', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'Password123!',
        });

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];

      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies)
        .expect(HttpStatus.OK);

      expect(logoutRes.body.message).toBe('Logged out successfully');
      const clearedCookies = logoutRes.headers[
        'set-cookie'
      ] as unknown as string[];
      // Cleared cookies contain Max-Age=0 or Expires in the past
      expect(
        clearedCookies.some((c) => c.includes(AUTH_COOKIE_NAMES.ACCESS_TOKEN)),
      ).toBe(true);
      expect(
        clearedCookies.some((c) => c.includes(AUTH_COOKIE_NAMES.REFRESH_TOKEN)),
      ).toBe(true);
    });
  });
});
