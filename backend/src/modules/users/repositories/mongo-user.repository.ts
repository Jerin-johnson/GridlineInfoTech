import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUserRepository } from '../interfaces/user-repository.interface';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class MongoUserRepository implements IUserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async create(data: Partial<User>): Promise<UserDocument> {
    const created = new this.userModel({
      ...data,
      email: data.email?.toLowerCase().trim(),
    });
    return created.save();
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, { $set: { lastLoginAt: new Date() } })
      .exec();
  }

  async update(id: string, data: Partial<User>): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }
}
