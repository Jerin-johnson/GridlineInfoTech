import { IsBoolean } from 'class-validator';

export class UpdateCustomerStatusDto {
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive!: boolean;
}
