import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../../orders/orders.service';
import { InventoryService } from '../../products/inventory.service';
import { AdminDashboardService } from '../admin-dashboard.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;

  const mockOrdersService = {
    getDashboardOrderAnalytics: jest.fn(),
  };

  const mockInventoryService = {
    getDashboardInventoryOverview: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: InventoryService, useValue: mockInventoryService },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
  });

  it('should assemble real KPIs, sales overview, recent orders, top products, alerts, and recent activity', async () => {
    mockOrdersService.getDashboardOrderAnalytics.mockResolvedValue({
      totalRevenue: 120000,
      cryptoRevenue: 70000,
      codCollected: 50000,
      totalOrders: 5,
      pendingOrders: 2,
      salesOverview: [
        {
          date: '2026-11-27',
          revenue: 120000,
          orders: 5,
          cryptoRevenue: 70000,
          codRevenue: 50000,
        },
      ],
      recentOrders: [
        {
          id: 'ord-1',
          orderNumber: 'ORD-1001',
          customerName: 'Alex Mercer',
          customerEmail: 'alex@example.com',
          totalAmount: 50000,
          currency: 'USD',
          paymentMethod: 'crypto_wallet',
          paymentStatus: 'paid',
          fulfilmentStatus: 'processing',
          createdAt: new Date(),
        },
      ],
      topProducts: [
        {
          productId: 'prod-1',
          name: 'Titanium Exhaust',
          sku: 'EXH-01',
          unitsSold: 3,
          revenue: 90000,
        },
      ],
    });

    mockInventoryService.getDashboardInventoryOverview.mockResolvedValue({
      summary: {
        totalProducts: 12,
        totalStockUnits: 100,
        totalAvailableStock: 90,
        totalReservedStock: 10,
        lowStockCount: 2,
        outOfStockCount: 1,
      },
      alerts: [
        {
          _id: 'prod-2',
          name: 'Carbon Diffuser',
          sku: 'AER-02',
          stock: 2,
          reservedStock: 2,
          availableStock: 0,
          lowStockThreshold: 5,
          inventoryStatus: 'out_of_stock',
        },
      ],
      recentMovements: [
        {
          _id: { toString: () => 'mov-1' },
          type: 'admin_adjustment',
          delta: 5,
          quantity: 5,
          product: { name: 'Titanium Exhaust', sku: 'EXH-01' },
          reason: 'Restock',
          createdAt: new Date(),
        },
      ],
    });

    const result = await service.getDashboardAnalytics({ range: '30d' });

    expect(result.kpis).toEqual({
      totalRevenue: 120000,
      cryptoRevenue: 70000,
      codCollected: 50000,
      totalOrders: 5,
      pendingOrders: 2,
      totalProducts: 12,
      lowStockProducts: 2,
      outOfStockProducts: 1,
    });
    expect(result.salesOverview).toHaveLength(1);
    expect(result.recentOrders).toHaveLength(1);
    expect(result.topProducts).toHaveLength(1);
    expect(result.inventoryAlerts).toHaveLength(1);
    expect(result.recentActivity).toHaveLength(1);
  });

  it('should support range="all" without date bounds', async () => {
    mockOrdersService.getDashboardOrderAnalytics.mockResolvedValue({
      totalRevenue: 0,
      cryptoRevenue: 0,
      codCollected: 0,
      totalOrders: 0,
      pendingOrders: 0,
      salesOverview: [],
      recentOrders: [],
      topProducts: [],
    });
    mockInventoryService.getDashboardInventoryOverview.mockResolvedValue({
      summary: {
        totalProducts: 0,
        totalStockUnits: 0,
        totalAvailableStock: 0,
        totalReservedStock: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      },
      alerts: [],
      recentMovements: [],
    });

    const result = await service.getDashboardAnalytics({ range: 'all' });
    expect(result.range).toEqual({
      preset: 'all',
      dateFrom: null,
      dateTo: null,
    });
    expect(mockOrdersService.getDashboardOrderAnalytics).toHaveBeenCalledWith({
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it('should reject invalid date range where dateFrom > dateTo', async () => {
    await expect(
      service.getDashboardAnalytics({
        dateFrom: '2026-12-10',
        dateTo: '2026-12-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
