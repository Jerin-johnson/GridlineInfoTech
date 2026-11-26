import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckoutDto {
  @IsMongoId({ message: 'addressId must be a valid MongoDB ObjectId' })
  addressId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
