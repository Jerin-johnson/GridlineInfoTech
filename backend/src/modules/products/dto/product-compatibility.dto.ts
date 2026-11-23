import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ProductCompatibilityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  make!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  yearFrom!: number;

  @IsInt()
  @Min(1900)
  @Max(2100)
  yearTo!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
