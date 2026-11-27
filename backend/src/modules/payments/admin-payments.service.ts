import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { PAYMENT_REPOSITORY } from './constants/payment.constants';
import { AdminPaymentQueryDto } from './dto/admin-payment-query.dto';
import type { IPaymentRepository } from './interfaces/payment-repository.interface';

export interface AdminPaymentsSummary {
  collectedRevenue: number;
  successfulPayments: number;
  pendingPayments: number;
  failedExpiredPayments: number;
  cryptoRevenue: number;
  codCollected: number;
}

export interface AdminPaymentTransactionItem {
  id: string;
  source: 'payment' | 'cod_order';
  paymentReference: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  currency: string;
  orderTotalAmount: number;
  expectedAmount?: string;
  receivedAmount?: string;
  token?: string;
  tokenDecimals?: number;
  network?: string;
  chainId?: number;
  status: string;
  transactionHash?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  attemptNumber?: number;
  failureReason?: string;
  expiresAt?: Date;
  verifiedAt?: Date;
  createdAt: Date;
}

const OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i;
const MAX_COMBINED_WINDOW = 2000;

@Injectable()
export class AdminPaymentsService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    private readonly ordersService: OrdersService,
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
      return {
        data: cryptoResult.data.map<AdminPaymentTransactionItem>((item) => ({
          ...item,
          source: 'payment',
        })),
        meta: {
          page,
          limit,
          total: cryptoResult.total,
          totalPages:
            cryptoResult.total === 0
              ? 0
              : Math.ceil(cryptoResult.total / limit),
        },
      };
    }

    if (query.paymentMethod === 'cod') {
      const codResult = await this.ordersService.findCodOrdersForAdminPayments(
        filter,
        { page, limit },
      );
      return {
        data: codResult.data.map<AdminPaymentTransactionItem>((item) => ({
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
        })),
        meta: {
          page,
          limit,
          total: codResult.total,
          totalPages:
            codResult.total === 0 ? 0 : Math.ceil(codResult.total / limit),
        },
      };
    }

    // Combined ('all') query: fetch strictly bounded prefix windows from both modules
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
      ...cryptoResult.data.map<AdminPaymentTransactionItem>((item) => ({
        ...item,
        source: 'payment',
      })),
      ...codResult.data.map<AdminPaymentTransactionItem>((item) => ({
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
      })),
    ];

    combined.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const start = (page - 1) * limit;
    const total = cryptoResult.total + codResult.total;

    return {
      data: combined.slice(start, start + limit),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
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
      throw new NotFoundException(`Payment record '${transactionId}' not found`);
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
}
