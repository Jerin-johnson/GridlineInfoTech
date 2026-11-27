import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { InventoryService } from '../inventory.service';
import { InventoryMovement } from '../schemas/inventory-movement.schema';
import { Product } from '../schemas/product.schema';

describe('InventoryService', () => {
  let service: InventoryService;

  const validProductId = new Types.ObjectId().toHexString();
  const validAdminId = new Types.ObjectId().toHexString();

  const createExecChain = (resolvedValue: unknown) => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(resolvedValue),
    };
    return chain;
  };

  const mockProductModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockMovementModel = {
    create: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken(InventoryMovement.name),
          useValue: mockMovementModel,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('getInventoryList', () => {
    it('should return paginated inventory items, meta, and summary', async () => {
      const mockProductDoc = {
        _id: validProductId,
        name: 'Titanium Exhaust',
        sku: 'EXH-001',
        stock: 12,
        reservedStock: 4,
        lowStockThreshold: 5,
        status: 'published',
        toObject() {
          return this;
        },
      };

      mockProductModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          {
            totalProducts: 1,
            totalStockUnits: 12,
            totalReservedStock: 4,
            totalAvailableStock: 8,
            lowStockCount: 0,
            outOfStockCount: 0,
          },
        ]),
      });
      mockProductModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(1),
      });
      mockProductModel.find.mockReturnValueOnce(
        createExecChain([mockProductDoc]),
      );

      const result = await service.getInventoryList({
        page: 1,
        limit: 15,
        search: 'Exhaust',
        stockStatus: 'in_stock',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].availableStock).toBe(8);
      expect(result.data[0].inventoryStatus).toBe('in_stock');
      expect(result.summary.totalStockUnits).toBe(12);
      expect(result.summary.totalReservedStock).toBe(4);
      expect(result.summary.totalAvailableStock).toBe(8);
      expect(result.meta).toEqual({
        page: 1,
        limit: 15,
        total: 1,
        totalPages: 1,
      });
    });

    it('should classify low_stock and out_of_stock statuses accurately', async () => {
      const lowDoc = {
        _id: new Types.ObjectId().toHexString(),
        name: 'Low Brake Kit',
        sku: 'BRK-LOW',
        stock: 5,
        reservedStock: 2,
        lowStockThreshold: 5,
        status: 'published',
        toObject() {
          return this;
        },
      };
      const zeroDoc = {
        _id: new Types.ObjectId().toHexString(),
        name: 'Empty Intake',
        sku: 'INT-000',
        stock: 2,
        reservedStock: 2,
        lowStockThreshold: 5,
        status: 'out_of_stock',
        toObject() {
          return this;
        },
      };

      mockProductModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([]),
      });
      mockProductModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(2),
      });
      mockProductModel.find.mockReturnValueOnce(
        createExecChain([lowDoc, zeroDoc]),
      );

      const result = await service.getInventoryList({});
      expect(result.data[0].inventoryStatus).toBe('low_stock');
      expect(result.data[1].inventoryStatus).toBe('out_of_stock');
    });
  });

  describe('adjustInventory', () => {
    it('should increase stock atomically and record an admin_adjustment movement', async () => {
      const existing = {
        _id: validProductId,
        stock: 0,
        reservedStock: 0,
        lowStockThreshold: 5,
        status: 'out_of_stock',
      };
      const updated = {
        ...existing,
        stock: 10,
        status: 'out_of_stock',
        toObject() {
          return this;
        },
      };
      const synced = {
        ...updated,
        status: 'published',
        toObject() {
          return this;
        },
      };

      mockProductModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(existing),
      });
      mockProductModel.findOneAndUpdate.mockReturnValueOnce(
        createExecChain(updated),
      );
      mockProductModel.findByIdAndUpdate.mockReturnValueOnce(
        createExecChain(synced),
      );
      mockMovementModel.create.mockResolvedValue({
        _id: new Types.ObjectId().toHexString(),
        type: 'admin_adjustment',
        delta: 10,
      });

      const result = await service.adjustInventory(
        validProductId,
        validAdminId,
        {
          type: 'increase',
          quantity: 10,
          reason: 'Restock shipment #42',
        },
      );

      expect(result.product.stock).toBe(10);
      expect(result.product.availableStock).toBe(10);
      expect(result.product.status).toBe('published');
      expect(mockMovementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'admin_adjustment',
          quantity: 10,
          delta: 10,
          previousStock: 0,
          resultingStock: 10,
          reason: 'Restock shipment #42',
        }),
      );
    });

    it('should prevent decreasing stock below reserved quantity', async () => {
      mockProductModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: validProductId,
          stock: 10,
          reservedStock: 6,
          status: 'published',
        }),
      });

      await expect(
        service.adjustInventory(validProductId, validAdminId, {
          type: 'decrease',
          quantity: 5,
          reason: 'Damaged units',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockProductModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should reject concurrent decrease if atomic precondition fails', async () => {
      mockProductModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({
            _id: validProductId,
            stock: 10,
            reservedStock: 2,
            status: 'published',
          }),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({
            _id: validProductId,
            stock: 10,
            reservedStock: 7,
            status: 'published',
          }),
        });
      mockProductModel.findOneAndUpdate.mockReturnValueOnce(
        createExecChain(null),
      );

      await expect(
        service.adjustInventory(validProductId, validAdminId, {
          type: 'decrease',
          quantity: 5,
          reason: 'Audit correction',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid productId, empty reason, or archived product', async () => {
      await expect(
        service.adjustInventory('invalid-id', validAdminId, {
          type: 'increase',
          quantity: 1,
          reason: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.adjustInventory(validProductId, validAdminId, {
          type: 'increase',
          quantity: 1,
          reason: '   ',
        }),
      ).rejects.toThrow(BadRequestException);

      mockProductModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: validProductId,
          status: 'archived',
        }),
      });
      await expect(
        service.adjustInventory(validProductId, validAdminId, {
          type: 'increase',
          quantity: 1,
          reason: 'Valid reason',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMovements', () => {
    it('should return paginated inventory movements', async () => {
      const mockMovement = {
        _id: new Types.ObjectId().toHexString(),
        type: 'admin_adjustment',
        quantity: 5,
        delta: 5,
        previousStock: 10,
        resultingStock: 15,
        reason: 'Received batch',
      };
      mockMovementModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(1),
      });
      mockMovementModel.find.mockReturnValueOnce(
        createExecChain([mockMovement]),
      );

      const res = await service.getMovements({
        page: 1,
        limit: 20,
        productId: validProductId,
      });

      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });
  });
});
