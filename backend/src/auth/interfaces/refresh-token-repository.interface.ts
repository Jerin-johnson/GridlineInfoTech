import { CreateRefreshTokenData } from './auth.interfaces';
import { RefreshTokenDocument } from '../schemas/refresh-token.schema';

export interface IRefreshTokenRepository {
  create(data: CreateRefreshTokenData): Promise<RefreshTokenDocument>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenDocument | null>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  revokeFamily(family: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
}
