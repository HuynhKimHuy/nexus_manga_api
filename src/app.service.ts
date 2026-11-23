import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthStatus {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
}

export interface DatabaseHealthResult {
  result: number;
}

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!';
  }

  getHealth(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  async checkDb(): Promise<DatabaseHealthResult[]> {
    const result = await this.dataSource.query<DatabaseHealthResult[]>(
      'SELECT 1 as result',
    );

    if (!Array.isArray(result) || result[0]?.result !== 1) {
      throw new Error('Database health check failed');
    }

    return result;
  }
}
