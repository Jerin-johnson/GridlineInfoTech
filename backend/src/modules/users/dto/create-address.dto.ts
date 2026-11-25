import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty({ message: 'Label is required' })
  label!: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: 'Street address line 1 is required' })
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city!: string;

  @IsString()
  @IsNotEmpty({ message: 'State or province is required' })
  state!: string;

  @IsString()
  @IsNotEmpty({ message: 'Postal or ZIP code is required' })
  postalCode!: string;

  @IsOptional()
  @IsString()
  country?: string = 'US';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean = false;
}
