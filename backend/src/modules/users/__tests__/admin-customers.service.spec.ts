import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Order } from '../../orders/schemas/order.schema';
import { AdminCustomersService } from '../admin-customers.service';
import { User } from '../schemas/user.schema';

describe('AdminCustomersService', () => {
  let service: AdminCustomersService;

  const validCustomerId = new Types.ObjectId().toHexString();

  const createSelectChain = (resolvedValue: unknown) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(resolvedValue),
  });

  const mockUserModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockOrderModel = {
    aggregate: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCustomersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
      ],
    }).compile();

    service = module.get<AdminCustomersService>(AdminCustomersService);
  });

  describe('findAllCustomers', () => {
    it('should query only role=customer, support search/status/pagination, and enrich order stats', async () => {
      const custObjId = new Types.ObjectId(validCustomerId);
      const mockCustomer = {
        _id: custObjId,
        firstName: 'Alex',
        lastName: 'Mercer',
        email: 'alex@example.com',
        authProvider: 'local',
        role: 'customer',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      };

      mockUserModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(1),
      });
      mockUserModel.find.mockReturnValueOnce(createSelectChain([mockCustomer]));
      mockOrderModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          {
            _id: custObjId,
            orderCount: 3,
            totalSpending: 45000,
          },
        ]),
      });

      const res = await service.findAllCustomers({
        page: 1,
        limit: 15,
        search: 'alex',
        status: 'active',
      });

      expect(mockUserModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'customer',
          isActive: true,
        }),
      );
      expect(res.data).toHaveLength(1);
      expect(res.data[0].orderCount).toBe(3);
      expect(res.data[0].totalSpending).toBe(45000);
      expect(
        (res.data[0] as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
      expect(res.meta).toEqual({
        page: 1,
        limit: 15,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('findCustomerById', () => {
    it('should return customer profile, addresses, order stats, and order history', async () => {
      const custObjId = new Types.ObjectId(validCustomerId);
      const mockCustomer = {
        _id: custObjId,
        firstName: 'Elena',
        lastName: 'Vance',
        email: 'elena@example.com',
        authProvider: 'google',
        role: 'customer',
        isActive: true,
        isEmailVerified: true,
        addresses: [
          {
            _id: new Types.ObjectId(),
            label: 'Garage',
            fullName: 'Elena Vance',
            phone: '555-0100',
            line1: '100 Track Rd',
            city: 'Austin',
            state: 'TX',
            postalCode: '78701',
            country: 'US',
            isDefault: true,
          },
        ],
        createdAt: new Date(),
      };

      const mockOrders = [
        {
          _id: new Types.ObjectId(),
          orderNumber: 'ORD-1001',
          fulfilmentStatus: 'delivered',
          paymentStatus: 'paid',
          paymentMethod: 'crypto_wallet',
          totalAmount: 25000,
          currency: 'USD',
          items: [{ quantity: 2 }],
          createdAt: new Date('2026-02-01T00:00:00Z'),
        },
        {
          _id: new Types.ObjectId(),
          orderNumber: 'ORD-1002',
          fulfilmentStatus: 'cancelled',
          paymentStatus: 'failed',
          paymentMethod: 'cod',
          totalAmount: 10000,
          currency: 'USD',
          items: [{ quantity: 1 }],
          createdAt: new Date('2026-01-15T00:00:00Z'),
        },
      ];

      mockUserModel.findOne.mockReturnValueOnce(
        createSelectChain(mockCustomer),
      );
      mockOrderModel.find.mockReturnValueOnce(createSelectChain(mockOrders));

      const result = await service.findCustomerById(validCustomerId);

      expect(mockUserModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'customer' }),
      );
      expect(result.customer.addresses).toHaveLength(1);
      expect(result.orderStats.totalOrders).toBe(2);
      expect(result.orderStats.completedOrders).toBe(1);
      expect(result.orderStats.cancelledOrders).toBe(1);
      expect(result.orderStats.totalSpending).toBe(25000);
      expect(result.orders[0].itemCount).toBe(2);
    });

    it('should throw NotFoundException when customer does not exist or is an admin', async () => {
      mockUserModel.findOne.mockReturnValueOnce(createSelectChain(null));

      await expect(service.findCustomerById(validCustomerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid customerId', async () => {
      await expect(service.findCustomerById('not-an-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateCustomerStatus', () => {
    it('should update isActive only for role=customer accounts', async () => {
      const custObjId = new Types.ObjectId(validCustomerId);
      mockUserModel.findOneAndUpdate.mockReturnValueOnce(
        createSelectChain({
          _id: custObjId,
          firstName: 'Alex',
          lastName: 'Mercer',
          email: 'alex@example.com',
          authProvider: 'local',
          role: 'customer',
          isActive: false,
          isEmailVerified: true,
        }),
      );

      const updated = await service.updateCustomerStatus(validCustomerId, {
        isActive: false,
      });

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: custObjId, role: 'customer' },
        { $set: { isActive: false } },
        { new: true },
      );
      expect(updated.isActive).toBe(false);
    });

    it('should throw NotFoundException when attempting to modify an admin or missing user', async () => {
      mockUserModel.findOneAndUpdate.mockReturnValueOnce(
        createSelectChain(null),
      );

      await expect(
        service.updateCustomerStatus(validCustomerId, { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
