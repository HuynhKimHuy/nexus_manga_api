import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { envSchema } from '../../src/config/env.schema.js';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe.js';

// Opt in explicitly. Never import AppModule (which reads .env) when skipped.
export const postgresTestsEnabled = process.env.RUN_DB_TESTS === '1';

export async function createPostgresTestApp(): Promise<INestApplication<App>> {
  // Parse process.env before AppModule can fill missing values from a dev .env.
  const env = envSchema.parse(process.env);
  if (env.NODE_ENV !== 'test' || !env.POSTGRES_DB.endsWith('_test')) {
    throw new Error(
      'Database tests require NODE_ENV=test and an explicit POSTGRES_DB ending in _test.',
    );
  }

  const { AppModule } = await import('../../src/app.module.js');
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = module.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  try {
    // Match main.ts: module-only bootstrapping does not install global pipes.
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
    const database = app.get(DataSource);
    expect(database.options.synchronize).toBe(false);
    const metadata: { database: string; version: string }[] =
      await database.query(
        "SELECT current_database() AS database, current_setting('server_version_num') AS version",
      );
    expect(metadata[0]?.database).toBe(env.POSTGRES_DB);
    expect(Number(metadata[0]?.version)).toBeGreaterThanOrEqual(180000);
    expect(Number(metadata[0]?.version)).toBeLessThan(190000);
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}
