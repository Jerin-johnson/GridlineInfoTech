/// <reference types="jest" />
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GoogleAuthService } from './google-auth.service';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: string) => {
          if (key === 'GOOGLE_CLIENT_ID') return 'mock-google-client-id';
          return defaultValue;
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GoogleAuthService>(GoogleAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyIdToken', () => {
    it('should successfully verify a valid Google token', async () => {
      const mockPayload = {
        email: 'user@example.com',
        email_verified: true,
        given_name: 'John',
        family_name: 'Doe',
        picture: 'https://example.com/avatar.jpg',
      };

      // Mock verifyIdToken on the internal oauthClient
      (service as any).oauthClient = {
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => mockPayload,
        }),
      };

      const result = await service.verifyIdToken('valid-id-token');
      expect(result).toEqual({
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: 'https://example.com/avatar.jpg',
        emailVerified: true,
      });
    });

    it('should throw UnauthorizedException if email is not verified', async () => {
      const mockPayload = {
        email: 'user@example.com',
        email_verified: false,
      };

      (service as any).oauthClient = {
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => mockPayload,
        }),
      };

      await expect(
        service.verifyIdToken('token-with-unverified-email'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if ticket has no payload', async () => {
      (service as any).oauthClient = {
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => null,
        }),
      };

      await expect(service.verifyIdToken('token-null-payload')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if google verification library throws', async () => {
      (service as any).oauthClient = {
        verifyIdToken: jest
          .fn()
          .mockRejectedValue(new Error('Invalid token signature')),
      };

      await expect(service.verifyIdToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
