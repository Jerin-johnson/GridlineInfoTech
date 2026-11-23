import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from './constants/user.constants';
import type { IUserRepository } from './interfaces/user-repository.interface';
import { UserDocument } from './schemas/user.schema';

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
}
