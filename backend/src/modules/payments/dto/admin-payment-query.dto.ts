import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const ADMIN_PAYMENT_STATUS_FILTERS = [
  'all',
  'verified',
  'paid',
  'pending',
  'confirming',
  'failed',
  'expired',
] as const;

export type AdminPaymentStatusFilter =
  (typeof ADMIN_PAYMENT_STATUS_FILTERS)[number];

export class AdminPaymentQueryDto {
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
  @IsIn(ADMIN_PAYMENT_STATUS_FILTERS)
  status?: AdminPaymentStatusFilter = 'all';

  @IsOptional()
  @IsIn(['all', 'crypto_wallet', 'cod'])
  paymentMethod?: 'all' | 'crypto_wallet' | 'cod' = 'all';

  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be a valid ISO date string' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be a valid ISO date string' })
  dateTo?: string;
}
