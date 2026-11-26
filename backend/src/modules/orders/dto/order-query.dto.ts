import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  FULFILMENT_STATUSES,
  PAYMENT_STATUSES,
} from '../constants/order.constants';
import type {
  FulfilmentStatus,
  PaymentStatus,
} from '../constants/order.constants';

export class OrderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @IsIn(FULFILMENT_STATUSES)
  fulfilmentStatus?: FulfilmentStatus;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: PaymentStatus;
}
