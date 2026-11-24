import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ICartRepository } from '../interfaces/cart-repository.interface';
import { Cart, CartDocument } from '../schemas/cart.schema';

@Injectable()
export class MongoCartRepository implements ICartRepository {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
  ) {}

  async findByUserId(userId: string): Promise<CartDocument | null> {
    return this.cartModel.findOne({ user: new Types.ObjectId(userId) }).exec();
  }

  async create(userId: string): Promise<CartDocument> {
    const cart = new this.cartModel({
      user: new Types.ObjectId(userId),
      items: [],
    });
    return cart.save();
  }

  async save(cart: CartDocument): Promise<CartDocument> {
    return cart.save();
  }

  async clear(userId: string): Promise<CartDocument | null> {
    return this.cartModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        { $set: { items: [] } },
        { new: true },
      )
      .exec();
  }
}
