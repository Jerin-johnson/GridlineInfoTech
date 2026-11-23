/// <reference types="jest" />
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_NAMES } from './constants/auth.constants';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: jest.Mocked<Partial<AuthService>>;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;

  const mockAuthResult = {
    user: {
      id: 'u123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer',
    },
    tokens: {
      accessToken: 'access-jwt-token',
      refreshToken: 'refresh-random-token',
      accessExpiresIn: 15 * 60 * 1000,
      refreshExpiresIn: 7 * 24 * 60 * 60 * 1000,
    },
  };

  const createMockResponse = (): Partial<Response> => ({
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  });

  beforeEach(async () => {
    mockAuthService = {
      register: jest.fn().mockResolvedValue(mockAuthResult),
      login: jest.fn().mockResolvedValue(mockAuthResult),
      googleLogin: jest.fn().mockResolvedValue(mockAuthResult),
      refreshTokens: jest.fn().mockResolvedValue(mockAuthResult),
      logout: jest.fn().mockResolvedValue(undefined),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register user and set HttpOnly cookies for access and refresh tokens', async () => {
      const mockRes = createMockResponse();

      const result = await controller.register(
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'test@example.com',
          password: 'Password123!',
        },
        mockRes as Response,
      );

      expect(result.user.email).toBe('test@example.com');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAMES.ACCESS_TOKEN,
        'access-jwt-token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAMES.REFRESH_TOKEN,
        'refresh-random-token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
    });
  });

  describe('login', () => {
    it('should log in user and set HttpOnly cookies', async () => {
      const mockRes = createMockResponse();

      const result = await controller.login(
        {
          email: 'test@example.com',
          password: 'Password123!',
        },
        mockRes as Response,
      );

      expect(result.message).toBe('Login successful');
      expect(mockRes.cookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('googleLogin', () => {
    it('should authenticate with Google credential and set cookies', async () => {
      const mockRes = createMockResponse();

      const result = await controller.googleLogin(
        { credential: 'google-id-token' },
        mockRes as Response,
      );

      expect(result.message).toBe('Google authentication successful');
      expect(mockRes.cookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('refresh', () => {
    it('should refresh using cookie refresh token and update cookies', async () => {
      const mockReq = {
        cookies: {
          [AUTH_COOKIE_NAMES.REFRESH_TOKEN]: 'cookie-refresh-token',
        },
      } as unknown as Request;
      const mockRes = createMockResponse();

      const result = await controller.refresh(mockReq, {}, mockRes as Response);

      expect(result.message).toBe('Token refreshed successfully');
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'cookie-refresh-token',
      );
      expect(mockRes.cookie).toHaveBeenCalledTimes(2);
    });

    it('should refresh using body refresh token if cookie is not present', async () => {
      const mockReq = { cookies: {} } as unknown as Request;
      const mockRes = createMockResponse();

      const result = await controller.refresh(
        mockReq,
        { refreshToken: 'body-refresh-token' },
        mockRes as Response,
      );

      expect(result.message).toBe('Token refreshed successfully');
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'body-refresh-token',
      );
    });

    it('should throw UnauthorizedException if no refresh token provided', async () => {
      const mockReq = { cookies: {} } as unknown as Request;
      const mockRes = createMockResponse();

      await expect(
        controller.refresh(mockReq, {}, mockRes as Response),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and clear HttpOnly cookies', async () => {
      const mockReq = {
        cookies: {
          [AUTH_COOKIE_NAMES.REFRESH_TOKEN]: 'cookie-token-to-revoke',
        },
      } as unknown as Request;
      const mockRes = createMockResponse();

      const result = await controller.logout(
        'u123',
        mockReq,
        {},
        mockRes as Response,
      );

      expect(result.message).toBe('Logged out successfully');
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'cookie-token-to-revoke',
        'u123',
      );
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAMES.ACCESS_TOKEN,
        expect.objectContaining({ path: '/' }),
      );
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAMES.REFRESH_TOKEN,
        expect.objectContaining({ path: '/' }),
      );
    });
  });
});
