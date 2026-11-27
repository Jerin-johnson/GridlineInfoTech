import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../../auth/constants/auth.constants';
import { AdminDashboardController } from '../admin-dashboard.controller';
import { AdminDashboardService } from '../admin-dashboard.service';
import { AdminDashboardQueryDto } from '../dto/admin-dashboard-query.dto';

describe('AdminDashboardController', () => {
  let controller: AdminDashboardController;

  const mockService = {
    getDashboardAnalytics: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDashboardController],
      providers: [{ provide: AdminDashboardService, useValue: mockService }],
    }).compile();

    controller = module.get<AdminDashboardController>(AdminDashboardController);
  });

  it('should require admin role via @Roles("admin") metadata', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminDashboardController);
    expect(roles).toEqual(['admin']);
  });

  it('should delegate dashboard query to AdminDashboardService', async () => {
    mockService.getDashboardAnalytics.mockResolvedValue({
      kpis: { totalRevenue: 0 },
    });

    const res = await controller.getDashboard({ range: '7d' });
    expect(mockService.getDashboardAnalytics).toHaveBeenCalledWith({
      range: '7d',
    });
    expect(res.message).toBe('Dashboard analytics retrieved successfully');
  });

  it('should reject invalid range and dates in AdminDashboardQueryDto', async () => {
    const dto = plainToInstance(AdminDashboardQueryDto, {
      range: '1000d',
      dateFrom: 'not-a-date',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
