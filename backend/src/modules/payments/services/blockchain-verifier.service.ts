import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ERC20_TRANSFER_TOPIC,
  RPC_TIMEOUT_MS,
} from '../constants/payment.constants';
import {
  OnChainVerificationResult,
  VerifyTransactionParams,
} from '../interfaces/blockchain-verifier.interface';

interface RpcTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  blockNumber: string | null;
}

interface RpcLog {
  address: string;
  topics: string[];
  data: string;
}

interface RpcTransactionReceipt {
  transactionHash: string;
  status: string;
  blockNumber: string;
  logs: RpcLog[];
}

interface JsonRpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

@Injectable()
export class BlockchainVerifierService {
  constructor(private readonly configService: ConfigService) {}

  async verifyTransaction(
    params: VerifyTransactionParams,
  ): Promise<OnChainVerificationResult> {
    const rpcUrl = this.configService.get<string>('CRYPTO_RPC_URL');
    if (!rpcUrl) {
      throw new ServiceUnavailableException(
        'Blockchain RPC URL is not configured',
      );
    }

    const txHash = params.transactionHash.toLowerCase();
    const expectedSender = params.expectedSenderAddress.toLowerCase();
    const expectedRecipient = params.expectedDestinationAddress.toLowerCase();
    const expectedToken = params.expectedTokenAddress?.toLowerCase();
    const expectedAmount = BigInt(params.expectedAmount);

    const [rpcChainHex, tx, receipt] = await Promise.all([
      this.rpcCall<string>(rpcUrl, 'eth_chainId', []),
      this.rpcCall<RpcTransaction | null>(rpcUrl, 'eth_getTransactionByHash', [
        txHash,
      ]),
      this.rpcCall<RpcTransactionReceipt | null>(
        rpcUrl,
        'eth_getTransactionReceipt',
        [txHash],
      ),
    ]);

    if (rpcChainHex) {
      const rpcChainId = Number(BigInt(rpcChainHex));
      if (rpcChainId !== params.expectedChainId) {
        throw new ServiceUnavailableException(
          `RPC node chain ID (${rpcChainId}) does not match configured chain ID (${params.expectedChainId})`,
        );
      }
    }

    if (!tx || !receipt) {
      return {
        outcome: 'pending_mempool',
        receivedAmount: '0',
        confirmations: 0,
        reason: 'Transaction is pending confirmation on the blockchain',
      };
    }

    if (receipt.status !== '0x1') {
      return {
        outcome: 'reverted',
        receivedAmount: '0',
        blockNumber: Number(BigInt(receipt.blockNumber)),
        confirmations: 0,
        reason: 'Transaction reverted on-chain',
      };
    }

    const currentBlockHex = await this.rpcCall<string>(
      rpcUrl,
      'eth_blockNumber',
      [],
    );
    const receiptBlock = Number(BigInt(receipt.blockNumber));
    const currentBlock = Number(BigInt(currentBlockHex));
    const confirmations = Math.max(1, currentBlock - receiptBlock + 1);

    let receivedAmountBigInt = 0n;

    if (expectedToken) {
      const tokenTransferLogs = (receipt.logs || []).filter(
        (log) =>
          log.address?.toLowerCase() === expectedToken &&
          Array.isArray(log.topics) &&
          log.topics.length >= 3 &&
          log.topics[0]?.toLowerCase() === ERC20_TRANSFER_TOPIC,
      );

      if (tokenTransferLogs.length === 0) {
        return {
          outcome: 'wrong_token',
          receivedAmount: '0',
          blockNumber: receiptBlock,
          confirmations,
          reason:
            'Transaction does not contain a valid Transfer event for the expected token contract',
        };
      }

      const recipientLogs = tokenTransferLogs.filter((log) => {
        const toAddress = `0x${log.topics[2].slice(-40).toLowerCase()}`;
        return toAddress === expectedRecipient;
      });

      if (recipientLogs.length === 0) {
        return {
          outcome: 'recipient_mismatch',
          receivedAmount: '0',
          blockNumber: receiptBlock,
          confirmations,
          reason:
            'Token transfer recipient does not match the merchant wallet address',
        };
      }

      const txFrom = tx.from.toLowerCase();
      const senderMatchedLogs = recipientLogs.filter((log) => {
        const fromAddress = `0x${log.topics[1].slice(-40).toLowerCase()}`;
        return fromAddress === expectedSender || txFrom === expectedSender;
      });

      if (senderMatchedLogs.length === 0) {
        return {
          outcome: 'sender_mismatch',
          receivedAmount: '0',
          blockNumber: receiptBlock,
          confirmations,
          reason: 'Sender wallet address does not match the transaction',
        };
      }

      for (const log of senderMatchedLogs) {
        receivedAmountBigInt += BigInt(log.data || '0x0');
      }
    } else {
      if (tx.from.toLowerCase() !== expectedSender) {
        return {
          outcome: 'sender_mismatch',
          receivedAmount: '0',
          blockNumber: receiptBlock,
          confirmations,
          reason: 'Sender wallet address does not match the transaction',
        };
      }

      if (!tx.to || tx.to.toLowerCase() !== expectedRecipient) {
        return {
          outcome: 'recipient_mismatch',
          receivedAmount: '0',
          blockNumber: receiptBlock,
          confirmations,
          reason:
            'Transaction recipient does not match the merchant wallet address',
        };
      }

      receivedAmountBigInt = BigInt(tx.value || '0x0');
    }

    const receivedAmount = receivedAmountBigInt.toString();

    if (receivedAmountBigInt < expectedAmount) {
      return {
        outcome: 'underpaid',
        receivedAmount,
        blockNumber: receiptBlock,
        confirmations,
        reason: 'Payment underpaid. Please send the correct amount.',
      };
    }

    if (receivedAmountBigInt > expectedAmount) {
      return {
        outcome: 'overpaid',
        receivedAmount,
        blockNumber: receiptBlock,
        confirmations,
        reason:
          'Payment amount exceeds the required amount. Please contact support.',
      };
    }

    return {
      outcome: 'valid',
      receivedAmount,
      blockNumber: receiptBlock,
      confirmations,
    };
  }

  private async rpcCall<T>(
    rpcUrl: string,
    method: string,
    params: unknown[],
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Blockchain RPC HTTP error: ${response.status}`,
        );
      }

      const payload = (await response.json()) as JsonRpcResponse<T>;
      if (payload.error) {
        throw new ServiceUnavailableException(
          `Blockchain RPC error: ${payload.error.message}`,
        );
      }

      return payload.result as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        'Unable to reach blockchain RPC node for payment verification',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
