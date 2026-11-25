import { User, UserDocument } from '../schemas/user.schema';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserDocument | null>;
  findByEmailWithPassword(email: string): Promise<UserDocument | null>;
  findById(id: string): Promise<UserDocument | null>;
  create(data: Partial<User>): Promise<UserDocument>;
  updateLastLogin(id: string): Promise<void>;
  update(id: string, data: Partial<User>): Promise<UserDocument | null>;
  save(user: UserDocument): Promise<UserDocument>;
}
