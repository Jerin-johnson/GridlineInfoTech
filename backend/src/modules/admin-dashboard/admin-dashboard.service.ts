import { BadRequestException, Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { InventoryService } from '../products/inventory.service';
import {
  AdminDashboardQueryDto,
  DashboardRangePreset,
} from './dto/admin-dashboard-query.dto';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly inventoryService: InventoryService,
  ) {}

  async getDashboardAnalytics(query: AdminDashboardQueryDto) {
    const { preset, dateFrom, dateTo } = this.resolveDateRange(query);

    const [orderAnalytics, inventoryOverview] = await Promise.all([
      this.ordersService.getDashboardOrderAnalytics({ dateFrom, dateTo }),
      this.inventoryService.getDashboardInventoryOverview(6),
    ]);

    return {
      range: {
        preset,
        dateFrom: dateFrom?.toISOString() ?? null,
        dateTo: dateTo?.toISOString() ?? null,
      },
      kpis: {
        totalRevenue: orderAnalytics.totalRevenue,
        cryptoRevenue: orderAnalytics.cryptoRevenue,
        codCollected: orderAnalytics.codCollected,
        totalOrders: orderAnalytics.totalOrders,
        pendingOrders: orderAnalytics.pendingOrders,
        totalProducts: inventoryOverview.summary.totalProducts,
        lowStockProducts: inventoryOverview.summary.lowStockCount,
        outOfStockProducts: inventoryOverview.summary.outOfStockCount,
      },
      salesOverview: orderAnalytics.salesOverview,
      recentOrders: orderAnalytics.recentOrders,
      topProducts: orderAnalytics.topProducts,
      inventoryAlerts: inventoryOverview.alerts.map((item) => ({
        id: String(item._id),
        name: String(item.name),
        sku: String(item.sku),
        stock: Number(item.stock ?? 0),
        reservedStock: Number(item.reservedStock ?? 0),
        availableStock: Number(item.availableStock ?? 0),
        lowStockThreshold: Number(item.lowStockThreshold ?? 5),
        inventoryStatus: item.inventoryStatus,
      })),
      recentActivity: inventoryOverview.recentMovements.map((mov) => {
        const prod = mov.product as unknown as {
          name?: string;
          sku?: string;
        } | null;
        return {
          id: mov._id.toString(),
          type: mov.type,
          delta: mov.delta,
          quantity: mov.quantity,
          productName: prod?.name ?? 'Product',
          sku: prod?.sku ?? '—',
          reason: mov.reason,
          createdAt: mov.createdAt,
        };
      }),
    };
  }

  private resolveDateRange(query: AdminDashboardQueryDto): {
    preset: DashboardRangePreset | 'custom';
    dateFrom?: Date;
    dateTo?: Date;
  } {
    if (query.dateFrom || query.dateTo) {
      const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
      let dateTo: Date | undefined;
      if (query.dateTo) {
        dateTo = new Date(query.dateTo);
        if (query.dateTo.length <= 10) {
          dateTo.setUTCHours(23, 59, 59, 999);
        }
      }
      if (dateFrom && dateTo && dateFrom > dateTo) {
        throw new BadRequestException(
          'dateFrom must be before or equal to dateTo',
        );
      }
      return { preset: 'custom', dateFrom, dateTo };
    }

    const preset = query.range ?? '30d';
    if (preset === 'all') {
      return { preset };
    }

    const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
    const now = new Date();
    const dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { preset, dateFrom, dateTo: now };
  }
}
