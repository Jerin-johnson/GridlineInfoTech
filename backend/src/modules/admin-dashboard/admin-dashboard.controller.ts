import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardQueryDto } from './dto/admin-dashboard-query.dto';

@Controller('admin/dashboard')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  async getDashboard(@Query() query: AdminDashboardQueryDto) {
    const data = await this.adminDashboardService.getDashboardAnalytics(query);
    return {
      message: 'Dashboard analytics retrieved successfully',
      data,
    };
  }
}
