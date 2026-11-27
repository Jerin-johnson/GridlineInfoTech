import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../../auth/constants/auth.constants';
import { AdminCustomersController } from '../admin-customers.controller';
import { AdminCustomersService } from '../admin-customers.service';

describe('AdminCustomersController', () => {
  let controller: AdminCustomersController;

  const mockService = {
    findAllCustomers: jest.fn(),
    findCustomerById: jest.fn(),
    updateCustomerStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCustomersController],
      providers: [
        {
          provide: AdminCustomersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AdminCustomersController>(AdminCustomersController);
  });

  it('should require admin role via @Roles("admin") metadata', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminCustomersController);
    expect(roles).toEqual(['admin']);
  });

  it('should return paginated customers', async () => {
    mockService.findAllCustomers.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 15, total: 0, totalPages: 0 },
    });

    const result = await controller.findAllCustomers({ page: 1, limit: 15 });
    expect(result.message).toBe('Customers retrieved successfully');
    expect(result.data).toEqual([]);
  });

  it('should delegate customer detail retrieval', async () => {
    mockService.findCustomerById.mockResolvedValue({
      customer: { _id: 'cust-1', email: 'cust@example.com' },
      orderStats: { totalOrders: 0 },
      orders: [],
    });

    const result = await controller.findCustomerById('cust-1');
    expect(mockService.findCustomerById).toHaveBeenCalledWith('cust-1');
    expect(result.message).toBe('Customer retrieved successfully');
  });

  it('should delegate status update without role modification', async () => {
    mockService.updateCustomerStatus.mockResolvedValue({
      _id: 'cust-1',
      isActive: false,
      role: 'customer',
    });

    const result = await controller.updateCustomerStatus('cust-1', {
      isActive: false,
    });
    expect(mockService.updateCustomerStatus).toHaveBeenCalledWith('cust-1', {
      isActive: false,
    });
    expect(result.data.isActive).toBe(false);
  });
});
