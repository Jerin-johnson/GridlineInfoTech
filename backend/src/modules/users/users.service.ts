import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { USER_REPOSITORY } from './constants/user.constants';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { IUserRepository } from './interfaces/user-repository.interface';
import { Address, UserDocument } from './schemas/user.schema';

export interface SafeUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  authProvider: string;
  role: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userRepository.findByEmailWithPassword(email);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userRepository.findById(id);
  }

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await this.getUserOrThrow(userId);
    return this.sanitizeUser(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<SafeUser> {
    const user = await this.getUserOrThrow(userId);

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName.trim();
    }
    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName.trim();
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone.trim();
    }
    if (dto.avatar !== undefined) {
      user.avatar = dto.avatar.trim();
    }

    const saved = await this.userRepository.save(user);
    return this.sanitizeUser(saved);
  }

  async getAddresses(userId: string): Promise<Address[]> {
    const user = await this.getUserOrThrow(userId);
    return user.addresses || [];
  }

  async addAddress(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<Address[]> {
    const user = await this.getUserOrThrow(userId);

    const isFirstAddress = !user.addresses || user.addresses.length === 0;
    const shouldBeDefault = isFirstAddress || dto.isDefault === true;

    if (shouldBeDefault && user.addresses) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    const newAddress: Address = {
      _id: new Types.ObjectId(),
      label: dto.label.trim(),
      fullName: dto.fullName.trim(),
      phone: dto.phone.trim(),
      line1: dto.line1.trim(),
      line2: dto.line2?.trim(),
      city: dto.city.trim(),
      state: dto.state.trim(),
      postalCode: dto.postalCode.trim(),
      country: dto.country?.trim() || 'US',
      isDefault: shouldBeDefault,
    };

    if (!user.addresses) {
      user.addresses = [];
    }
    user.addresses.push(newAddress);
    user.markModified('addresses');

    const saved = await this.userRepository.save(user);
    return saved.addresses;
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<Address[]> {
    if (!Types.ObjectId.isValid(addressId)) {
      throw new BadRequestException('Invalid address ID format');
    }

    const user = await this.getUserOrThrow(userId);
    const address = (user.addresses || []).find(
      (a) => a._id.toString() === addressId,
    );

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (dto.isDefault === true) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
      address.isDefault = true;
    } else if (dto.isDefault === false && address.isDefault) {
      address.isDefault = false;
      const other = user.addresses.find((a) => a._id.toString() !== addressId);
      if (other) {
        other.isDefault = true;
      }
    }

    if (dto.label !== undefined) address.label = dto.label.trim();
    if (dto.fullName !== undefined) address.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) address.phone = dto.phone.trim();
    if (dto.line1 !== undefined) address.line1 = dto.line1.trim();
    if (dto.line2 !== undefined) address.line2 = dto.line2.trim();
    if (dto.city !== undefined) address.city = dto.city.trim();
    if (dto.state !== undefined) address.state = dto.state.trim();
    if (dto.postalCode !== undefined) address.postalCode = dto.postalCode.trim();
    if (dto.country !== undefined) address.country = dto.country.trim();

    user.markModified('addresses');
    const saved = await this.userRepository.save(user);
    return saved.addresses;
  }

  async deleteAddress(
    userId: string,
    addressId: string,
  ): Promise<Address[]> {
    if (!Types.ObjectId.isValid(addressId)) {
      throw new BadRequestException('Invalid address ID format');
    }

    const user = await this.getUserOrThrow(userId);
    const index = (user.addresses || []).findIndex(
      (a) => a._id.toString() === addressId,
    );

    if (index === -1) {
      throw new NotFoundException('Address not found');
    }

    const wasDefault = user.addresses[index].isDefault;
    user.addresses.splice(index, 1);

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    user.markModified('addresses');
    const saved = await this.userRepository.save(user);
    return saved.addresses;
  }

  async setDefaultAddress(
    userId: string,
    addressId: string,
  ): Promise<Address[]> {
    if (!Types.ObjectId.isValid(addressId)) {
      throw new BadRequestException('Invalid address ID format');
    }

    const user = await this.getUserOrThrow(userId);
    const address = (user.addresses || []).find(
      (a) => a._id.toString() === addressId,
    );

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
    address.isDefault = true;

    user.markModified('addresses');
    const saved = await this.userRepository.save(user);
    return saved.addresses;
  }

  async createLocalUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
  }): Promise<UserDocument> {
    return this.userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash: data.passwordHash,
      authProvider: 'local',
      role: 'customer',
      isActive: true,
      isEmailVerified: false,
    });
  }

  async createGoogleUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    isEmailVerified: boolean;
  }): Promise<UserDocument> {
    return this.userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      avatar: data.avatar,
      authProvider: 'google',
      role: 'customer',
      isActive: true,
      isEmailVerified: data.isEmailVerified,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    return this.userRepository.updateLastLogin(id);
  }

  private async getUserOrThrow(userId: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const user = await this.userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found or inactive');
    }

    return user;
  }

  private sanitizeUser(user: UserDocument): SafeUser {
    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      authProvider: user.authProvider,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
