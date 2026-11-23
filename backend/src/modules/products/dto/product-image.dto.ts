import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class ProductImageDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'Image url must be a valid URL' })
  url!: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
