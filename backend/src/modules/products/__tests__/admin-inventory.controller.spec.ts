import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../../auth/constants/auth.constants';
import { AdminInventoryController } from '../admin-inventory.controller';
import { InventoryService } from '../inventory.service';

describe('AdminInventoryController', () => {
  let controller: AdminInventoryController;

  const mockInventoryService = {
    getInventoryList: jest.fn(),
    getMovements: jest.fn(),
    adjustInventory: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminInventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    }).compile();

    controller = module.get<AdminInventoryController>(AdminInventoryController);
  });

  it('should require admin role via @Roles("admin") metadata', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminInventoryController);
    expect(roles).toEqual(['admin']);
  });

  it('should return inventory list and summary', async () => {
    mockInventoryService.getInventoryList.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 15, total: 0, totalPages: 0 },
      summary: {
        totalProducts: 0,
        totalStockUnits: 0,
        totalAvailableStock: 0,
        totalReservedStock: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      },
    });

    const result = await controller.getInventory({ page: 1, limit: 15 });
    expect(result.message).toBe('Inventory retrieved successfully');
    expect(result.summary.totalProducts).toBe(0);
  });

  it('should delegate stock adjustment to InventoryService', async () => {
    mockInventoryService.adjustInventory.mockResolvedValue({
      product: { _id: 'prod-1', stock: 15, availableStock: 15 },
      movement: { _id: 'mov-1', delta: 5 },
    });

    const result = await controller.adjustStock('prod-1', 'admin-1', {
      type: 'increase',
      quantity: 5,
      reason: 'Restock',
    });

    expect(mockInventoryService.adjustInventory).toHaveBeenCalledWith(
      'prod-1',
      'admin-1',
      { type: 'increase', quantity: 5, reason: 'Restock' },
    );
    expect(result.message).toBe('Inventory adjusted successfully');
  });
});
