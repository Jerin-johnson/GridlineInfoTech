import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  INVENTORY_MOVEMENT_TYPES,
  type InventoryMovementType,
} from '../schemas/inventory-movement.schema';

export class InventoryMovementQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsMongoId({ message: 'Invalid product ID format' })
  productId?: string;

  @IsOptional()
  @IsIn(INVENTORY_MOVEMENT_TYPES)
  type?: InventoryMovementType;
}
