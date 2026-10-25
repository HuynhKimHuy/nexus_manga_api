import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}
  getHello(): string {
    return 'Hello World!';
  }
  async checkDb(): Promise<any> {
    const result = await this.dataSource.query('SELECT 1 as result');
    return result;
  }
}
