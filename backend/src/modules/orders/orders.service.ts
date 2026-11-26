import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { randomBytes, randomUUID } from 'crypto';
import { ClientSession, Connection, Types } from 'mongoose';
import { CartService } from '../cart/cart.service';
import {
  FormattedProduct,
  ProductsService,
} from '../products/products.service';
import { UsersService } from '../users/users.service';
import {
  CANCELLABLE_FULFILMENT_STATUSES,
  CANCELLABLE_PAYMENT_STATUSES,
  ORDER_REPOSITORY,
  PAYMENT_WINDOW_MINUTES,
} from './constants/order.constants';
import type {
  FulfilmentStatus,
  PaymentStatus,
} from './constants/order.constants';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import type { IOrderRepository } from './interfaces/order-repository.interface';
import {
  FormattedOrder,
  PaginatedOrdersResult,
} from './interfaces/order.interface';
import { Order, OrderDocument, OrderItem } from './schemas/order.schema';

interface PreparedCheckoutItem {
  productId: string;
  name: string;
  sku: string;
  slug: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
    private readonly usersService: UsersService,
    @Optional()
    @InjectConnection()
    private readonly connection?: Connection,
  ) {}

  async checkout(userId: string, dto: CheckoutDto): Promise<FormattedOrder> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    if (!Types.ObjectId.isValid(dto.addressId)) {
      throw new BadRequestException('Invalid address ID format');
    }

    const idempotencyKey = dto.idempotencyKey?.trim() || undefined;
    if (idempotencyKey) {
      const existingOrder = await this.orderRepository.findByIdempotencyKey(
        userId,
        idempotencyKey,
      );
      if (existingOrder) {
        throw new ConflictException(
          'Duplicate checkout request: an order has already been created for this idempotency key',
        );
      }
    }

    const [userProfile, addresses, cart] = await Promise.all([
      this.usersService.getProfile(userId),
      this.usersService.getAddresses(userId),
      this.cartService.getCart(userId),
    ]);

    const selectedAddress = addresses.find(
      (addr) => addr._id.toString() === dto.addressId,
    );
    if (!selectedAddress) {
      throw new NotFoundException('Delivery address not found');
    }

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cannot checkout with an empty cart');
    }

    const preparedItems: PreparedCheckoutItem[] = [];
    let subtotal = 0;

    for (const cartItem of cart.items) {
      if (!Number.isInteger(cartItem.quantity) || cartItem.quantity < 1) {
        throw new BadRequestException(
          `Invalid quantity for product '${cartItem.productId}'`,
        );
      }

      let product: FormattedProduct;
      try {
        product = await this.productsService.findById(cartItem.productId);
      } catch {
        throw new BadRequestException(
          `Product '${cartItem.name || cartItem.productId}' is no longer available`,
        );
      }

      if (product.status !== 'published') {
        throw new BadRequestException(
          `Product '${String(product.name)}' is not available for purchase`,
        );
      }

      if (product.availableStock < cartItem.quantity) {
        throw new ConflictException(
          `Insufficient stock for '${String(product.name)}'. Available: ${product.availableStock}, requested: ${cartItem.quantity}`,
        );
      }

      const unitPrice = Number(product.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new BadRequestException(
          `Invalid price for product '${String(product.name)}'`,
        );
      }

      const images = Array.isArray(product.images)
        ? (product.images as Array<{ url: string; isPrimary?: boolean }>)
        : [];
      const primaryImage =
        images.find((img) => img.isPrimary)?.url || images[0]?.url;

      const lineTotal = unitPrice * cartItem.quantity;
      subtotal += lineTotal;

      preparedItems.push({
        productId: cartItem.productId,
        name: typeof product.name === 'string' ? product.name : cartItem.name,
        sku: typeof product.sku === 'string' ? product.sku : cartItem.sku,
        slug: typeof product.slug === 'string' ? product.slug : cartItem.slug,
        image: primaryImage,
        unitPrice,
        quantity: cartItem.quantity,
        lineTotal,
      });
    }

    const shippingCost = 0;
    const taxAmount = 0;
    const totalAmount = subtotal + shippingCost + taxAmount;
    const now = new Date();
    const paymentExpiresAt = new Date(
      now.getTime() + PAYMENT_WINDOW_MINUTES * 60 * 1000,
    );

    const orderItems: OrderItem[] = preparedItems.map((item) => ({
      product: new Types.ObjectId(item.productId),
      name: item.name,
      sku: item.sku,
      slug: item.slug,
      image: item.image,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    }));

    const orderPayload: Partial<Order> = {
      orderNumber: this.generateOrderNumber(now),
      paymentReference: this.generatePaymentReference(),
      ...(idempotencyKey ? { idempotencyKey } : {}),
      user: new Types.ObjectId(userId),
      customerEmail: userProfile.email,
      items: orderItems,
      shippingAddress: {
        addressId: new Types.ObjectId(selectedAddress._id.toString()),
        label: selectedAddress.label,
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        line1: selectedAddress.line1,
        line2: selectedAddress.line2,
        city: selectedAddress.city,
        state: selectedAddress.state,
        postalCode: selectedAddress.postalCode,
        country: selectedAddress.country,
      },
      subtotal,
      shippingCost,
      taxAmount,
      totalAmount,
      currency: 'USD',
      paymentMethod: 'crypto_wallet',
      paymentStatus: 'pending',
      fulfilmentStatus: 'placed',
      statusHistory: [
        {
          status: 'placed',
          note: 'Order placed and awaiting payment',
          actor: 'customer',
          changedAt: now,
        },
      ],
      stockReserved: true,
      paymentExpiresAt,
      notes: dto.notes?.trim() || undefined,
    };

    const createdOrder = await this.executeWithOptionalTransaction(
      async (session) => {
        const reservedItems: Array<{ productId: string; quantity: number }> =
          [];

        try {
          for (const item of preparedItems) {
            const reserved = await this.productsService.reserveStock(
              item.productId,
              item.quantity,
              session,
            );
            if (!reserved) {
              throw new ConflictException(
                `Insufficient stock for '${item.name}'`,
              );
            }
            reservedItems.push({
              productId: item.productId,
              quantity: item.quantity,
            });
          }

          const order = await this.orderRepository.create(
            orderPayload,
            session,
          );
          await this.cartService.clearCart(userId);
          return order;
        } catch (error) {
          if (!session && reservedItems.length > 0) {
            await this.compensateReservedStock(reservedItems);
          }

          if (this.isDuplicateKeyError(error)) {
            throw new ConflictException(
              'Duplicate checkout request: order already exists',
            );
          }
          throw error;
        }
      },
    );

    return this.formatOrder(createdOrder);
  }

  async findUserOrders(
    userId: string,
    query: OrderQueryDto,
  ): Promise<PaginatedOrdersResult> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { data, total } = await this.orderRepository.findAllByUser(
      userId,
      {
        fulfilmentStatus: query.fulfilmentStatus,
        paymentStatus: query.paymentStatus,
      },
      { page, limit },
    );

    return {
      data: data.map((order) => this.formatOrder(order)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findUserOrderById(
    userId: string,
    orderId: string,
  ): Promise<FormattedOrder> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const order = await this.orderRepository.findByIdAndUser(orderId, userId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.formatOrder(order);
  }

  async cancelOrder(
    userId: string,
    orderId: string,
    dto: CancelOrderDto,
  ): Promise<FormattedOrder> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const existing = await this.orderRepository.findByIdAndUser(
      orderId,
      userId,
    );
    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    if (
      !CANCELLABLE_FULFILMENT_STATUSES.includes(existing.fulfilmentStatus) ||
      !CANCELLABLE_PAYMENT_STATUSES.includes(existing.paymentStatus)
    ) {
      throw new BadRequestException(
        `Order cannot be cancelled in fulfilment status '${existing.fulfilmentStatus}' and payment status '${existing.paymentStatus}'`,
      );
    }

    const reason = dto.reason?.trim() || undefined;
    const cancelledAt = new Date();
    const historyNote = reason
      ? `Order cancelled by customer: ${reason}`
      : 'Order cancelled by customer';
    const shouldReleaseStock = existing.stockReserved;

    const cancelledOrder = await this.executeWithOptionalTransaction(
      async (session) => {
        const updated = await this.orderRepository.cancelOrderAtomically(
          orderId,
          userId,
          {
            reason,
            cancelledAt,
            historyNote,
          },
          session,
        );

        if (!updated) {
          throw new ConflictException(
            'Order state changed and can no longer be cancelled',
          );
        }

        if (shouldReleaseStock) {
          for (const item of existing.items) {
            await this.productsService.releaseStock(
              item.product.toString(),
              item.quantity,
              session,
            );
          }
        }

        return updated;
      },
    );

    return this.formatOrder(cancelledOrder);
  }

  async updateOrderPaymentState(
    orderId: string,
    userId: string,
    data: {
      allowedCurrentPaymentStatuses: PaymentStatus[];
      allowedCurrentFulfilmentStatuses: FulfilmentStatus[];
      paymentStatus: PaymentStatus;
      fulfilmentStatus?: FulfilmentStatus;
      stockReserved?: boolean;
      historyStatus: string;
      historyNote: string;
      actor?: string;
    },
    session?: ClientSession,
  ): Promise<FormattedOrder | null> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order or user ID format');
    }

    const updated = await this.orderRepository.updatePaymentStateAtomically(
      orderId,
      userId,
      {
        ...data,
        changedAt: new Date(),
      },
      session,
    );

    return updated ? this.formatOrder(updated) : null;
  }

  private async executeWithOptionalTransaction<T>(
    work: (session?: ClientSession) => Promise<T>,
  ): Promise<T> {
    if (
      !this.connection ||
      typeof this.connection.startSession !== 'function'
    ) {
      return work(undefined);
    }

    const session = await this.connection.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (error) {
      if (this.isStandaloneTransactionError(error)) {
        return work(undefined);
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async compensateReservedStock(
    reservedItems: Array<{ productId: string; quantity: number }>,
  ): Promise<void> {
    for (const item of reservedItems) {
      try {
        await this.productsService.releaseStock(item.productId, item.quantity);
      } catch {
        // Best-effort rollback when running without multi-document transactions
      }
    }
  }

  private isStandaloneTransactionError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const err = error as { code?: number; codeName?: string; message?: string };
    return (
      err.code === 20 ||
      err.codeName === 'IllegalOperation' ||
      (typeof err.message === 'string' &&
        err.message.includes(
          'Transaction numbers are only allowed on a replica set member',
        ))
    );
  }

  private isDuplicateKeyError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    return (error as { code?: number }).code === 11000;
  }

  private generateOrderNumber(date: Date): string {
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${datePart}-${randomPart}`;
  }

  private generatePaymentReference(): string {
    return `PAY-${randomUUID().replace(/-/g, '').toUpperCase()}`;
  }

  private formatOrder(order: OrderDocument): FormattedOrder {
    const raw = order.toObject
      ? (order.toObject() as unknown as Order & { _id: Types.ObjectId })
      : (order as unknown as Order & { _id: Types.ObjectId });

    return {
      id: raw._id.toString(),
      orderNumber: raw.orderNumber,
      paymentReference: raw.paymentReference,
      customerEmail: raw.customerEmail,
      items: (raw.items || []).map((item) => ({
        productId: item.product.toString(),
        name: item.name,
        sku: item.sku,
        slug: item.slug,
        image: item.image,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
      shippingAddress: {
        addressId: raw.shippingAddress.addressId.toString(),
        label: raw.shippingAddress.label,
        fullName: raw.shippingAddress.fullName,
        phone: raw.shippingAddress.phone,
        line1: raw.shippingAddress.line1,
        line2: raw.shippingAddress.line2,
        city: raw.shippingAddress.city,
        state: raw.shippingAddress.state,
        postalCode: raw.shippingAddress.postalCode,
        country: raw.shippingAddress.country,
      },
      subtotal: raw.subtotal,
      shippingCost: raw.shippingCost,
      taxAmount: raw.taxAmount,
      totalAmount: raw.totalAmount,
      currency: raw.currency,
      paymentMethod: raw.paymentMethod,
      paymentStatus: raw.paymentStatus,
      fulfilmentStatus: raw.fulfilmentStatus,
      statusHistory: (raw.statusHistory || []).map((entry) => ({
        status: entry.status,
        note: entry.note,
        actor: entry.actor,
        changedAt: entry.changedAt,
      })),
      stockReserved: raw.stockReserved,
      paymentExpiresAt: raw.paymentExpiresAt,
      cancelledAt: raw.cancelledAt,
      cancellationReason: raw.cancellationReason,
      notes: raw.notes,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
