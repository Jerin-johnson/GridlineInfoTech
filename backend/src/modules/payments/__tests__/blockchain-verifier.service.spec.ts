/// <reference types="jest" />
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ERC20_TRANSFER_TOPIC } from '../constants/payment.constants';
import { BlockchainVerifierService } from '../services/blockchain-verifier.service';

describe('BlockchainVerifierService', () => {
  let service: BlockchainVerifierService;
  let mockConfigService: { get: jest.Mock };
  const originalFetch = global.fetch;

  const tokenAddress = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238';
  const merchantAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const senderAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const txHash =
    '0x1111111111111111111111111111111111111111111111111111111111111111';

  const padAddress = (addr: string) =>
    `0x000000000000000000000000${addr.replace('0x', '').toLowerCase()}`;

  const toHexAmount = (amount: bigint) => `0x${amount.toString(16)}`;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('https://sepolia.example.rpc'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainVerifierService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BlockchainVerifierService>(BlockchainVerifierService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const mockRpcResponses = (responses: Record<string, unknown>) => {
    global.fetch = jest.fn().mockImplementation((_url, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { method: string };
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: responses[body.method],
          }),
      });
    }) as typeof fetch;
  };

  it('should throw ServiceUnavailableException when CRYPTO_RPC_URL is missing', async () => {
    mockConfigService.get.mockReturnValue('');
    await expect(
      service.verifyTransaction({
        transactionHash: txHash,
        expectedChainId: 11155111,
        expectedTokenAddress: tokenAddress,
        expectedDestinationAddress: merchantAddress,
        expectedSenderAddress: senderAddress,
        expectedAmount: '1000000',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('should return pending_mempool when transaction or receipt is null', async () => {
    mockRpcResponses({
      eth_chainId: '0xaa36a7',
      eth_getTransactionByHash: null,
      eth_getTransactionReceipt: null,
    });

    const result = await service.verifyTransaction({
      transactionHash: txHash,
      expectedChainId: 11155111,
      expectedTokenAddress: tokenAddress,
      expectedDestinationAddress: merchantAddress,
      expectedSenderAddress: senderAddress,
      expectedAmount: '1000000',
    });

    expect(result.outcome).toBe('pending_mempool');
    expect(result.confirmations).toBe(0);
  });

  it('should return reverted when receipt status is 0x0', async () => {
    mockRpcResponses({
      eth_chainId: '0xaa36a7',
      eth_getTransactionByHash: { hash: txHash, from: senderAddress, to: tokenAddress, value: '0x0' },
      eth_getTransactionReceipt: {
        transactionHash: txHash,
        status: '0x0',
        blockNumber: '0x64',
        logs: [],
      },
    });

    const result = await service.verifyTransaction({
      transactionHash: txHash,
      expectedChainId: 11155111,
      expectedTokenAddress: tokenAddress,
      expectedDestinationAddress: merchantAddress,
      expectedSenderAddress: senderAddress,
      expectedAmount: '1000000',
    });

    expect(result.outcome).toBe('reverted');
  });

  it('should return wrong_token when no ERC-20 Transfer log matches expected token contract', async () => {
    mockRpcResponses({
      eth_chainId: '0xaa36a7',
      eth_getTransactionByHash: { hash: txHash, from: senderAddress, to: tokenAddress, value: '0x0' },
      eth_getTransactionReceipt: {
        transactionHash: txHash,
        status: '0x1',
        blockNumber: '0x64',
        logs: [
          {
            address: '0x9999999999999999999999999999999999999999',
            topics: [
              ERC20_TRANSFER_TOPIC,
              padAddress(senderAddress),
              padAddress(merchantAddress),
            ],
            data: toHexAmount(1000000n),
          },
        ],
      },
      eth_blockNumber: '0x68',
    });

    const result = await service.verifyTransaction({
      transactionHash: txHash,
      expectedChainId: 11155111,
      expectedTokenAddress: tokenAddress,
      expectedDestinationAddress: merchantAddress,
      expectedSenderAddress: senderAddress,
      expectedAmount: '1000000',
    });

    expect(result.outcome).toBe('wrong_token');
  });

  it('should return underpaid when ERC-20 Transfer amount is less than expectedAmount', async () => {
    mockRpcResponses({
      eth_chainId: '0xaa36a7',
      eth_getTransactionByHash: { hash: txHash, from: senderAddress, to: tokenAddress, value: '0x0' },
      eth_getTransactionReceipt: {
        transactionHash: txHash,
        status: '0x1',
        blockNumber: '0x64',
        logs: [
          {
            address: tokenAddress,
            topics: [
              ERC20_TRANSFER_TOPIC,
              padAddress(senderAddress),
              padAddress(merchantAddress),
            ],
            data: toHexAmount(500000n),
          },
        ],
      },
      eth_blockNumber: '0x68',
    });

    const result = await service.verifyTransaction({
      transactionHash: txHash,
      expectedChainId: 11155111,
      expectedTokenAddress: tokenAddress,
      expectedDestinationAddress: merchantAddress,
      expectedSenderAddress: senderAddress,
      expectedAmount: '1000000',
    });

    expect(result.outcome).toBe('underpaid');
    expect(result.receivedAmount).toBe('500000');
  });

  it('should return overpaid when ERC-20 Transfer amount exceeds expectedAmount', async () => {
    mockRpcResponses({
      eth_chainId: '0xaa36a7',
      eth_getTransactionByHash: { hash: txHash, from: senderAddress, to: tokenAddress, value: '0x0' },
      eth_getTransactionReceipt: {
        transactionHash: txHash,
        status: '0x1',
        blockNumber: '0x64',
        logs: [
          {
            address: tokenAddress,
            topics: [
              ERC20_TRANSFER_TOPIC,
              padAddress(senderAddress),
              padAddress(merchantAddress),
            ],
            data: toHexAmount(1500000n),
          },
        ],
      },
      eth_blockNumber: '0x68',
    });

    const result = await service.verifyTransaction({
      transactionHash: txHash,
      expectedChainId: 11155111,
      expectedTokenAddress: tokenAddress,
      expectedDestinationAddress: merchantAddress,
      expectedSenderAddress: senderAddress,
      expectedAmount: '1000000',
    });

    expect(result.outcome).toBe('overpaid');
    expect(result.receivedAmount).toBe('1500000');
  });

  it('should return valid with exact confirmations for matching ERC-20 Transfer event', async () => {
    mockRpcResponses({
      eth_chainId: '0xaa36a7',
      eth_getTransactionByHash: { hash: txHash, from: senderAddress, to: tokenAddress, value: '0x0' },
      eth_getTransactionReceipt: {
        transactionHash: txHash,
        status: '0x1',
        blockNumber: '0x64', // 100
        logs: [
          {
            address: tokenAddress,
            topics: [
              ERC20_TRANSFER_TOPIC,
              padAddress(senderAddress),
              padAddress(merchantAddress),
            ],
            data: toHexAmount(1000000n),
          },
        ],
      },
      eth_blockNumber: '0x67', // 103 -> 4 confirmations
    });

    const result = await service.verifyTransaction({
      transactionHash: txHash,
      expectedChainId: 11155111,
      expectedTokenAddress: tokenAddress,
      expectedDestinationAddress: merchantAddress,
      expectedSenderAddress: senderAddress,
      expectedAmount: '1000000',
    });

    expect(result.outcome).toBe('valid');
    expect(result.receivedAmount).toBe('1000000');
    expect(result.blockNumber).toBe(100);
    expect(result.confirmations).toBe(4);
  });
});
