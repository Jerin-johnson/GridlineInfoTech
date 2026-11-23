import {
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must be lower-case alphanumeric characters separated by hyphens',
  })
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Image must be a valid URL' })
  image?: string;

  @IsOptional()
  @IsMongoId({ message: 'Parent category must be a valid MongoDB ObjectId' })
  parent?: string | null;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
