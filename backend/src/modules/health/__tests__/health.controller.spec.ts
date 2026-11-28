import { ServiceUnavailableException } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { IS_PUBLIC_KEY } from '../../auth/constants/auth.constants';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockPing = jest.fn();
  const mockConnection: {
    readyState: number;
    db?: { admin: () => { ping: jest.Mock } };
  } = {
    readyState: 1,
    db: {
      admin: () => ({
        ping: mockPing,
      }),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConnection.readyState = 1;
    mockConnection.db = {
      admin: () => ({
        ping: mockPing,
      }),
    };
    mockPing.mockResolvedValue({ ok: 1 });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be marked as @Public()', () => {
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, controller.check);
    expect(isPublic).toBe(true);
  });

  it('should return healthy report when MongoDB ping succeeds', async () => {
    const report = await controller.check();

    expect(report.status).toBe('ok');
    expect(typeof report.timestamp).toBe('string');
    expect(typeof report.uptime).toBe('number');
    expect(report.checks.database.status).toBe('up');
    expect(typeof report.checks.database.responseTimeMs).toBe('number');
    expect(mockPing).toHaveBeenCalledTimes(1);
  });

  it('should throw ServiceUnavailableException when MongoDB is disconnected', async () => {
    mockConnection.readyState = 0;

    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(mockPing).not.toHaveBeenCalled();

    try {
      await controller.check();
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      const body = (err as ServiceUnavailableException).getResponse() as {
        status: string;
        checks: { database: { status: string } };
      };
      expect(body.status).toBe('error');
      expect(body.checks.database).toEqual({ status: 'down' });
    }
  });

  it('should throw ServiceUnavailableException when MongoDB ping fails', async () => {
    mockPing.mockRejectedValue(new Error('mongodb://secret-host:27017 failed'));

    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );

    try {
      await controller.check();
    } catch (err) {
      const body = (err as ServiceUnavailableException).getResponse();
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain('secret-host');
      expect(serialized).toContain('"status":"down"');
    }
  });
});
