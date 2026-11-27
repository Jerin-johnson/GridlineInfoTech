import { IsDateString, IsIn, IsOptional } from 'class-validator';

export const DASHBOARD_RANGE_PRESETS = ['7d', '30d', '90d', 'all'] as const;
export type DashboardRangePreset = (typeof DASHBOARD_RANGE_PRESETS)[number];

export class AdminDashboardQueryDto {
  @IsOptional()
  @IsIn(DASHBOARD_RANGE_PRESETS)
  range?: DashboardRangePreset = '30d';

  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be a valid ISO date string' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be a valid ISO date string' })
  dateTo?: string;
}
