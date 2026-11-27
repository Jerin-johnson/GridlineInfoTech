import {
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CheckoutDto {
  @IsMongoId({ message: 'addressId must be a valid MongoDB ObjectId' })
  addressId!: string;

  @IsOptional()
  @IsIn(['crypto_wallet', 'cod'], {
    message: "paymentMethod must be 'crypto_wallet' or 'cod'",
  })
  paymentMethod?: 'crypto_wallet' | 'cod' = 'crypto_wallet';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
