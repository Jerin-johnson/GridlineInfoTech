/// <reference types="jest" />
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CartService } from '../../cart/cart.service';
import { ProductsService } from '../../products/products.service';
import { UsersService } from '../../users/users.service';
import { ORDER_REPOSITORY } from '../constants/order.constants';
import { OrdersService } from '../orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockOrderRepository: {
    create: jest.Mock;
    findByIdAndUser: jest.Mock;
    findByIdempotencyKey: jest.Mock;
    findAllByUser: jest.Mock;
    cancelOrderAtomically: jest.Mock;
    findAllForAdmin: jest.Mock;
    findByIdForAdmin: jest.Mock;
    updateAdminStatusAtomically: jest.Mock;
    getPaymentRevenueSummary: jest.Mock;
    countFailedOrExpiredCodOrders: jest.Mock;
    findCodOrdersForAdminPayments: jest.Mock;
    findCodOrderByIdForAdminPayment: jest.Mock;
  };
  let mockCartService: {
    getCart: jest.Mock;
    clearCart: jest.Mock;
  };
  let mockProductsService: {
    findById: jest.Mock;
    reserveStock: jest.Mock;
    releaseStock: jest.Mock;
    confirmStockDeduction: jest.Mock;
  };
  let mockUsersService: {
    getProfile: jest.Mock;
    getAddresses: jest.Mock;
  };

  const userId = new Types.ObjectId().toString();
  const addressId = new Types.ObjectId().toString();
  const prodId1 = new Types.ObjectId().toString();
  const prodId2 = new Types.ObjectId().toString();
  const orderId = new Types.ObjectId().toString();

  const mockAddress = {
    _id: new Types.ObjectId(addressId),
    label: 'Home',
    fullName: 'Alex Vance',
    phone: '+1-555-0199',
    line1: '742 Evergreen Terrace',
    line2: 'Apt 4B',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62704',
    country: 'US',
    isDefault: true,
  };

  const mockUserProfile = {
    id: userId,
    firstName: 'Alex',
    lastName: 'Vance',
    email: 'alex@gridline.com',
    authProvider: 'local',
    role: 'customer',
    isActive: true,
    isEmailVerified: true,
  };

  const makeMockOrderDoc = (overrides: Record<string, unknown> = {}) => {
    const base = {
      _id: new Types.ObjectId(orderId),
      orderNumber: 'ORD-20261126-ABC123',
      paymentReference: 'PAY-1234567890ABCDEF',
      user: new Types.ObjectId(userId),
      customerEmail: 'alex@gridline.com',
      items: [
        {
          product: new Types.ObjectId(prodId1),
          name: 'Brembo Brake Rotor',
          sku: 'BRM-01',
          slug: 'brembo-brake-rotor',
          image: 'https://img.com/rotor.jpg',
          unitPrice: 35000,
          quantity: 2,
          lineTotal: 70000,
        },
      ],
      shippingAddress: {
        addressId: new Types.ObjectId(addressId),
        label: 'Home',
        fullName: 'Alex Vance',
        phone: '+1-555-0199',
        line1: '742 Evergreen Terrace',
        line2: 'Apt 4B',
        city: 'Springfield',
        state: 'IL',
        postalCode: '62704',
        country: 'US',
      },
      subtotal: 70000,
      shippingCost: 0,
      taxAmount: 0,
      totalAmount: 70000,
      currency: 'USD',
      paymentMethod: 'crypto_wallet',
      paymentStatus: 'pending',
      fulfilmentStatus: 'placed',
      statusHistory: [
        {
          status: 'placed',
          note: 'Order placed and awaiting payment',
          actor: 'customer',
          changedAt: new Date(),
        },
      ],
      stockReserved: true,
      paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return {
      ...base,
      toObject() {
        return { ...base };
      },
    };
  };

  beforeEach(async () => {
    mockOrderRepository = {
      create: jest.fn(),
      findByIdAndUser: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      findAllByUser: jest.fn(),
      cancelOrderAtomically: jest.fn(),
      findAllForAdmin: jest.fn(),
      findByIdForAdmin: jest.fn(),
      updateAdminStatusAtomically: jest.fn(),
      getPaymentRevenueSummary: jest.fn(),
      countFailedOrExpiredCodOrders: jest.fn(),
      findCodOrdersForAdminPayments: jest.fn(),
      findCodOrderByIdForAdminPayment: jest.fn(),
    };

    mockCartService = {
      getCart: jest.fn(),
      clearCart: jest.fn().mockResolvedValue({ items: [] }),
    };

    mockProductsService = {
      findById: jest.fn(),
      reserveStock: jest.fn().mockResolvedValue(true),
      releaseStock: jest.fn().mockResolvedValue(true),
      confirmStockDeduction: jest.fn().mockResolvedValue(true),
    };

    mockUsersService = {
      getProfile: jest.fn().mockResolvedValue(mockUserProfile),
      getAddresses: jest.fn().mockResolvedValue([mockAddress]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: ORDER_REPOSITORY, useValue: mockOrderRepository },
        { provide: CartService, useValue: mockCartService },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkout', () => {
    it('should reject invalid userId or addressId', async () => {
      await expect(
        service.checkout('invalid-user', { addressId }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.checkout(userId, { addressId: 'invalid-address' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate idempotencyKey', async () => {
      mockOrderRepository.findByIdempotencyKey.mockResolvedValue(
        makeMockOrderDoc(),
      );

      await expect(
        service.checkout(userId, { addressId, idempotencyKey: 'key-123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject when delivery address does not belong to user', async () => {
      const otherAddressId = new Types.ObjectId().toString();
      mockCartService.getCart.mockResolvedValue({ items: [] });

      await expect(
        service.checkout(userId, { addressId: otherAddressId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject checkout with an empty cart', async () => {
      mockCartService.getCart.mockResolvedValue({ items: [] });

      await expect(service.checkout(userId, { addressId })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject unavailable or unpublished products', async () => {
      mockCartService.getCart.mockResolvedValue({
        items: [{ productId: prodId1, name: 'Rotor', quantity: 1 }],
      });
      mockProductsService.findById.mockResolvedValue({
        _id: prodId1,
        name: 'Rotor',
        status: 'draft',
        price: 35000,
        availableStock: 5,
      });

      await expect(service.checkout(userId, { addressId })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject when requested quantity exceeds availableStock', async () => {
      mockCartService.getCart.mockResolvedValue({
        items: [{ productId: prodId1, name: 'Rotor', quantity: 10 }],
      });
      mockProductsService.findById.mockResolvedValue({
        _id: prodId1,
        name: 'Rotor',
        status: 'published',
        price: 35000,
        availableStock: 3,
      });

      await expect(service.checkout(userId, { addressId })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should recalculate prices from live product data, reserve stock, create order, and clear cart', async () => {
      // Cart has stale price 100, live product has price 35000
      mockCartService.getCart.mockResolvedValue({
        items: [
          {
            productId: prodId1,
            name: 'Stale Name',
            sku: 'OLD',
            slug: 'old',
            price: 100,
            quantity: 2,
          },
        ],
      });
      mockProductsService.findById.mockResolvedValue({
        _id: prodId1,
        name: 'Brembo Brake Rotor',
        sku: 'BRM-01',
        slug: 'brembo-brake-rotor',
        status: 'published',
        price: 35000,
        availableStock: 8,
        images: [{ url: 'https://img.com/rotor.jpg', isPrimary: true }],
      });
      mockOrderRepository.create.mockImplementation((payload) =>
        Promise.resolve(makeMockOrderDoc(payload)),
      );

      const result = await service.checkout(userId, {
        addressId,
        notes: 'Leave at porch',
        idempotencyKey: 'idem-1',
      });

      expect(mockProductsService.reserveStock).toHaveBeenCalledWith(
        prodId1,
        2,
        undefined,
      );
      expect(mockOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerEmail: 'alex@gridline.com',
          subtotal: 70000,
          shippingCost: 0,
          taxAmount: 0,
          totalAmount: 70000,
          paymentStatus: 'pending',
          fulfilmentStatus: 'placed',
          stockReserved: true,
          idempotencyKey: 'idem-1',
          notes: 'Leave at porch',
        }),
        undefined,
      );
      expect(mockCartService.clearCart).toHaveBeenCalledWith(userId);
      expect(result.subtotal).toBe(70000);
      expect(result.totalAmount).toBe(70000);
      expect(result.paymentStatus).toBe('pending');
      expect(result.fulfilmentStatus).toBe('placed');
    });

    it('should compensate reserved stock if a subsequent item fails reservation', async () => {
      mockCartService.getCart.mockResolvedValue({
        items: [
          { productId: prodId1, name: 'Item 1', quantity: 2 },
          { productId: prodId2, name: 'Item 2', quantity: 1 },
        ],
      });
      mockProductsService.findById
        .mockResolvedValueOnce({
          _id: prodId1,
          name: 'Item 1',
          sku: 'SKU-1',
          slug: 'item-1',
          status: 'published',
          price: 1000,
          availableStock: 5,
          images: [],
        })
        .mockResolvedValueOnce({
          _id: prodId2,
          name: 'Item 2',
          sku: 'SKU-2',
          slug: 'item-2',
          status: 'published',
          price: 2000,
          availableStock: 5,
          images: [],
        });

      mockProductsService.reserveStock
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(service.checkout(userId, { addressId })).rejects.toThrow(
        ConflictException,
      );

      expect(mockProductsService.releaseStock).toHaveBeenCalledWith(prodId1, 2);
      expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });

    it('should convert Mongo duplicate key error (11000) into ConflictException', async () => {
      mockCartService.getCart.mockResolvedValue({
        items: [{ productId: prodId1, name: 'Rotor', quantity: 1 }],
      });
      mockProductsService.findById.mockResolvedValue({
        _id: prodId1,
        name: 'Rotor',
        sku: 'SKU-1',
        slug: 'rotor',
        status: 'published',
        price: 1000,
        availableStock: 5,
        images: [],
      });
      mockOrderRepository.create.mockRejectedValue({ code: 11000 });

      await expect(service.checkout(userId, { addressId })).rejects.toThrow(
        ConflictException,
      );
      expect(mockProductsService.releaseStock).toHaveBeenCalledWith(prodId1, 1);
    });
  });

  describe('findUserOrders & findUserOrderById', () => {
    it('should return paginated orders for authenticated user', async () => {
      mockOrderRepository.findAllByUser.mockResolvedValue({
        data: [makeMockOrderDoc()],
        total: 1,
      });

      const res = await service.findUserOrders(userId, { page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should throw BadRequestException for invalid orderId', async () => {
      await expect(service.findUserOrderById(userId, 'bad-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when order is missing or belongs to another user', async () => {
      mockOrderRepository.findByIdAndUser.mockResolvedValue(null);

      await expect(service.findUserOrderById(userId, orderId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelOrder', () => {
    it('should cancel eligible order and release reserved stock', async () => {
      const existing = makeMockOrderDoc({
        fulfilmentStatus: 'placed',
        paymentStatus: 'pending',
        stockReserved: true,
      });
      const cancelled = makeMockOrderDoc({
        fulfilmentStatus: 'cancelled',
        stockReserved: false,
        cancellationReason: 'Changed my mind',
      });

      mockOrderRepository.findByIdAndUser.mockResolvedValue(existing);
      mockOrderRepository.cancelOrderAtomically.mockResolvedValue(cancelled);

      const res = await service.cancelOrder(userId, orderId, {
        reason: 'Changed my mind',
      });

      expect(res.fulfilmentStatus).toBe('cancelled');
      expect(mockProductsService.releaseStock).toHaveBeenCalledWith(
        prodId1,
        2,
        undefined,
      );
    });

    it('should reject cancellation if order is already shipped', async () => {
      mockOrderRepository.findByIdAndUser.mockResolvedValue(
        makeMockOrderDoc({
          fulfilmentStatus: 'shipped',
          paymentStatus: 'paid',
        }),
      );

      await expect(service.cancelOrder(userId, orderId, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject cancellation if payment is already paid or confirming', async () => {
      mockOrderRepository.findByIdAndUser.mockResolvedValue(
        makeMockOrderDoc({
          fulfilmentStatus: 'placed',
          paymentStatus: 'confirming',
        }),
      );

      await expect(service.cancelOrder(userId, orderId, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if concurrent state change prevents atomic cancel', async () => {
      mockOrderRepository.findByIdAndUser.mockResolvedValue(
        makeMockOrderDoc({
          fulfilmentStatus: 'placed',
          paymentStatus: 'pending',
        }),
      );
      mockOrderRepository.cancelOrderAtomically.mockResolvedValue(null);

      await expect(service.cancelOrder(userId, orderId, {})).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('Admin Order Management', () => {
    const adminId = new Types.ObjectId().toString();

    it('should list paginated orders for admin with safe customer projection', async () => {
      mockOrderRepository.findAllForAdmin.mockResolvedValue({
        data: [
          makeMockOrderDoc({
            user: {
              _id: new Types.ObjectId(userId),
              firstName: 'Alex',
              lastName: 'Vance',
              email: 'alex@gridline.com',
              phone: '+1-555-0199',
            },
          }),
        ],
        total: 1,
      });

      const res = await service.findAllOrdersForAdmin({
        page: 1,
        limit: 10,
        search: 'ORD-2026',
      });

      expect(res.data).toHaveLength(1);
      expect(res.data[0].customer).toEqual({
        id: userId,
        firstName: 'Alex',
        lastName: 'Vance',
        email: 'alex@gridline.com',
        phone: '+1-555-0199',
      });
    });

    it('should return order for admin with customer: null when associated user is unavailable', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({ user: null }),
      );

      const res = await service.findOrderByIdForAdmin(orderId);
      expect(res.id).toBe(orderId);
      expect(res.customer).toBeNull();
    });

    it('should reject advancing an unpaid order to processing', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          fulfilmentStatus: 'payment_confirmed',
          paymentStatus: 'pending',
        }),
      );

      await expect(
        service.updateOrderStatusByAdmin(orderId, adminId, {
          fulfilmentStatus: 'processing',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid backward or skipped status transitions', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          fulfilmentStatus: 'processing',
          paymentStatus: 'paid',
        }),
      );

      await expect(
        service.updateOrderStatusByAdmin(orderId, adminId, {
          fulfilmentStatus: 'delivered',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require shippingProvider and trackingNumber when transitioning to shipped', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          fulfilmentStatus: 'processing',
          paymentStatus: 'paid',
        }),
      );

      await expect(
        service.updateOrderStatusByAdmin(orderId, adminId, {
          fulfilmentStatus: 'shipped',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transition processing -> shipped with tracking info and admin actor history', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          fulfilmentStatus: 'processing',
          paymentStatus: 'paid',
        }),
      );
      mockOrderRepository.updateAdminStatusAtomically.mockResolvedValue(
        makeMockOrderDoc({
          fulfilmentStatus: 'shipped',
          paymentStatus: 'paid',
          shippingProvider: 'FedEx',
          trackingNumber: 'FX-999888',
          trackingUrl: 'https://fedex.com/track/FX-999888',
        }),
      );

      const res = await service.updateOrderStatusByAdmin(orderId, adminId, {
        fulfilmentStatus: 'shipped',
        shippingProvider: 'FedEx',
        trackingNumber: 'FX-999888',
        trackingUrl: 'https://fedex.com/track/FX-999888',
        note: 'Dispatched via air freight',
      });

      expect(res.fulfilmentStatus).toBe('shipped');
      expect(res.shippingProvider).toBe('FedEx');
      expect(res.trackingNumber).toBe('FX-999888');
      expect(
        mockOrderRepository.updateAdminStatusAtomically,
      ).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({
          expectedCurrentStatus: 'processing',
          fulfilmentStatus: 'shipped',
          shippingProvider: 'FedEx',
          trackingNumber: 'FX-999888',
          adminUserId: adminId,
        }),
        undefined,
      );
    });

    it('should reject cancelling a paid order through admin endpoint', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          fulfilmentStatus: 'placed',
          paymentStatus: 'paid',
        }),
      );

      await expect(
        service.updateOrderStatusByAdmin(orderId, adminId, {
          fulfilmentStatus: 'cancelled',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cancel eligible unpaid placed order and release reserved stock atomically', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          fulfilmentStatus: 'placed',
          paymentStatus: 'pending',
          stockReserved: true,
        }),
      );
      mockOrderRepository.updateAdminStatusAtomically.mockResolvedValue(
        makeMockOrderDoc({
          fulfilmentStatus: 'cancelled',
          paymentStatus: 'pending',
          stockReserved: false,
        }),
      );

      const res = await service.updateOrderStatusByAdmin(orderId, adminId, {
        fulfilmentStatus: 'cancelled',
        note: 'Customer requested via support',
      });

      expect(res.fulfilmentStatus).toBe('cancelled');
      expect(mockProductsService.releaseStock).toHaveBeenCalledWith(
        prodId1,
        2,
        undefined,
      );
    });

    it('should mark COD order delivered and paid, finalize inventory, and record paidAt when codPaymentReceived is true', async () => {
      const paidAt = new Date();
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          fulfilmentStatus: 'out_for_delivery',
          stockReserved: true,
          totalAmount: 70000,
        }),
      );
      mockProductsService.confirmStockDeduction.mockResolvedValue(true);
      mockOrderRepository.updateAdminStatusAtomically.mockResolvedValue(
        makeMockOrderDoc({
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          fulfilmentStatus: 'delivered',
          stockReserved: false,
          paidAt,
          deliveredAt: paidAt,
        }),
      );

      const res = await service.updateOrderStatusByAdmin(orderId, adminId, {
        fulfilmentStatus: 'delivered',
        codPaymentReceived: true,
        note: 'Collected cash at doorstep',
      });

      expect(res.fulfilmentStatus).toBe('delivered');
      expect(res.paymentStatus).toBe('paid');
      expect(res.paidAt).toBe(paidAt);
      expect(res.stockReserved).toBe(false);
      expect(mockProductsService.confirmStockDeduction).toHaveBeenCalledWith(
        prodId1,
        2,
        undefined,
      );
      expect(
        mockOrderRepository.updateAdminStatusAtomically,
      ).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({
          expectedCurrentStatus: 'out_for_delivery',
          allowedPaymentStatuses: ['pending', 'failed'],
          fulfilmentStatus: 'delivered',
          paymentStatus: 'paid',
          codPaymentConfirmedBy: adminId,
          stockReserved: false,
        }),
        undefined,
      );
    });

    it('should reject COD delivery when codPaymentReceived is false without modifying order, payment, or inventory', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          fulfilmentStatus: 'out_for_delivery',
          stockReserved: true,
        }),
      );

      await expect(
        service.updateOrderStatusByAdmin(orderId, adminId, {
          fulfilmentStatus: 'delivered',
          codPaymentReceived: false,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(
        mockOrderRepository.updateAdminStatusAtomically,
      ).not.toHaveBeenCalled();
      expect(mockProductsService.confirmStockDeduction).not.toHaveBeenCalled();
    });

    it('should reject COD delivery when codPaymentReceived is missing without modifying order, payment, or inventory', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          fulfilmentStatus: 'out_for_delivery',
          stockReserved: true,
        }),
      );

      await expect(
        service.updateOrderStatusByAdmin(orderId, adminId, {
          fulfilmentStatus: 'delivered',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(
        mockOrderRepository.updateAdminStatusAtomically,
      ).not.toHaveBeenCalled();
      expect(mockProductsService.confirmStockDeduction).not.toHaveBeenCalled();
    });

    it('should reject COD unpaid order jumping directly from placed or processing to delivered', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          fulfilmentStatus: 'placed',
        }),
      );

      await expect(
        service.updateOrderStatusByAdmin(orderId, adminId, {
          fulfilmentStatus: 'delivered',
          codPaymentReceived: true,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(
        mockOrderRepository.updateAdminStatusAtomically,
      ).not.toHaveBeenCalled();
    });

    it('should reject codPaymentReceived on crypto_wallet orders', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          paymentMethod: 'crypto_wallet',
          paymentStatus: 'pending',
          fulfilmentStatus: 'out_for_delivery',
        }),
      );

      await expect(
        service.updateOrderStatusByAdmin(orderId, adminId, {
          fulfilmentStatus: 'delivered',
          codPaymentReceived: true,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(
        mockOrderRepository.updateAdminStatusAtomically,
      ).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if stock finalization fails during COD delivery confirmation', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          fulfilmentStatus: 'out_for_delivery',
          stockReserved: true,
        }),
      );
      mockProductsService.confirmStockDeduction.mockResolvedValue(false);

      await expect(
        service.updateOrderStatusByAdmin(orderId, adminId, {
          fulfilmentStatus: 'delivered',
          codPaymentReceived: true,
        }),
      ).rejects.toThrow(ConflictException);

      expect(
        mockOrderRepository.updateAdminStatusAtomically,
      ).not.toHaveBeenCalled();
    });

    it('should handle duplicate or concurrent COD payment confirmation safely with ConflictException', async () => {
      mockOrderRepository.findByIdForAdmin.mockResolvedValue(
        makeMockOrderDoc({
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          fulfilmentStatus: 'out_for_delivery',
          stockReserved: true,
        }),
      );
      mockProductsService.confirmStockDeduction.mockResolvedValue(true);
      mockOrderRepository.updateAdminStatusAtomically.mockResolvedValue(null);

      await expect(
        service.updateOrderStatusByAdmin(orderId, adminId, {
          fulfilmentStatus: 'delivered',
          codPaymentReceived: true,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Admin Payment Summary & COD Queries', () => {
    it('should delegate getPaymentRevenueSummaryForAdmin to repository', async () => {
      mockOrderRepository.getPaymentRevenueSummary.mockResolvedValue({
        collectedRevenue: 120000,
        successfulPayments: 2,
        pendingPayments: 1,
        cryptoRevenue: 70000,
        codCollected: 50000,
      });

      const summary = await service.getPaymentRevenueSummaryForAdmin();
      expect(summary.collectedRevenue).toBe(120000);
      expect(
        mockOrderRepository.getPaymentRevenueSummary,
      ).toHaveBeenCalledTimes(1);
    });

    it('should validate orderId in findCodOrderByIdForAdminPayment', async () => {
      await expect(
        service.findCodOrderByIdForAdminPayment('invalid-id'),
      ).rejects.toThrow(BadRequestException);

      mockOrderRepository.findCodOrderByIdForAdminPayment.mockResolvedValue(
        null,
      );
      const res = await service.findCodOrderByIdForAdminPayment(orderId);
      expect(res).toBeNull();
    });
  });
});
