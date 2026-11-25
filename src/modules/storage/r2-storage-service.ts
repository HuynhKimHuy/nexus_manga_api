import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { R2_CLIENT } from './r2-client.provider.js';
import type { ObjectMetadata } from './type/r2.type.js';

@Injectable()
export class R2StorageService {
  private readonly bucket: string;

  constructor(
    @Inject(R2_CLIENT)
    private readonly s3Client: S3Client,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.getOrThrow<string>('R2_BUCKET_NAME');
  }

  async uploadObject(
    objectKey: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    const url = this.getPublicUrl(objectKey);
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: body,
        ContentType: contentType,
      }),
    );
    return url;
  }

  getPublicUrl(objectKey: string): string {
    const base = this.config
      .get<string>('R2_PUBLIC_URL')
      ?.trim()
      .replace(/\/+$/, '');
    let url: URL;
    try {
      if (!base) throw new Error();
      url = new URL(`${base}/${objectKey}`);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.hostname.endsWith('.r2.cloudflarestorage.com') ||
        url.username ||
        url.password ||
        url.href.length > 500
      )
        throw new Error();
    } catch {
      throw new ServiceUnavailableException(
        'Cover upload requires a valid R2_PUBLIC_URL public bucket domain.',
      );
    }
    return url.href;
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }

  async createUploadUrl(
    objectKey: string,
    contentType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: 300,
      signableHeaders: new Set(['content-type']),
    });
  }

  async getObjectMetadata(objectKey: string): Promise<ObjectMetadata> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });

    const result = await this.s3Client.send(command);

    return {
      contentLength: result.ContentLength,
      contentType: result.ContentType,
    };
  }
}
