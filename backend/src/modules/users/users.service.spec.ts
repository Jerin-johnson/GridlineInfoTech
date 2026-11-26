/// <reference types="jest" />
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { USER_REPOSITORY } from './constants/user.constants';
import { IUserRepository } from './interfaces/user-repository.interface';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const validUserId = new Types.ObjectId().toString();
  const validAddressId = new Types.ObjectId().toString();
  const validAddress2Id = new Types.ObjectId().toString();

  const createMockUser = (overrides = {}) => {
    return {
      _id: new Types.ObjectId(validUserId),
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      passwordHash: 'secret_hash',
      authProvider: 'local',
      role: 'customer',
      phone: '+1 555-0100',
      avatar: 'https://avatar.com/john.jpg',
      isActive: true,
      isEmailVerified: true,
      addresses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      markModified: jest.fn(),
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
      ...overrides,
    } as any;
  };

  beforeEach(async () => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
      update: jest.fn(),
      save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
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

  describe('getProfile', () => {
    it('should return sanitized user profile without passwordHash', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const profile = await service.getProfile(validUserId);
      expect(profile.id).toBe(validUserId);
      expect(profile.firstName).toBe('John');
      expect(profile.email).toBe('john@example.com');
      expect((profile as any).passwordHash).toBeUndefined();
    });

    it('should throw BadRequestException if userId format is invalid', async () => {
      await expect(service.getProfile('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user is not found or inactive', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(service.getProfile(validUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update permitted fields and return sanitized profile', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const updated = await service.updateProfile(validUserId, {
        firstName: 'Jonathan',
        phone: '+1 555-9999',
      });

      expect(mockUser.firstName).toBe('Jonathan');
      expect(mockUser.phone).toBe('+1 555-9999');
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(updated.firstName).toBe('Jonathan');
      expect((updated as any).passwordHash).toBeUndefined();
    });
  });

  describe('getAddresses', () => {
    it('should return user addresses array', async () => {
      const mockUser = createMockUser({
        addresses: [
          { _id: new Types.ObjectId(), label: 'Home', isDefault: true },
        ],
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const addresses = await service.getAddresses(validUserId);
      expect(addresses).toHaveLength(1);
      expect(addresses[0].label).toBe('Home');
    });
  });

  describe('addAddress', () => {
    it('should set first address as default automatically', async () => {
      const mockUser = createMockUser({ addresses: [] });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const addresses = await service.addAddress(validUserId, {
        label: 'Home',
        fullName: 'John Doe',
        phone: '+1 555-0100',
        line1: '123 Main St',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        isDefault: false, // passed false, but should become true because it's first
      });

      expect(addresses).toHaveLength(1);
      expect(addresses[0].isDefault).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should unset other default addresses when adding with isDefault true', async () => {
      const existingAddress = {
        _id: new Types.ObjectId(validAddressId),
        label: 'Home',
        fullName: 'John Doe',
        phone: '+1 555-0100',
        line1: '123 Main St',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        isDefault: true,
      };
      const mockUser = createMockUser({ addresses: [existingAddress] });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const addresses = await service.addAddress(validUserId, {
        label: 'Garage',
        fullName: 'John Doe',
        phone: '+1 555-0100',
        line1: '456 Track Rd',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10002',
        isDefault: true,
      });

      expect(addresses).toHaveLength(2);
      expect(existingAddress.isDefault).toBe(false);
      expect(addresses[1].isDefault).toBe(true);
      expect(addresses[1].label).toBe('Garage');
    });
  });

  describe('updateAddress', () => {
    it('should update address fields', async () => {
      const address = {
        _id: new Types.ObjectId(validAddressId),
        label: 'Home',
        fullName: 'John Doe',
        phone: '+1 555-0100',
        line1: '123 Main St',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        isDefault: true,
      };
      const mockUser = createMockUser({ addresses: [address] });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const addresses = await service.updateAddress(
        validUserId,
        validAddressId,
        {
          label: 'HQ Office',
        },
      );

      expect(addresses[0].label).toBe('HQ Office');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should promote another address if current default is explicitly set to false', async () => {
      const addr1 = {
        _id: new Types.ObjectId(validAddressId),
        label: 'Home',
        isDefault: true,
      };
      const addr2 = {
        _id: new Types.ObjectId(validAddress2Id),
        label: 'Office',
        isDefault: false,
      };
      const mockUser = createMockUser({ addresses: [addr1, addr2] });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const addresses = await service.updateAddress(
        validUserId,
        validAddressId,
        {
          isDefault: false,
        },
      );

      expect(addr1.isDefault).toBe(false);
      expect(addr2.isDefault).toBe(true);
      expect(addresses).toBeDefined();
    });

    it('should throw NotFoundException if address does not exist on user', async () => {
      const mockUser = createMockUser({ addresses: [] });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateAddress(validUserId, validAddressId, { label: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setDefaultAddress', () => {
    it('should mark target address as default and others as false', async () => {
      const addr1 = {
        _id: new Types.ObjectId(validAddressId),
        label: 'Home',
        isDefault: true,
      };
      const addr2 = {
        _id: new Types.ObjectId(validAddress2Id),
        label: 'Office',
        isDefault: false,
      };
      const mockUser = createMockUser({ addresses: [addr1, addr2] });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const addresses = await service.setDefaultAddress(
        validUserId,
        validAddress2Id,
      );

      expect(addr1.isDefault).toBe(false);
      expect(addr2.isDefault).toBe(true);
      expect(addresses).toBeDefined();
    });
  });

  describe('deleteAddress', () => {
    it('should delete address from user', async () => {
      const addr1 = {
        _id: new Types.ObjectId(validAddressId),
        label: 'Home',
        isDefault: false,
      };
      const mockUser = createMockUser({ addresses: [addr1] });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const addresses = await service.deleteAddress(
        validUserId,
        validAddressId,
      );
      expect(addresses).toHaveLength(0);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should promote next remaining address to default if default was deleted', async () => {
      const addr1 = {
        _id: new Types.ObjectId(validAddressId),
        label: 'Home',
        isDefault: true,
      };
      const addr2 = {
        _id: new Types.ObjectId(validAddress2Id),
        label: 'Office',
        isDefault: false,
      };
      const mockUser = createMockUser({ addresses: [addr1, addr2] });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const addresses = await service.deleteAddress(
        validUserId,
        validAddressId,
      );
      expect(addresses).toHaveLength(1);
      expect(addresses[0]._id.toString()).toBe(validAddress2Id);
      expect(addresses[0].isDefault).toBe(true);
    });

    it('should throw NotFoundException if address to delete does not exist', async () => {
      const mockUser = createMockUser({ addresses: [] });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(
        service.deleteAddress(validUserId, validAddressId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
