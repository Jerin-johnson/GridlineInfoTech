import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { AdminInventoryQueryDto } from './dto/admin-inventory-query.dto';
import { InventoryMovementQueryDto } from './dto/inventory-movement-query.dto';
import {
  InventoryMovement,
  InventoryMovementDocument,
} from './schemas/inventory-movement.schema';
import { Product, ProductDocument } from './schemas/product.schema';

export type InventoryStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface InventorySummary {
  totalProducts: number;
  totalStockUnits: number;
  totalAvailableStock: number;
  totalReservedStock: number;
  lowStockCount: number;
  outOfStockCount: number;
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(InventoryMovement.name)
    private readonly movementModel: Model<InventoryMovementDocument>,
  ) {}

  async getInventoryList(query: AdminInventoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<ProductDocument> = {
      status: { $ne: 'archived' },
    };

    if (query.search?.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { sku: regex }];
    }

    if (query.stockStatus === 'in_stock') {
      filter.$expr = {
        $gt: [
          { $subtract: ['$stock', '$reservedStock'] },
          '$lowStockThreshold',
        ],
      };
    } else if (query.stockStatus === 'low_stock') {
      filter.$expr = {
        $and: [
          { $gt: [{ $subtract: ['$stock', '$reservedStock'] }, 0] },
          {
            $lte: [
              { $subtract: ['$stock', '$reservedStock'] },
              '$lowStockThreshold',
            ],
          },
        ],
      };
    } else if (query.stockStatus === 'out_of_stock') {
      filter.$expr = {
        $lte: [{ $subtract: ['$stock', '$reservedStock'] }, 0],
      };
    }

    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortBy = query.sortBy ?? 'updatedAt';

    const [summaryAgg, total, items] = await Promise.all([
      this.productModel
        .aggregate<InventorySummary>([
          { $match: { status: { $ne: 'archived' } } },
          {
            $project: {
              stock: { $ifNull: ['$stock', 0] },
              reservedStock: { $ifNull: ['$reservedStock', 0] },
              lowStockThreshold: { $ifNull: ['$lowStockThreshold', 5] },
              availableStock: {
                $max: [
                  0,
                  {
                    $subtract: [
                      { $ifNull: ['$stock', 0] },
                      { $ifNull: ['$reservedStock', 0] },
                    ],
                  },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              totalProducts: { $sum: 1 },
              totalStockUnits: { $sum: '$stock' },
              totalReservedStock: { $sum: '$reservedStock' },
              totalAvailableStock: { $sum: '$availableStock' },
              lowStockCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gt: ['$availableStock', 0] },
                        { $lte: ['$availableStock', '$lowStockThreshold'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              outOfStockCount: {
                $sum: {
                  $cond: [{ $lte: ['$availableStock', 0] }, 1, 0],
                },
              },
            },
          },
        ])
        .exec(),
      this.productModel.countDocuments(filter).exec(),
      this.fetchSortedInventoryItems(filter, sortBy, sortOrder, skip, limit),
    ]);

    const summary: InventorySummary = summaryAgg[0] ?? {
      totalProducts: 0,
      totalStockUnits: 0,
      totalAvailableStock: 0,
      totalReservedStock: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    };

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: items.map((item) => this.formatInventoryItem(item)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
      summary,
    };
  }

  private async fetchSortedInventoryItems(
    filter: FilterQuery<ProductDocument>,
    sortBy: string,
    sortOrder: 1 | -1,
    skip: number,
    limit: number,
  ): Promise<ProductDocument[]> {
    if (sortBy === 'availableStock') {
      const idsResult = await this.productModel
        .aggregate<{ _id: Types.ObjectId }>([
          { $match: filter },
          {
            $addFields: {
              availableStock: {
                $max: [
                  0,
                  {
                    $subtract: [
                      { $ifNull: ['$stock', 0] },
                      { $ifNull: ['$reservedStock', 0] },
                    ],
                  },
                ],
              },
            },
          },
          { $sort: { availableStock: sortOrder, _id: -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: { _id: 1 } },
        ])
        .exec();

      if (idsResult.length === 0) return [];
      const ids = idsResult.map((d) => d._id);
      const docs = await this.productModel
        .find({ _id: { $in: ids } })
        .populate('category', 'name slug')
        .populate('brand', 'name slug')
        .exec();

      const docMap = new Map<string, ProductDocument>();
      for (const d of docs) {
        docMap.set(d._id.toString(), d);
      }
      const ordered: ProductDocument[] = [];
      for (const id of ids) {
        const match = docMap.get(id.toString());
        if (match) ordered.push(match);
      }
      return ordered;
    }

    return this.productModel
      .find(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort({ [sortBy]: sortOrder, _id: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async adjustInventory(
    productId: string,
    adminUserId: string,
    dto: AdjustInventoryDto,
  ) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID format');
    }
    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException('Adjustment reason is required');
    }

    const existing = await this.productModel.findById(productId).exec();
    if (!existing || existing.status === 'archived') {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    const delta = dto.type === 'increase' ? dto.quantity : -dto.quantity;
    const previousStock = existing.stock ?? 0;
    const previousReserved = existing.reservedStock ?? 0;

    if (delta < 0 && previousStock + delta < previousReserved) {
      throw new BadRequestException(
        `Cannot decrease stock by ${dto.quantity}. Resulting stock (${previousStock + delta}) cannot be less than reserved stock (${previousReserved}).`,
      );
    }

    const atomicFilter: FilterQuery<ProductDocument> = {
      _id: new Types.ObjectId(productId),
      status: { $ne: 'archived' },
    };

    if (delta < 0) {
      atomicFilter.stock = { $gte: dto.quantity };
      atomicFilter.$expr = {
        $gte: [{ $add: ['$stock', delta] }, '$reservedStock'],
      };
    }

    let updated = await this.productModel
      .findOneAndUpdate(atomicFilter, { $inc: { stock: delta } }, { new: true })
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .exec();

    if (!updated) {
      const latest = await this.productModel.findById(productId).exec();
      if (!latest || latest.status === 'archived') {
        throw new NotFoundException(`Product with ID '${productId}' not found`);
      }
      throw new BadRequestException(
        `Stock adjustment rejected: resulting stock cannot drop below reserved quantity (${latest.reservedStock ?? 0}) or zero.`,
      );
    }

    const resultingAvailable = Math.max(
      0,
      (updated.stock ?? 0) - (updated.reservedStock ?? 0),
    );
    let nextStatus = updated.status;
    if (updated.status === 'out_of_stock' && resultingAvailable > 0) {
      nextStatus = 'published';
    } else if (updated.status === 'published' && resultingAvailable <= 0) {
      nextStatus = 'out_of_stock';
    }

    if (nextStatus !== updated.status) {
      const synced = await this.productModel
        .findByIdAndUpdate(
          productId,
          { $set: { status: nextStatus } },
          { new: true },
        )
        .populate('category', 'name slug')
        .populate('brand', 'name slug')
        .exec();
      if (synced) updated = synced;
    }

    const movement = await this.movementModel.create({
      product: new Types.ObjectId(productId),
      type: 'admin_adjustment',
      quantity: dto.quantity,
      delta,
      previousStock,
      resultingStock: updated.stock,
      previousReservedStock: previousReserved,
      resultingReservedStock: updated.reservedStock ?? 0,
      reason,
      actor: Types.ObjectId.isValid(adminUserId)
        ? new Types.ObjectId(adminUserId)
        : undefined,
    });

    return {
      product: this.formatInventoryItem(updated),
      movement,
    };
  }

  async getMovements(query: InventoryMovementQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<InventoryMovementDocument> = {};
    if (query.productId) {
      filter.product = new Types.ObjectId(query.productId);
    }
    if (query.type) {
      filter.type = query.type;
    }

    const [total, movements] = await Promise.all([
      this.movementModel.countDocuments(filter).exec(),
      this.movementModel
        .find(filter)
        .populate('product', 'name sku')
        .populate('actor', 'firstName lastName email')
        .populate('order', 'orderNumber')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    return {
      data: movements,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  private formatInventoryItem(product: ProductDocument) {
    const raw = product.toObject ? product.toObject() : product;
    const stock = raw.stock ?? 0;
    const reservedStock = raw.reservedStock ?? 0;
    const lowStockThreshold = raw.lowStockThreshold ?? 5;
    const availableStock = Math.max(0, stock - reservedStock);

    let inventoryStatus: InventoryStockStatus = 'in_stock';
    if (availableStock <= 0) {
      inventoryStatus = 'out_of_stock';
    } else if (availableStock <= lowStockThreshold) {
      inventoryStatus = 'low_stock';
    }

    return {
      ...raw,
      availableStock,
      inventoryStatus,
    };
  }

  async getDashboardInventoryOverview(alertLimit = 6) {
    const [lowRes, outRes, movementsRes] = await Promise.all([
      this.getInventoryList({
        page: 1,
        limit: alertLimit,
        stockStatus: 'low_stock',
        sortBy: 'availableStock',
        sortOrder: 'asc',
      }),
      this.getInventoryList({
        page: 1,
        limit: alertLimit,
        stockStatus: 'out_of_stock',
        sortBy: 'availableStock',
        sortOrder: 'asc',
      }),
      this.getMovements({ page: 1, limit: 6 }),
    ]);

    const alerts = [...outRes.data, ...lowRes.data].slice(0, alertLimit);

    return {
      summary: lowRes.summary,
      alerts,
      recentMovements: movementsRes.data,
    };
  }
}
