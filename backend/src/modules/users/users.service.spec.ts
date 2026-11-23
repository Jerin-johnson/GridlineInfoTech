/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { USER_REPOSITORY } from './constants/user.constants';
import { IUserRepository } from './interfaces/user-repository.interface';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should query user repository with email', async () => {
      const mockUser = { id: 'u1', email: 'test@example.com' } as any;
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');
      expect(result).toBe(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });

  describe('findByEmailWithPassword', () => {
    it('should query user repository with email and select password', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        passwordHash: 'hash',
      } as any;
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(mockUser);

      const result = await service.findByEmailWithPassword('test@example.com');
      expect(result).toBe(mockUser);
      expect(mockUserRepository.findByEmailWithPassword).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });

  describe('findById', () => {
    it('should query user repository by id', async () => {
      const mockUser = { id: 'u1', email: 'test@example.com' } as any;
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('u1');
      expect(result).toBe(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('u1');
    });
  });

  describe('createLocalUser', () => {
    it('should create local customer user with isActive true and isEmailVerified false', async () => {
      const createdUser = {
        id: 'u1',
        email: 'test@example.com',
        authProvider: 'local',
        role: 'customer',
      } as any;
      mockUserRepository.create.mockResolvedValue(createdUser);

      const result = await service.createLocalUser({
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        passwordHash: 'hashed_pw',
      });

      expect(result).toBe(createdUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        passwordHash: 'hashed_pw',
        authProvider: 'local',
        role: 'customer',
        isActive: true,
        isEmailVerified: false,
      });
    });
  });

  describe('createGoogleUser', () => {
    it('should create user with google authProvider', async () => {
      const createdUser = {
        id: 'u1',
        email: 'google@example.com',
        authProvider: 'google',
        role: 'customer',
      } as any;
      mockUserRepository.create.mockResolvedValue(createdUser);

      const result = await service.createGoogleUser({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'google@example.com',
        avatar: 'https://avatar.url',
        isEmailVerified: true,
      });

      expect(result).toBe(createdUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'google@example.com',
        avatar: 'https://avatar.url',
        authProvider: 'google',
        role: 'customer',
        isActive: true,
        isEmailVerified: true,
      });
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login date on repository', async () => {
      await service.updateLastLogin('u1');
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith('u1');
    });
  });
});
