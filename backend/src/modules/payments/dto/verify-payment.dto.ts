import { Type } from 'class-transformer';
import { IsInt, IsMongoId, Matches, Min } from 'class-validator';

export class VerifyPaymentDto {
  @IsMongoId({ message: 'orderId must be a valid MongoDB ObjectId' })
  orderId!: string;

  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message: 'transactionHash must be a valid 32-byte EVM transaction hash',
  })
  transactionHash!: string;

  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'walletAddress must be a valid EVM address',
  })
  walletAddress!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  chainId!: number;
}
