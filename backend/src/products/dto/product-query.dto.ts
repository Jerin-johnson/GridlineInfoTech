import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ProductQueryDto {
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
  limit?: number = 12;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsMongoId({ message: 'Category must be a valid MongoDB ObjectId' })
  category?: string;

  @IsOptional()
  @IsMongoId({ message: 'Brand must be a valid MongoDB ObjectId' })
  brand?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsIn(['draft', 'published', 'out_of_stock', 'archived'])
  status?: 'draft' | 'published' | 'out_of_stock' | 'archived';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inStockOnly?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsIn(['price', 'createdAt', 'name', 'stock'])
  sortBy?: 'price' | 'createdAt' | 'name' | 'stock' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
