import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ADMIN_SETTABLE_FULFILMENT_STATUSES } from '../constants/order.constants';
import type { FulfilmentStatus } from '../constants/order.constants';

export class UpdateOrderStatusDto {
  @IsIn(ADMIN_SETTABLE_FULFILMENT_STATUSES)
  fulfilmentStatus!: FulfilmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;

  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'trackingUrl must be a valid HTTP/HTTPS URL' },
  )
  @MaxLength(500)
  trackingUrl?: string;
}
