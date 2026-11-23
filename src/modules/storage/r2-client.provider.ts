import { S3Client } from '@aws-sdk/client-s3';
import type { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const R2_CLIENT = 'R2_CLIENT';

export const R2ClientProvider: FactoryProvider<S3Client> = {
  provide: R2_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): S3Client => {
    const accountId = config.getOrThrow<string>('R2_ACCOUNT_ID');
    const endpoint = accountId.startsWith('https://')
      ? accountId
      : `https://${accountId}.r2.cloudflarestorage.com`;

    return new S3Client({
      region: 'auto',
      endpoint,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
  },
};
