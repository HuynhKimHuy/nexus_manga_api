import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  createPostgresTestApp,
  postgresTestsEnabled,
} from './helpers/postgres-test-app.js';

describe.skipIf(!postgresTestsEnabled)('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createPostgresTestApp();
  }, 30000);

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/debug/db (GET)', () => {
    return request(app.getHttpServer())
      .get('/debug/db')
      .expect(200)
      .expect([{ result: 1 }]);
  });

  afterAll(async () => {
    await app?.close();
  });
});
