import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AdjustInventoryDto {
  @IsIn(['increase', 'decrease'])
  type!: 'increase' | 'decrease';

  @Type(() => Number)
  @IsInt({ message: 'Quantity must be a whole integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(100000, { message: 'Quantity cannot exceed 100,000 per adjustment' })
  quantity!: number;

  @IsString()
  @IsNotEmpty({ message: 'Adjustment reason is required' })
  @MaxLength(500)
  reason!: string;
}
