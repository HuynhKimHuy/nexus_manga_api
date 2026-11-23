import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { posix } from 'node:path';
import { crc32 } from 'node:zlib';
import { fromBufferPromise } from 'yauzl';
import { MAX_PAGE_BYTES, type PageImage } from './chapter-pages.upload.js';

export const MAX_CBZ_BYTES = 100 * 1024 * 1024;
const imageTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// Read entries in memory, never extract archive paths onto the filesystem.
export async function readCbz(
  archive?: Express.Multer.File,
): Promise<PageImage[]> {
  if (
    !archive ||
    posix.extname(archive.originalname).toLowerCase() !== '.cbz'
  ) {
    throw new BadRequestException('archive must be a .cbz file.');
  }
  if (archive.buffer.length > MAX_CBZ_BYTES)
    throw new PayloadTooLargeException('CBZ exceeds 100 MiB.');
  try {
    const zip = await fromBufferPromise(archive.buffer, {
      lazyEntries: true,
      strictFileNames: true,
    });
    try {
      const images: PageImage[] = [];
      let totalBytes = 0;
      for await (const entry of zip.eachEntry()) {
        if (entry.isEncrypted())
          throw new BadRequestException(
            'Password-protected CBZ is not supported.',
          );
        const parts = entry.fileName.split('/');
        if (
          entry.fileName.endsWith('/') ||
          parts.some((part) => part.startsWith('.') || part === '__MACOSX')
        )
          continue;
        const mimetype =
          imageTypes[posix.extname(entry.fileName).toLowerCase()];
        if (!mimetype) continue; // Ignore ComicInfo.xml and other metadata.
        if (
          entry.uncompressedSize > MAX_PAGE_BYTES ||
          totalBytes + entry.uncompressedSize > MAX_CBZ_BYTES
        ) {
          throw new PayloadTooLargeException(
            'CBZ exceeds the extracted image size limit.',
          );
        }
        const stream = await zip.openReadStreamPromise(entry);
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of stream) {
          const buffer = Buffer.from(chunk);
          size += buffer.length;
          totalBytes += buffer.length;
          if (size > MAX_PAGE_BYTES || totalBytes > MAX_CBZ_BYTES) {
            throw new PayloadTooLargeException(
              'CBZ exceeds the extracted image size limit.',
            );
          }
          chunks.push(buffer);
        }
        const buffer = Buffer.concat(chunks);
        if (crc32(buffer) !== entry.crc32)
          throw new BadRequestException('CBZ contains a corrupted image.');
        images.push({
          originalname: posix.basename(entry.fileName),
          mimetype,
          buffer,
        });
      }
      if (!images.length)
        throw new BadRequestException(
          'CBZ contains no JPEG, PNG or WebP images.',
        );
      return images;
    } finally {
      zip.close();
    }
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new BadRequestException('Invalid or unsupported CBZ archive.');
  }
}
