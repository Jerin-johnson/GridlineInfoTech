import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsMongoId,
  Min,
  ValidateNested,
} from 'class-validator';

export class MergeCartItemDto {
  @IsMongoId({ message: 'Product ID must be a valid MongoDB ObjectId' })
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;
}

export class MergeCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MergeCartItemDto)
  items!: MergeCartItemDto[];
}
