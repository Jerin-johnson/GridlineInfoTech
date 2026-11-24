import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, Min } from 'class-validator';

export class AddToCartDto {
  @IsMongoId({ message: 'Product ID must be a valid MongoDB ObjectId' })
  productId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity?: number = 1;
}
