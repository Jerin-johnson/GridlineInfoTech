import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateRefreshTokenData } from '../interfaces/auth.interfaces';
import { IRefreshTokenRepository } from '../interfaces/refresh-token-repository.interface';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../schemas/refresh-token.schema';

@Injectable()
export class MongoRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async create(data: CreateRefreshTokenData): Promise<RefreshTokenDocument> {
    const created = new this.refreshTokenModel({
      userId: new Types.ObjectId(data.userId),
      tokenHash: data.tokenHash,
      family: data.family,
      expiresAt: data.expiresAt,
      isRevoked: false,
    });
    return created.save();
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel.findOne({ tokenHash }).exec();
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await this.refreshTokenModel
      .updateOne({ tokenHash }, { $set: { isRevoked: true } })
      .exec();
  }

  async revokeFamily(family: string): Promise<void> {
    await this.refreshTokenModel
      .updateMany({ family }, { $set: { isRevoked: true } })
      .exec();
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.refreshTokenModel
      .updateMany(
        { userId: new Types.ObjectId(userId) },
        { $set: { isRevoked: true } },
      )
      .exec();
  }
}
