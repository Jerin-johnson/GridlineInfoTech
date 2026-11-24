import { CartDocument } from '../schemas/cart.schema';

export interface ICartRepository {
  findByUserId(userId: string): Promise<CartDocument | null>;
  create(userId: string): Promise<CartDocument>;
  save(cart: CartDocument): Promise<CartDocument>;
  clear(userId: string): Promise<CartDocument | null>;
}
