/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: {
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
    getAddresses: jest.Mock;
    addAddress: jest.Mock;
    updateAddress: jest.Mock;
    deleteAddress: jest.Mock;
    setDefaultAddress: jest.Mock;
  };

  const userId = 'user-123';
  const addressId = 'addr-456';

  beforeEach(async () => {
    mockUsersService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      getAddresses: jest.fn(),
      addAddress: jest.fn(),
      updateAddress: jest.fn(),
      deleteAddress: jest.fn(),
      setDefaultAddress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should retrieve authenticated user profile', async () => {
      const mockProfile = {
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'customer',
      };
      mockUsersService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(userId);
      expect(mockUsersService.getProfile).toHaveBeenCalledWith(userId);
      expect(result.message).toBe('User profile retrieved successfully');
      expect(result.data).toEqual(mockProfile);
    });
  });

  describe('updateProfile', () => {
    it('should update authenticated user profile', async () => {
      const updateDto = { firstName: 'Johnny', phone: '+1234567890' };
      const updatedProfile = { id: userId, ...updateDto };
      mockUsersService.updateProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateProfile(userId, updateDto);
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(result.message).toBe('User profile updated successfully');
      expect(result.data).toEqual(updatedProfile);
    });
  });

  describe('getAddresses', () => {
    it('should retrieve user saved addresses', async () => {
      const mockAddresses = [{ _id: addressId, label: 'Home', isDefault: true }];
      mockUsersService.getAddresses.mockResolvedValue(mockAddresses);

      const result = await controller.getAddresses(userId);
      expect(mockUsersService.getAddresses).toHaveBeenCalledWith(userId);
      expect(result.message).toBe('Addresses retrieved successfully');
      expect(result.data).toEqual(mockAddresses);
    });
  });

  describe('addAddress', () => {
    it('should add a new address', async () => {
      const createDto = {
        label: 'Garage',
        fullName: 'John Doe',
        phone: '+1234567890',
        line1: '123 Track Road',
        city: 'Speedway',
        state: 'IN',
        postalCode: '46224',
      };
      const addresses = [{ _id: addressId, ...createDto, isDefault: true }];
      mockUsersService.addAddress.mockResolvedValue(addresses);

      const result = await controller.addAddress(userId, createDto);
      expect(mockUsersService.addAddress).toHaveBeenCalledWith(
        userId,
        createDto,
      );
      expect(result.message).toBe('Address added successfully');
      expect(result.data).toEqual(addresses);
    });
  });

  describe('updateAddress', () => {
    it('should update an existing address', async () => {
      const updateDto = { label: 'Track Garage' };
      const addresses = [{ _id: addressId, label: 'Track Garage' }];
      mockUsersService.updateAddress.mockResolvedValue(addresses);

      const result = await controller.updateAddress(
        userId,
        addressId,
        updateDto,
      );
      expect(mockUsersService.updateAddress).toHaveBeenCalledWith(
        userId,
        addressId,
        updateDto,
      );
      expect(result.message).toBe('Address updated successfully');
      expect(result.data).toEqual(addresses);
    });
  });

  describe('setDefaultAddress', () => {
    it('should set an address as default', async () => {
      const addresses = [{ _id: addressId, isDefault: true }];
      mockUsersService.setDefaultAddress.mockResolvedValue(addresses);

      const result = await controller.setDefaultAddress(userId, addressId);
      expect(mockUsersService.setDefaultAddress).toHaveBeenCalledWith(
        userId,
        addressId,
      );
      expect(result.message).toBe('Default address updated successfully');
      expect(result.data).toEqual(addresses);
    });
  });

  describe('deleteAddress', () => {
    it('should delete an address', async () => {
      mockUsersService.deleteAddress.mockResolvedValue([]);

      const result = await controller.deleteAddress(userId, addressId);
      expect(mockUsersService.deleteAddress).toHaveBeenCalledWith(
        userId,
        addressId,
      );
      expect(result.message).toBe('Address deleted successfully');
      expect(result.data).toEqual([]);
    });
  });
});
