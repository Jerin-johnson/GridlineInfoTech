import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ProductSpecificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  value!: string;
}
