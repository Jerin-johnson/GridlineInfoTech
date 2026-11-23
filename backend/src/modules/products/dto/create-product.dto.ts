import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductCompatibilityDto } from './product-compatibility.dto';
import { ProductImageDto } from './product-image.dto';
import { ProductSpecificationDto } from './product-specification.dto';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must be lower-case alphanumeric characters separated by hyphens',
  })
  @MaxLength(200)
  slug?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9-_]+$/, {
    message:
      'SKU must only contain alphanumeric characters, hyphens, and underscores',
  })
  @MaxLength(50)
  sku!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsMongoId({ message: 'Category must be a valid MongoDB ObjectId' })
  @IsNotEmpty()
  category!: string;

  @IsMongoId({ message: 'Brand must be a valid MongoDB ObjectId' })
  @IsNotEmpty()
  brand!: string;

  @IsInt({ message: 'Price must be an integer minor unit (cents)' })
  @Min(0, { message: 'Price must be non-negative' })
  price!: number;

  @IsOptional()
  @IsInt({ message: 'compareAtPrice must be an integer minor unit (cents)' })
  @Min(0, { message: 'compareAtPrice must be non-negative' })
  compareAtPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationDto)
  specifications?: ProductSpecificationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCompatibilityDto)
  compatibility?: ProductCompatibilityDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reservedStock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsIn(['draft', 'published', 'out_of_stock', 'archived'])
  status?: 'draft' | 'published' | 'out_of_stock' | 'archived';

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
