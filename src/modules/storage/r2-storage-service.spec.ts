import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { R2_CLIENT, R2ClientProvider } from './r2-client.provider.js';
import { R2StorageService } from './r2-storage-service.js';

describe('R2StorageService upload signing', () => {
  it.each([
    undefined,
    'postgres://user:password@localhost/db',
    'https://account.r2.cloudflarestorage.com',
  ])(
    'rejects invalid cover configuration before sending a file',
    async (publicUrl) => {
      const send = vi.fn();
      const service = new R2StorageService(
        { send } as unknown as S3Client,
        new ConfigService({ R2_BUCKET_NAME: 'test', R2_PUBLIC_URL: publicUrl }),
      );
      await expect(
        service.uploadObject('cover.png', Buffer.from('test'), 'image/png'),
      ).rejects.toMatchObject({ status: 503 });
      expect(send).not.toHaveBeenCalled();
    },
  );
  let client: S3Client | undefined;

  afterEach(() => {
    client?.destroy();
  });

  it('signs a five-minute upload URL without a checksum for an unknown body', async () => {
    const module = await Test.createTestingModule({
      providers: [
        R2ClientProvider,
        R2StorageService,
        {
          provide: ConfigService,
          useValue: new ConfigService({
            R2_ACCOUNT_ID: 'https://test-account.r2.cloudflarestorage.com',
            R2_ACCESS_KEY_ID: 'test-access-key',
            R2_SECRET_ACCESS_KEY: 'test-secret-key',
            R2_BUCKET_NAME: 'test-bucket',
          }),
        },
      ],
    }).compile();

    try {
      client = module.get<S3Client>(R2_CLIENT);
      const service = module.get(R2StorageService);
      const url = new URL(
        await service.createUploadUrl('chapters/page.webp', 'image/webp'),
      );

      expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
      expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe(
        'content-type;host',
      );
      expect(url.searchParams.get('x-amz-checksum-crc32')).toBeNull();
      expect(url.searchParams.get('x-amz-sdk-checksum-algorithm')).toBeNull();
    } finally {
      await module.close();
    }
  });
});
