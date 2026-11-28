import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection, Types } from 'mongoose';
import type { AdminCodPaymentRecord } from '../orders/interfaces/order.interface';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { PAYMENT_REPOSITORY } from './constants/payment.constants';
import { AdminPaymentQueryDto } from './dto/admin-payment-query.dto';
import { ReconcilePaymentDto } from './dto/reconcile-payment.dto';
import type { IPaymentRepository } from './interfaces/payment-repository.interface';
import type {
  AdminCryptoPaymentRecord,
  AdminPaymentsSummary,
  AdminPaymentTransactionItem,
} from './interfaces/payment.interface';

const OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i;
const MAX_COMBINED_WINDOW = 2000;

@Injectable()
export class AdminPaymentsService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    private readonly ordersService: OrdersService,
    private readonly productsService: ProductsService,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getSummary(): Promise<AdminPaymentsSummary> {
    const [orderStats, failedCryptoAttempts, failedCodOrders] =
      await Promise.all([
        this.ordersService.getPaymentRevenueSummaryForAdmin(),
        this.paymentRepository.countFailedOrExpiredAttempts(),
        this.ordersService.countFailedOrExpiredCodOrdersForAdmin(),
      ]);

    return {
      collectedRevenue: orderStats.collectedRevenue,
      successfulPayments: orderStats.successfulPayments,
      pendingPayments: orderStats.pendingPayments,
      failedExpiredPayments: failedCryptoAttempts + failedCodOrders,
      cryptoRevenue: orderStats.cryptoRevenue,
      codCollected: orderStats.codCollected,
    };
  }

  async findAllTransactions(query: AdminPaymentQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;

    const { dateFrom, dateTo } = this.parseDateRange(
      query.dateFrom,
      query.dateTo,
    );

    const filter = {
      search: query.search?.trim() || undefined,
      status: query.status ?? 'all',
      dateFrom,
      dateTo,
    };

    if (query.paymentMethod === 'crypto_wallet') {
      const cryptoResult = await this.paymentRepository.findAllForAdmin(
        filter,
        { page, limit },
      );
      return this.buildPaginatedResponse(
        cryptoResult.data.map((item) => this.mapCryptoRecordToItem(item)),
        page,
        limit,
        cryptoResult.total,
      );
    }

    if (query.paymentMethod === 'cod') {
      const codResult = await this.ordersService.findCodOrdersForAdminPayments(
        filter,
        { page, limit },
      );
      return this.buildPaginatedResponse(
        codResult.data.map((item) => this.mapCodRecordToItem(item)),
        page,
        limit,
        codResult.total,
      );
    }

    const windowLimit = page * limit;
    if (windowLimit > MAX_COMBINED_WINDOW) {
      throw new BadRequestException(
        `Combined pagination depth cannot exceed ${MAX_COMBINED_WINDOW} records; narrow your filters or select a specific payment method`,
      );
    }

    const [cryptoResult, codResult] = await Promise.all([
      this.paymentRepository.findAllForAdmin(filter, {
        page: 1,
        limit: windowLimit,
      }),
      this.ordersService.findCodOrdersForAdminPayments(filter, {
        page: 1,
        limit: windowLimit,
      }),
    ]);

    const combined: AdminPaymentTransactionItem[] = [
      ...cryptoResult.data.map((item) => this.mapCryptoRecordToItem(item)),
      ...codResult.data.map((item) => this.mapCodRecordToItem(item)),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const start = (page - 1) * limit;
    return this.buildPaginatedResponse(
      combined.slice(start, start + limit),
      page,
      limit,
      cryptoResult.total + codResult.total,
    );
  }

  async findTransactionById(transactionId: string) {
    if (!OBJECT_ID_REGEX.test(transactionId)) {
      throw new BadRequestException('Invalid payment ID format');
    }

    const payment =
      await this.paymentRepository.findByIdForAdmin(transactionId);

    if (payment) {
      const orderIdStr = payment.order?.id ?? '';
      const attemptHistory = orderIdStr
        ? await this.paymentRepository.findAllByOrderIdForAdmin(orderIdStr)
        : [];

      return {
        ...payment,
        source: 'payment' as const,
        attemptHistory,
      };
    }

    const codOrder =
      await this.ordersService.findCodOrderByIdForAdminPayment(transactionId);

    if (!codOrder) {
      throw new NotFoundException(
        `Payment record '${transactionId}' not found`,
      );
    }

    const priorCryptoAttempts =
      await this.paymentRepository.findAllByOrderIdForAdmin(codOrder.id);

    return {
      id: codOrder.id,
      source: 'cod_order' as const,
      paymentReference: codOrder.paymentReference,
      orderPaymentReference: codOrder.paymentReference,
      attemptNumber: 1,
      order: {
        id: codOrder.id,
        orderNumber: codOrder.orderNumber,
        totalAmount: codOrder.orderTotalAmount,
        currency: codOrder.currency,
        paymentStatus: codOrder.paymentStatus,
        fulfilmentStatus: codOrder.fulfilmentStatus,
        paymentMethod: codOrder.paymentMethod,
      },
      customer: {
        id: codOrder.customerId,
        name: codOrder.customerName,
        email: codOrder.customerEmail,
      },
      paymentMethod: codOrder.paymentMethod,
      currency: codOrder.currency,
      orderTotalAmount: codOrder.orderTotalAmount,
      receivedAmount:
        codOrder.paymentStatus === 'paid'
          ? String(codOrder.orderTotalAmount)
          : undefined,
      status: codOrder.paymentStatus,
      verifiedAt: codOrder.paidAt,
      createdAt: codOrder.createdAt,
      attemptHistory: priorCryptoAttempts,
    };
  }

  async reconcileTransaction(
    transactionId: string,
    dto: ReconcilePaymentDto,
    adminUserId?: string,
  ) {
    if (!OBJECT_ID_REGEX.test(transactionId)) {
      throw new BadRequestException('Invalid payment ID format');
    }

    const payment = await this.paymentRepository.findById(transactionId);
    if (!payment) {
      throw new NotFoundException(
        `Payment record '${transactionId}' not found`,
      );
    }

    if (payment.verificationStatus !== 'expired') {
      throw new BadRequestException(
        `Only expired payment attempts can be reconciled (current status: ${payment.verificationStatus})`,
      );
    }

    if (!payment.transactionHash) {
      throw new BadRequestException(
        'Cannot reconcile a payment attempt without an on-chain transaction hash',
      );
    }

    const order = await this.ordersService.findOrderByIdForAdmin(
      payment.order.toString(),
    );

    if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') {
      throw new ConflictException(
        `Order is already ${order.paymentStatus} and cannot be reconciled`,
      );
    }

    const adminObjectId =
      adminUserId && OBJECT_ID_REGEX.test(adminUserId)
        ? new Types.ObjectId(adminUserId)
        : undefined;
    const note = dto.note?.trim();

    if (dto.action === 'fulfill') {
      if (
        !payment.receivedAmount ||
        BigInt(payment.receivedAmount) !== BigInt(payment.expectedAmount)
      ) {
        throw new BadRequestException(
          'Cannot fulfill an expired payment whose received amount does not match the expected amount',
        );
      }

      await this.executeWithOptionalTransaction(async (session) => {
        if (!order.stockReserved) {
          for (const item of order.items) {
            const reserved = await this.productsService.reserveStock(
              item.productId,
              item.quantity,
              session,
            );
            if (!reserved) {
              throw new ConflictException(
                `Insufficient stock to fulfill order for product ${item.productId}; issue a refund instead`,
              );
            }
          }
        }

        const updatedOrder = await this.ordersService.updateOrderPaymentState(
          order.id,
          payment.user.toString(),
          {
            allowedCurrentPaymentStatuses: [
              'expired',
              'pending',
              'confirming',
              'failed',
            ],
            allowedCurrentFulfilmentStatuses: ['cancelled', 'placed'],
            paymentStatus: 'paid',
            fulfilmentStatus: 'payment_confirmed',
            stockReserved: true,
            historyStatus: 'payment_verified',
            historyNote:
              note ||
              `Late payment (${payment.transactionHash}) reconciled and fulfilled by admin`,
            actor: adminUserId || 'admin',
          },
          session,
        );

        if (!updatedOrder) {
          throw new ConflictException(
            'Order state changed concurrently and cannot be fulfilled',
          );
        }

        payment.verificationStatus = 'verified';
        payment.verifiedAt = new Date();
        payment.failureReason = undefined;
        payment.reconciledAt = new Date();
        payment.reconciledBy = adminObjectId;
        payment.reconciliationNote =
          note || 'Late payment reconciled and order fulfilled by admin';
        await this.paymentRepository.save(payment, session);
      });
    } else {
      const refundTxHash = dto.refundTxHash?.trim().toLowerCase();
      if (!refundTxHash) {
        throw new BadRequestException(
          'refundTxHash is required when action is refund',
        );
      }
      if (refundTxHash === payment.transactionHash.toLowerCase()) {
        throw new BadRequestException(
          'refundTxHash must be different from the customer payment transactionHash',
        );
      }

      await this.executeWithOptionalTransaction(async (session) => {
        payment.verificationStatus = 'refunded';
        payment.refundTxHash = refundTxHash;
        payment.reconciledAt = new Date();
        payment.reconciledBy = adminObjectId;
        payment.reconciliationNote =
          note || `Late payment refunded via tx ${refundTxHash}`;
        await this.paymentRepository.save(payment, session);

        await this.ordersService.updateOrderPaymentState(
          order.id,
          payment.user.toString(),
          {
            allowedCurrentPaymentStatuses: [
              'expired',
              'pending',
              'confirming',
              'failed',
            ],
            allowedCurrentFulfilmentStatuses: ['cancelled', 'placed'],
            paymentStatus: 'refunded',
            fulfilmentStatus: 'cancelled',
            stockReserved: false,
            historyStatus: 'payment_refunded',
            historyNote:
              note || `Late payment refunded by admin (tx ${refundTxHash})`,
            actor: adminUserId || 'admin',
          },
          session,
        );
      });
    }

    return this.findTransactionById(transactionId);
  }

  private mapCryptoRecordToItem(
    item: AdminCryptoPaymentRecord,
  ): AdminPaymentTransactionItem {
    return {
      ...item,
      source: 'payment',
    };
  }

  private mapCodRecordToItem(
    item: AdminCodPaymentRecord,
  ): AdminPaymentTransactionItem {
    return {
      id: item.id,
      source: 'cod_order',
      paymentReference: item.paymentReference,
      orderId: item.id,
      orderNumber: item.orderNumber,
      customerId: item.customerId,
      customerName: item.customerName,
      customerEmail: item.customerEmail,
      paymentMethod: item.paymentMethod,
      currency: item.currency,
      orderTotalAmount: item.orderTotalAmount,
      status: item.paymentStatus,
      verifiedAt: item.paidAt,
      createdAt: item.createdAt,
    };
  }

  private buildPaginatedResponse(
    data: AdminPaymentTransactionItem[],
    page: number,
    limit: number,
    total: number,
  ) {
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  private parseDateRange(
    dateFromStr?: string,
    dateToStr?: string,
  ): { dateFrom?: Date; dateTo?: Date } {
    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    let dateTo: Date | undefined;

    if (dateToStr) {
      dateTo = new Date(dateToStr);
      if (dateToStr.length <= 10) {
        dateTo.setUTCHours(23, 59, 59, 999);
      }
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException(
        'dateFrom must be before or equal to dateTo',
      );
    }

    return { dateFrom, dateTo };
  }

  private async executeWithOptionalTransaction<T>(
    work: (session?: ClientSession) => Promise<T>,
  ): Promise<T> {
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
}
