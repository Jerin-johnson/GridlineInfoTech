import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

export class InitiatePaymentDto {
  @IsMongoId({ message: 'orderId must be a valid MongoDB ObjectId' })
  orderId!: string;

  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'walletAddress must be a valid EVM address',
  })
  walletAddress!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chainId?: number;
}
