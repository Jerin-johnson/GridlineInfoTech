/// <reference types="jest" />
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { REFRESH_TOKEN_REPOSITORY } from './constants/auth.constants';
import { IRefreshTokenRepository } from './interfaces/refresh-token-repository.interface';
import { GoogleAuthService } from './services/google-auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: {
    findByEmail: jest.Mock;
    findByEmailWithPassword: jest.Mock;
    findById: jest.Mock;
    createLocalUser: jest.Mock;
    createGoogleUser: jest.Mock;
    updateLastLogin: jest.Mock;
  };
  let mockRefreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let mockJwtService: {
    signAsync: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };
  let mockGoogleAuthService: {
    verifyIdToken: jest.Mock;
  };

  beforeEach(async () => {
    mockUsersService = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      createLocalUser: jest.fn(),
      createGoogleUser: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    mockRefreshTokenRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      revokeByTokenHash: jest.fn(),
      revokeFamily: jest.fn(),
      revokeAllByUserId: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-access-token'),
    };

    mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: string) => {
          if (key === 'JWT_ACCESS_SECRET')
            return 'super-secret-jwt-key-32-chars-minimum';
          if (key === 'JWT_ACCESS_EXPIRATION') return '15m';
          if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
          return defaultValue;
        }),
    };

    mockGoogleAuthService = {
      verifyIdToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: REFRESH_TOKEN_REPOSITORY,
          useValue: mockRefreshTokenRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: GoogleAuthService, useValue: mockGoogleAuthService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user and generate tokens', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const createdUser = {
        id: 'u123',
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        avatar: undefined,
      } as any;
      mockUsersService.createLocalUser.mockResolvedValue(createdUser);

      const result = await service.register({
        firstName: 'John',
        lastName: 'Doe',
        email: 'newuser@example.com',
        password: 'Password123!',
      });

      expect(result.user).toEqual({
        id: 'u123',
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        avatar: undefined,
      });
      expect(result.tokens.accessToken).toBe('mock-jwt-access-token');
      expect(result.tokens.refreshToken).toBeDefined();
      expect(mockRefreshTokenRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already registered', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'u123' } as any);

      await expect(
        service.register({
          firstName: 'John',
          lastName: 'Doe',
          email: 'existing@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully log in with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      const user = {
        id: 'u123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        authProvider: 'local',
        passwordHash,
        isActive: true,
      } as any;

      mockUsersService.findByEmailWithPassword.mockResolvedValue(user);

      const result = await service.login({
        email: 'user@example.com',
        password: 'Password123!',
      });

      expect(result.user.id).toBe('u123');
      expect(result.tokens.accessToken).toBe('mock-jwt-access-token');
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith('u123');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'notfound@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);
      const user = {
        id: 'u123',
        email: 'user@example.com',
        passwordHash,
        isActive: true,
      } as any;

      mockUsersService.findByEmailWithPassword.mockResolvedValue(user);

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is deactivated', async () => {
      const user = {
        id: 'u123',
        email: 'user@example.com',
        isActive: false,
      } as any;

      mockUsersService.findByEmailWithPassword.mockResolvedValue(user);

      await expect(
        service.login({ email: 'user@example.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account was registered via Google only', async () => {
      const user = {
        id: 'u123',
        email: 'googleuser@example.com',
        authProvider: 'google',
        passwordHash: undefined,
        isActive: true,
      } as any;

      mockUsersService.findByEmailWithPassword.mockResolvedValue(user);

      await expect(
        service.login({
          email: 'googleuser@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('googleLogin', () => {
    it('should log in existing google account', async () => {
      mockGoogleAuthService.verifyIdToken.mockResolvedValue({
        email: 'guser@example.com',
        firstName: 'Google',
        lastName: 'User',
        avatar: 'https://avatar.url',
        emailVerified: true,
      });

      const user = {
        id: 'uGoogle',
        email: 'guser@example.com',
        firstName: 'Google',
        lastName: 'User',
        role: 'customer',
        authProvider: 'google',
        isActive: true,
      } as any;

      mockUsersService.findByEmail.mockResolvedValue(user);

      const result = await service.googleLogin({
        credential: 'valid-google-id-token',
      });

      expect(result.user.email).toBe('guser@example.com');
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith('uGoogle');
    });

    it('should create new account for first time google login', async () => {
      mockGoogleAuthService.verifyIdToken.mockResolvedValue({
        email: 'newgoogle@example.com',
        firstName: 'New',
        lastName: 'GoogleUser',
        avatar: 'https://avatar.url',
        emailVerified: true,
      });

      mockUsersService.findByEmail.mockResolvedValue(null);

      const createdUser = {
        id: 'uNewGoogle',
        email: 'newgoogle@example.com',
        firstName: 'New',
        lastName: 'GoogleUser',
        role: 'customer',
        authProvider: 'google',
        isActive: true,
      } as any;

      mockUsersService.createGoogleUser.mockResolvedValue(createdUser);

      const result = await service.googleLogin({
        credential: 'valid-google-id-token',
      });

      expect(result.user.id).toBe('uNewGoogle');
      expect(mockUsersService.createGoogleUser).toHaveBeenCalledWith({
        firstName: 'New',
        lastName: 'GoogleUser',
        email: 'newgoogle@example.com',
        avatar: 'https://avatar.url',
        isEmailVerified: true,
      });
    });

    it('should throw ConflictException if local password user already exists with that email', async () => {
      mockGoogleAuthService.verifyIdToken.mockResolvedValue({
        email: 'local@example.com',
        firstName: 'Local',
        lastName: 'User',
        emailVerified: true,
      });

      const existingLocalUser = {
        id: 'uLocal',
        email: 'local@example.com',
        authProvider: 'local',
      } as any;

      mockUsersService.findByEmail.mockResolvedValue(existingLocalUser);

      await expect(
        service.googleLogin({ credential: 'valid-token' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('refreshTokens', () => {
    it('should successfully rotate tokens when given a valid refresh token', async () => {
      const validTokenDoc = {
        userId: 'u123',
        family: 'family-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 1000000),
      } as any;

      mockRefreshTokenRepository.findByTokenHash.mockResolvedValue(
        validTokenDoc,
      );

      const user = {
        id: 'u123',
        email: 'user@example.com',
        role: 'customer',
        isActive: true,
      } as any;
      mockUsersService.findById.mockResolvedValue(user);

      const result = await service.refreshTokens('my-raw-refresh-token');

      expect(result.tokens.accessToken).toBe('mock-jwt-access-token');
      expect(mockRefreshTokenRepository.revokeByTokenHash).toHaveBeenCalled();
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u123',
          family: 'family-123',
        }),
      );
    });

    it('should detect token reuse, revoke entire family, and throw UnauthorizedException', async () => {
      const revokedTokenDoc = {
        userId: 'u123',
        family: 'stolen-family-999',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 1000000),
      } as any;

      mockRefreshTokenRepository.findByTokenHash.mockResolvedValue(
        revokedTokenDoc,
      );

      await expect(service.refreshTokens('reused-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRefreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
        'stolen-family-999',
      );
    });

    it('should throw UnauthorizedException if refresh token is expired', async () => {
      const expiredTokenDoc = {
        userId: 'u123',
        family: 'family-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 10000),
      } as any;

      mockRefreshTokenRepository.findByTokenHash.mockResolvedValue(
        expiredTokenDoc,
      );

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token not found', async () => {
      mockRefreshTokenRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.refreshTokens('unknown-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke token hash when rawRefreshToken is provided', async () => {
      await service.logout('raw-token-123');
      expect(mockRefreshTokenRepository.revokeByTokenHash).toHaveBeenCalled();
    });

    it('should revoke all tokens for user if no raw token but userId provided', async () => {
      await service.logout(undefined, 'u123');
      expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith(
        'u123',
      );
    });
  });
});
