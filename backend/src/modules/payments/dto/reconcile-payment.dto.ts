import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const RECONCILE_ACTIONS = ['fulfill', 'refund'] as const;
export type ReconcileAction = (typeof RECONCILE_ACTIONS)[number];

export class ReconcilePaymentDto {
  @IsIn(RECONCILE_ACTIONS)
  action!: ReconcileAction;

  @ValidateIf((o: ReconcilePaymentDto) => o.action === 'refund')
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message:
      'refundTxHash must be a valid 66-character hex transaction hash starting with 0x',
  })
  refundTxHash?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
