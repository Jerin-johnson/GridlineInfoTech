import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminInventoryQueryDto {
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
  limit?: number = 15;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['all', 'in_stock', 'low_stock', 'out_of_stock'])
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' = 'all';

  @IsOptional()
  @IsIn([
    'name',
    'sku',
    'stock',
    'reservedStock',
    'availableStock',
    'updatedAt',
  ])
  sortBy?:
    | 'name'
    | 'sku'
    | 'stock'
    | 'reservedStock'
    | 'availableStock'
    | 'updatedAt' = 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
