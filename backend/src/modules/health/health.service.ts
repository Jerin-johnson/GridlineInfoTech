import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';

export type HealthCheckStatus = 'ok' | 'error';
export type DependencyStatus = 'up' | 'down';

export interface HealthReport {
  status: HealthCheckStatus;
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: DependencyStatus;
      responseTimeMs?: number;
    };
  };
}

const DB_PING_TIMEOUT_MS = 2000;

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async check(): Promise<HealthReport> {
    const database = await this.checkDatabase();
    const isHealthy = database.status === 'up';

    return {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks: {
        database,
      },
    };
  }

  private async checkDatabase(): Promise<{
    status: DependencyStatus;
    responseTimeMs?: number;
  }> {
    if (
      this.connection.readyState !== ConnectionStates.connected ||
      !this.connection.db
    ) {
      return { status: 'down' };
    }

    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      await Promise.race([
        this.connection.db.admin().ping(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Database ping timeout')),
            DB_PING_TIMEOUT_MS,
          );
        }),
      ]);

      return {
        status: 'up',
        responseTimeMs: Date.now() - startedAt,
      };
    } catch {
      return { status: 'down' };
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
