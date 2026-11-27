import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection, Types } from 'mongoose';
import { FormattedOrder } from '../orders/interfaces/order.interface';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import {
  PAYMENT_REPOSITORY,
  TERMINAL_REJECTED_PAYMENT_STATUSES,
} from './constants/payment.constants';
import type { PaymentVerificationStatus } from './constants/payment.constants';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import type { IPaymentRepository } from './interfaces/payment-repository.interface';
import {
  CryptoPaymentConfig,
  FormattedPayment,
} from './interfaces/payment.interface';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { BlockchainVerifierService } from './services/blockchain-verifier.service';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    private readonly ordersService: OrdersService,
    private readonly productsService: ProductsService,
    private readonly blockchainVerifierService: BlockchainVerifierService,
    private readonly configService: ConfigService,
    @Optional()
    @InjectConnection()
    private readonly connection?: Connection,
  ) {}

  getPublicConfig(): CryptoPaymentConfig {
    const tokenAddress = this.configService
      .get<string>('CRYPTO_TOKEN_ADDRESS')
      ?.trim();
    const destinationAddress =
      this.configService.get<string>('PAYMENT_WALLET_ADDRESS')?.trim() || '';

    return {
      chainId: this.configService.get<number>('CRYPTO_CHAIN_ID') ?? 11155111,
      network: this.configService.get<string>('CRYPTO_NETWORK') ?? 'Sepolia',
      token: (
        this.configService.get<string>('CRYPTO_TOKEN_SYMBOL') ?? 'USDC'
      ).toUpperCase(),
      ...(tokenAddress ? { tokenAddress: tokenAddress.toLowerCase() } : {}),
      tokenDecimals:
        this.configService.get<number>('CRYPTO_TOKEN_DECIMALS') ?? 6,
      destinationAddress: destinationAddress.toLowerCase(),
      requiredConfirmations:
        this.configService.get<number>('CRYPTO_REQUIRED_CONFIRMATIONS') ?? 3,
    };
  }

  async initiatePayment(
    userId: string,
    dto: InitiatePaymentDto,
  ): Promise<FormattedPayment> {
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(dto.orderId)
    ) {
      throw new BadRequestException('Invalid user or order ID format');
    }

    const config = this.getPublicConfig();
    if (!config.destinationAddress) {
      throw new ServiceUnavailableException(
        'Merchant payment wallet address is not configured',
      );
    }

    if (dto.chainId !== undefined && dto.chainId !== config.chainId) {
      throw new BadRequestException(
        `Unsupported network. Please switch to ${config.network} (Chain ID ${config.chainId})`,
      );
    }

    const order = await this.ordersService.findUserOrderById(
      userId,
      dto.orderId,
    );

    if (order.paymentStatus === 'paid') {
      throw new ConflictException('Order has already been paid');
    }

    if (order.fulfilmentStatus !== 'placed') {
      throw new BadRequestException(
        `Payment cannot be initiated for an order in status '${order.fulfilmentStatus}'`,
      );
    }

    if (
      order.paymentMethod === 'cod' &&
      !['pending', 'failed'].includes(order.paymentStatus)
    ) {
      throw new BadRequestException(
        `COD order cannot be converted to online payment in status '${order.paymentStatus}'`,
      );
    }

    if (
      order.paymentExpiresAt &&
      new Date(order.paymentExpiresAt).getTime() <= Date.now()
    ) {
      await this.expireOrderAndReleaseStock(order, userId);
      throw new BadRequestException('Order payment window has expired');
    }

    const expectedAmount = this.calculateExpectedAmount(
      order.totalAmount,
      config.tokenDecimals,
    );
    const walletAddress = dto.walletAddress.toLowerCase();

    const latestPayment = await this.paymentRepository.findLatestByOrderAndUser(
      dto.orderId,
      userId,
    );

    if (
      latestPayment &&
      latestPayment.verificationStatus === 'pending' &&
      !latestPayment.transactionHash
    ) {
      latestPayment.walletAddress = walletAddress;
      latestPayment.expectedAmount = expectedAmount;
      const updated = await this.paymentRepository.save(latestPayment);
      return this.formatPayment(updated);
    }

    const existingCount = await this.paymentRepository.countByOrder(
      dto.orderId,
    );
    const attemptNumber = existingCount + 1;
    const paymentReference =
      attemptNumber === 1
        ? order.paymentReference
        : `${order.paymentReference}-${attemptNumber}`;

    const created = await this.paymentRepository.create({
      order: new Types.ObjectId(dto.orderId),
      user: new Types.ObjectId(userId),
      paymentReference,
      orderPaymentReference: order.paymentReference,
      attemptNumber,
      paymentMethod: 'crypto_wallet',
      chainId: config.chainId,
      network: config.network,
      token: config.token,
      tokenAddress: config.tokenAddress,
      tokenDecimals: config.tokenDecimals,
      destinationAddress: config.destinationAddress,
      walletAddress,
      expectedAmount,
      confirmations: 0,
      requiredConfirmations: config.requiredConfirmations,
      verificationStatus: 'pending',
      expiresAt: order.paymentExpiresAt
        ? new Date(order.paymentExpiresAt)
        : new Date(Date.now() + 30 * 60 * 1000),
    });

    return this.formatPayment(created);
  }

  async verifyPayment(
    userId: string,
    dto: VerifyPaymentDto,
  ): Promise<FormattedPayment> {
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(dto.orderId)
    ) {
      throw new BadRequestException('Invalid user or order ID format');
    }

    const config = this.getPublicConfig();
    if (!config.destinationAddress) {
      throw new ServiceUnavailableException(
        'Merchant payment wallet address is not configured',
      );
    }

    const txHash = dto.transactionHash.toLowerCase();
    const walletAddress = dto.walletAddress.toLowerCase();
    const order = await this.ordersService.findUserOrderById(
      userId,
      dto.orderId,
    );

    if (order.paymentStatus === 'paid') {
      const verified = await this.paymentRepository.findVerifiedByOrder(
        dto.orderId,
      );
      if (verified && verified.transactionHash === txHash) {
        return this.formatPayment(verified);
      }
      throw new ConflictException('Order has already been paid');
    }

    const duplicateTx = await this.paymentRepository.findByChainAndTxHash(
      dto.chainId,
      txHash,
    );
    if (duplicateTx && duplicateTx.order.toString() !== dto.orderId) {
      throw new ConflictException(
        'Transaction hash has already been used for another order',
      );
    }

    const existingAttemptForTx =
      await this.paymentRepository.findByOrderAndTxHash(dto.orderId, txHash);
    if (
      existingAttemptForTx &&
      TERMINAL_REJECTED_PAYMENT_STATUSES.includes(
        existingAttemptForTx.verificationStatus,
      )
    ) {
      throw new BadRequestException({
        message:
          existingAttemptForTx.failureReason ||
          'Transaction was already rejected',
        verificationStatus: existingAttemptForTx.verificationStatus,
        expectedAmount: existingAttemptForTx.expectedAmount,
        receivedAmount: existingAttemptForTx.receivedAmount,
      });
    }

    const expectedAmount = this.calculateExpectedAmount(
      order.totalAmount,
      config.tokenDecimals,
    );

    if (dto.chainId !== config.chainId) {
      const reason = `Wrong network. Please switch to ${config.network} (Chain ID ${config.chainId})`;
      await this.recordRejectedAttempt({
        order,
        userId,
        config,
        walletAddress,
        txHash,
        submittedChainId: dto.chainId,
        expectedAmount,
        receivedAmount: '0',
        confirmations: 0,
        verificationStatus: 'wrong_network',
        reason,
      });
      throw new BadRequestException({
        message: reason,
        verificationStatus: 'wrong_network',
        expectedAmount,
      });
    }

    if (
      order.fulfilmentStatus === 'cancelled' &&
      order.paymentStatus !== 'expired'
    ) {
      throw new BadRequestException('Cancelled orders cannot be paid');
    }

    const isOrderExpired =
      order.paymentStatus === 'expired' ||
      Boolean(
        order.paymentExpiresAt &&
          new Date(order.paymentExpiresAt).getTime() <= Date.now(),
      );

    const verification = await this.blockchainVerifierService.verifyTransaction(
      {
        transactionHash: txHash,
        expectedChainId: config.chainId,
        expectedTokenAddress: config.tokenAddress,
        expectedDestinationAddress: config.destinationAddress,
        expectedSenderAddress: walletAddress,
        expectedAmount,
      },
    );

    if (isOrderExpired) {
      const reason =
        'Order payment window has expired. Your transaction details have been recorded for reconciliation; please contact support.';
      await this.recordExpiredReconciliation({
        order,
        userId,
        config,
        walletAddress,
        txHash,
        expectedAmount,
        receivedAmount: verification.receivedAmount,
        blockNumber: verification.blockNumber,
        confirmations: verification.confirmations,
        reason,
      });
      throw new BadRequestException({
        message: reason,
        verificationStatus: 'expired',
        expectedAmount,
        receivedAmount: verification.receivedAmount,
        transactionHash: txHash,
      });
    }

    if (verification.outcome === 'pending_mempool') {
      const saved = await this.upsertAttempt({
        order,
        userId,
        config,
        walletAddress,
        txHash,
        expectedAmount,
        receivedAmount: '0',
        confirmations: 0,
        verificationStatus: 'confirming',
      });
      await this.ordersService.updateOrderPaymentState(dto.orderId, userId, {
        allowedCurrentPaymentStatuses: ['pending', 'confirming', 'failed'],
        allowedCurrentFulfilmentStatuses: ['placed'],
        paymentStatus: 'confirming',
        historyStatus: 'payment_confirming',
        historyNote: `Crypto transaction submitted and awaiting confirmation (${txHash})`,
        actor: 'system',
      });
      return this.formatPayment(saved);
    }

    if (
      verification.outcome === 'reverted' ||
      verification.outcome === 'wrong_token' ||
      verification.outcome === 'sender_mismatch' ||
      verification.outcome === 'recipient_mismatch'
    ) {
      const statusMap: Record<string, PaymentVerificationStatus> = {
        reverted: 'reverted',
        wrong_token: 'wrong_token',
        sender_mismatch: 'failed',
        recipient_mismatch: 'failed',
      };
      const verificationStatus = statusMap[verification.outcome];
      const reason = verification.reason || 'Transaction verification failed';

      await this.recordRejectedAttempt({
        order,
        userId,
        config,
        walletAddress,
        txHash,
        submittedChainId: config.chainId,
        expectedAmount,
        receivedAmount: verification.receivedAmount,
        blockNumber: verification.blockNumber,
        confirmations: verification.confirmations,
        verificationStatus,
        reason,
      });

      throw new BadRequestException({
        message: reason,
        verificationStatus,
        expectedAmount,
        receivedAmount: verification.receivedAmount,
      });
    }

    if (verification.outcome === 'underpaid') {
      const reason = 'Payment underpaid. Please send the correct amount.';
      await this.recordRejectedAttempt({
        order,
        userId,
        config,
        walletAddress,
        txHash,
        submittedChainId: config.chainId,
        expectedAmount,
        receivedAmount: verification.receivedAmount,
        blockNumber: verification.blockNumber,
        confirmations: verification.confirmations,
        verificationStatus: 'underpaid',
        reason,
      });

      throw new BadRequestException({
        message: reason,
        verificationStatus: 'underpaid',
        expectedAmount,
        receivedAmount: verification.receivedAmount,
      });
    }

    if (verification.outcome === 'overpaid') {
      const reason =
        'Payment amount exceeds the required amount. Please contact support.';
      await this.recordRejectedAttempt({
        order,
        userId,
        config,
        walletAddress,
        txHash,
        submittedChainId: config.chainId,
        expectedAmount,
        receivedAmount: verification.receivedAmount,
        blockNumber: verification.blockNumber,
        confirmations: verification.confirmations,
        verificationStatus: 'overpaid',
        reason,
      });

      throw new BadRequestException({
        message: reason,
        verificationStatus: 'overpaid',
        expectedAmount,
        receivedAmount: verification.receivedAmount,
      });
    }

    if (verification.confirmations < config.requiredConfirmations) {
      const saved = await this.upsertAttempt({
        order,
        userId,
        config,
        walletAddress,
        txHash,
        expectedAmount,
        receivedAmount: verification.receivedAmount,
        blockNumber: verification.blockNumber,
        confirmations: verification.confirmations,
        verificationStatus: 'confirming',
      });

      await this.ordersService.updateOrderPaymentState(dto.orderId, userId, {
        allowedCurrentPaymentStatuses: ['pending', 'confirming', 'failed'],
        allowedCurrentFulfilmentStatuses: ['placed'],
        paymentStatus: 'confirming',
        historyStatus: 'payment_confirming',
        historyNote: `Awaiting confirmations (${verification.confirmations}/${config.requiredConfirmations}) for tx ${txHash}`,
        actor: 'system',
      });

      return this.formatPayment(saved);
    }

    const verifiedPayment = await this.executeWithOptionalTransaction(
      async (session) => {
        const updatedOrder = await this.ordersService.updateOrderPaymentState(
          dto.orderId,
          userId,
          {
            allowedCurrentPaymentStatuses: ['pending', 'confirming', 'failed'],
            allowedCurrentFulfilmentStatuses: ['placed'],
            paymentStatus: 'paid',
            fulfilmentStatus: 'payment_confirmed',
            ...(order.paymentMethod === 'cod'
              ? { paymentMethod: 'crypto_wallet' }
              : {}),
            stockReserved: false,
            historyStatus: 'payment_confirmed',
            historyNote:
              order.paymentMethod === 'cod'
                ? `Converted from COD and verified on ${config.network} (tx: ${txHash})`
                : `Crypto payment verified on ${config.network} (tx: ${txHash})`,
            actor: 'system',
          },
          session,
        );

        if (!updatedOrder) {
          throw new ConflictException(
            'Order payment state changed concurrently and cannot be finalized',
          );
        }

        if (order.stockReserved) {
          for (const item of order.items) {
            const deducted = await this.productsService.confirmStockDeduction(
              item.productId,
              item.quantity,
              session,
            );
            if (!deducted) {
              throw new ConflictException(
                `Unable to finalize stock deduction for '${item.name}'`,
              );
            }
          }
        }

        return this.upsertAttempt(
          {
            order,
            userId,
            config,
            walletAddress,
            txHash,
            expectedAmount,
            receivedAmount: verification.receivedAmount,
            blockNumber: verification.blockNumber,
            confirmations: verification.confirmations,
            verificationStatus: 'verified',
            verifiedAt: new Date(),
          },
          session,
        );
      },
    );

    return this.formatPayment(verifiedPayment);
  }

  async getPaymentByOrder(
    userId: string,
    orderId: string,
  ): Promise<FormattedPayment | null> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid user or order ID format');
    }

    await this.ordersService.findUserOrderById(userId, orderId);
    const payment = await this.paymentRepository.findLatestByOrderAndUser(
      orderId,
      userId,
    );

    return payment ? this.formatPayment(payment) : null;
  }

  calculateExpectedAmount(
    totalAmountCents: number,
    tokenDecimals: number,
  ): string {
    if (!Number.isInteger(totalAmountCents) || totalAmountCents <= 0) {
      throw new BadRequestException(
        'Order totalAmount must be a positive integer in minor units',
      );
    }

    const cents = BigInt(totalAmountCents);
    if (tokenDecimals >= 2) {
      return (cents * 10n ** BigInt(tokenDecimals - 2)).toString();
    }
    return (cents / 10n ** BigInt(2 - tokenDecimals)).toString();
  }

  private async expireOrderAndReleaseStock(
    order: FormattedOrder,
    userId: string,
  ): Promise<void> {
    await this.executeWithOptionalTransaction(async (session) => {
      const updated = await this.ordersService.updateOrderPaymentState(
        order.id,
        userId,
        {
          allowedCurrentPaymentStatuses: ['pending', 'failed'],
          allowedCurrentFulfilmentStatuses: ['placed'],
          paymentStatus: 'expired',
          fulfilmentStatus: 'cancelled',
          stockReserved: false,
          historyStatus: 'cancelled',
          historyNote: 'Order expired due to elapsed payment window',
          actor: 'system',
        },
        session,
      );

      if (updated && order.stockReserved) {
        for (const item of order.items) {
          await this.productsService.releaseStock(
            item.productId,
            item.quantity,
            session,
          );
        }
      }
    });
  }

  private async recordExpiredReconciliation(params: {
    order: FormattedOrder;
    userId: string;
    config: CryptoPaymentConfig;
    walletAddress: string;
    txHash: string;
    expectedAmount: string;
    receivedAmount: string;
    blockNumber?: number;
    confirmations: number;
    reason: string;
  }): Promise<void> {
    await this.executeWithOptionalTransaction(async (session) => {
      await this.upsertAttempt(
        {
          order: params.order,
          userId: params.userId,
          config: params.config,
          walletAddress: params.walletAddress,
          txHash: params.txHash,
          expectedAmount: params.expectedAmount,
          receivedAmount: params.receivedAmount,
          blockNumber: params.blockNumber,
          confirmations: params.confirmations,
          verificationStatus: 'expired',
          failureReason: params.reason,
        },
        session,
      );

      const updated = await this.ordersService.updateOrderPaymentState(
        params.order.id,
        params.userId,
        {
          allowedCurrentPaymentStatuses: ['pending', 'confirming', 'failed'],
          allowedCurrentFulfilmentStatuses: ['placed'],
          paymentStatus: 'expired',
          fulfilmentStatus: 'cancelled',
          stockReserved: false,
          historyStatus: 'cancelled',
          historyNote: `Late transaction (${params.txHash}) recorded for reconciliation after payment window expired`,
          actor: 'system',
        },
        session,
      );

      if (updated && params.order.stockReserved) {
        for (const item of params.order.items) {
          await this.productsService.releaseStock(
            item.productId,
            item.quantity,
            session,
          );
        }
      }
    });
  }

  private async recordRejectedAttempt(params: {
    order: FormattedOrder;
    userId: string;
    config: CryptoPaymentConfig;
    walletAddress: string;
    txHash: string;
    submittedChainId: number;
    expectedAmount: string;
    receivedAmount: string;
    blockNumber?: number;
    confirmations: number;
    verificationStatus: PaymentVerificationStatus;
    reason: string;
  }): Promise<void> {
    await this.upsertAttempt({
      order: params.order,
      userId: params.userId,
      config: { ...params.config, chainId: params.submittedChainId },
      walletAddress: params.walletAddress,
      txHash: params.txHash,
      expectedAmount: params.expectedAmount,
      receivedAmount: params.receivedAmount,
      blockNumber: params.blockNumber,
      confirmations: params.confirmations,
      verificationStatus: params.verificationStatus,
      failureReason: params.reason,
    });

    await this.ordersService.updateOrderPaymentState(
      params.order.id,
      params.userId,
      {
        allowedCurrentPaymentStatuses: ['pending', 'confirming', 'failed'],
        allowedCurrentFulfilmentStatuses: ['placed'],
        paymentStatus: 'failed',
        historyStatus: 'payment_failed',
        historyNote: params.reason,
        actor: 'system',
      },
    );
  }

  private async upsertAttempt(
    params: {
      order: FormattedOrder;
      userId: string;
      config: CryptoPaymentConfig;
      walletAddress: string;
      txHash: string;
      expectedAmount: string;
      receivedAmount: string;
      blockNumber?: number;
      confirmations: number;
      verificationStatus: PaymentVerificationStatus;
      failureReason?: string;
      verifiedAt?: Date;
    },
    session?: ClientSession,
  ): Promise<PaymentDocument> {
    try {
      const existingForTx = await this.paymentRepository.findByOrderAndTxHash(
        params.order.id,
        params.txHash,
      );
      if (existingForTx) {
        existingForTx.walletAddress = params.walletAddress;
        existingForTx.receivedAmount = params.receivedAmount;
        existingForTx.blockNumber = params.blockNumber;
        existingForTx.confirmations = params.confirmations;
        existingForTx.verificationStatus = params.verificationStatus;
        existingForTx.failureReason = params.failureReason;
        existingForTx.verifiedAt = params.verifiedAt;
        return await this.paymentRepository.save(existingForTx, session);
      }

      const latest = await this.paymentRepository.findLatestByOrderAndUser(
        params.order.id,
        params.userId,
      );
      if (
        latest &&
        latest.verificationStatus === 'pending' &&
        !latest.transactionHash
      ) {
        latest.chainId = params.config.chainId;
        latest.walletAddress = params.walletAddress;
        latest.transactionHash = params.txHash;
        latest.expectedAmount = params.expectedAmount;
        latest.receivedAmount = params.receivedAmount;
        latest.blockNumber = params.blockNumber;
        latest.confirmations = params.confirmations;
        latest.verificationStatus = params.verificationStatus;
        latest.failureReason = params.failureReason;
        latest.verifiedAt = params.verifiedAt;
        return await this.paymentRepository.save(latest, session);
      }

      const count = await this.paymentRepository.countByOrder(params.order.id);
      const attemptNumber = count + 1;
      const paymentReference =
        attemptNumber === 1
          ? params.order.paymentReference
          : `${params.order.paymentReference}-${attemptNumber}`;

      return await this.paymentRepository.create(
        {
          order: new Types.ObjectId(params.order.id),
          user: new Types.ObjectId(params.userId),
          paymentReference,
          orderPaymentReference: params.order.paymentReference,
          attemptNumber,
          paymentMethod: 'crypto_wallet',
          chainId: params.config.chainId,
          network: params.config.network,
          token: params.config.token,
          tokenAddress: params.config.tokenAddress,
          tokenDecimals: params.config.tokenDecimals,
          destinationAddress: params.config.destinationAddress,
          walletAddress: params.walletAddress,
          transactionHash: params.txHash,
          expectedAmount: params.expectedAmount,
          receivedAmount: params.receivedAmount,
          blockNumber: params.blockNumber,
          confirmations: params.confirmations,
          requiredConfirmations: params.config.requiredConfirmations,
          verificationStatus: params.verificationStatus,
          failureReason: params.failureReason,
          expiresAt: params.order.paymentExpiresAt
            ? new Date(params.order.paymentExpiresAt)
            : new Date(),
          verifiedAt: params.verifiedAt,
        },
        session,
      );
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Transaction hash has already been submitted',
        );
      }
      throw error;
    }
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

  private formatPayment(payment: PaymentDocument): FormattedPayment {
    const raw = payment.toObject
      ? (payment.toObject() as unknown as Payment & { _id: Types.ObjectId })
      : (payment as unknown as Payment & { _id: Types.ObjectId });

    return {
      id: raw._id.toString(),
      orderId: raw.order.toString(),
      paymentReference: raw.paymentReference,
      orderPaymentReference: raw.orderPaymentReference,
      attemptNumber: raw.attemptNumber,
      paymentMethod: raw.paymentMethod,
      chainId: raw.chainId,
      network: raw.network,
      token: raw.token,
      tokenAddress: raw.tokenAddress,
      tokenDecimals: raw.tokenDecimals,
      destinationAddress: raw.destinationAddress,
      walletAddress: raw.walletAddress,
      transactionHash: raw.transactionHash,
      expectedAmount: raw.expectedAmount,
      receivedAmount: raw.receivedAmount,
      blockNumber: raw.blockNumber,
      confirmations: raw.confirmations,
      requiredConfirmations: raw.requiredConfirmations,
      verificationStatus: raw.verificationStatus,
      failureReason: raw.failureReason,
      expiresAt: raw.expiresAt,
      verifiedAt: raw.verifiedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
