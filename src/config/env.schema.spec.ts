import { describe, expect, it } from 'vitest';
import { envSchema } from './env.schema.js';

const config = {
  PORT: '3000',
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  POSTGRES_DB: 'test',
  POSTGRES_USER: 'test',
  POSTGRES_PASSWORD: 'test',
  R2_ACCOUNT_ID: 'test-account',
  R2_ACCESS_KEY_ID: 'test-key',
  R2_SECRET_ACCESS_KEY: 'test-secret',
  R2_BUCKET_NAME: 'test-bucket',
};

describe('R2 configuration', () => {
  it('allows startup without a public cover URL', () => {
    expect(
      envSchema.safeParse({
        ...config,
        R2_PUBLIC_BASE_URL: 'https://images.example.com',
      }).success,
    ).toBe(true);
  });

  it.each([
    'postgres://user:password@localhost/db',
    'https://account.r2.cloudflarestorage.com',
  ])('defers cover URL validation until upload: %s', (url) => {
    expect(envSchema.safeParse({ ...config, R2_PUBLIC_URL: url }).success).toBe(
      true,
    );
  });

  it.each(['https://pub-test.r2.dev', 'https://images.example.com'])(
    'accepts a public image domain: %s',
    (url) => {
      expect(
        envSchema.safeParse({ ...config, R2_PUBLIC_URL: url }).success,
      ).toBe(true);
    },
  );
});
