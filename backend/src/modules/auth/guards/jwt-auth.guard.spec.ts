/// <reference types="jest" />
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIE_NAMES } from '../constants/auth.constants';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockJwtService: {
    verifyAsync: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };
  let mockReflector: {
    getAllAndOverride: jest.Mock;
  };

  beforeEach(async () => {
    mockJwtService = {
      verifyAsync: jest.fn(),
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret-at-least-32-characters-long'),
    };
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  const createMockContext = (request: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: jest.fn(),
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true if route is marked with @Public()', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext({});

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should authenticate using HttpOnly cookie access_token', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const mockPayload = {
        sub: 'u1',
        email: 'test@example.com',
        role: 'customer',
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const request = {
        cookies: {
          [AUTH_COOKIE_NAMES.ACCESS_TOKEN]: 'valid-cookie-token',
        },
        headers: {},
      };
      const context = createMockContext(request);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(request['user']).toEqual(mockPayload);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-cookie-token',
        {
          secret: 'test-secret-at-least-32-characters-long',
        },
      );
    });

    it('should authenticate using Authorization Bearer header as fallback', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const mockPayload = {
        sub: 'u1',
        email: 'test@example.com',
        role: 'customer',
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const request = {
        cookies: {},
        headers: {
          authorization: 'Bearer valid-bearer-token',
        },
      };
      const context = createMockContext(request);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(request['user']).toEqual(mockPayload);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-bearer-token',
        {
          secret: 'test-secret-at-least-32-characters-long',
        },
      );
    });

    it('should throw UnauthorizedException if no token is found', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const request = {
        cookies: {},
        headers: {},
      };
      const context = createMockContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token verification fails', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      const request = {
        cookies: {
          [AUTH_COOKIE_NAMES.ACCESS_TOKEN]: 'expired-token',
        },
        headers: {},
      };
      const context = createMockContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
