import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Label cannot be empty' })
  label?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Full name cannot be empty' })
  fullName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Phone number cannot be empty' })
  phone?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Street address line 1 cannot be empty' })
  line1?: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'City cannot be empty' })
  city?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'State or province cannot be empty' })
  state?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Postal or ZIP code cannot be empty' })
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;
}
