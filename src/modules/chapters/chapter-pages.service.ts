import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { R2StorageService } from '../storage/r2-storage-service.js';
import { ChapterPagesRepo } from './repositories/chapter-pages.repo.js';
import {
  preparePages,
  type PageResponse,
  type StoredPage,
  type PageImage,
} from './chapter-pages.upload.js';
import { readCbz } from './chapter-pages.cbz.js';

@Injectable()
export class ChapterPagesService {
  private readonly logger = new Logger(ChapterPagesService.name);

  constructor(
    private readonly pagesRepo: ChapterPagesRepo,
    private readonly storage: R2StorageService,
  ) {}

  async upload(
    mangaId: string,
    chapterId: string,
    pageNumber: number,
    file?: Express.Multer.File,
  ): Promise<PageResponse> {
    if (!file) throw new BadRequestException('image file is required.');
    const { pages } = await this.uploadBatch(mangaId, chapterId, pageNumber, [
      file,
    ]);
    return pages[0];
  }

  async uploadBatch(
    mangaId: string,
    chapterId: string,
    startPage: number,
    files: PageImage[] = [],
  ): Promise<{ pages: PageResponse[] }> {
    const prepared = preparePages(chapterId, startPage, files);
    await this.pagesRepo.assertAvailable(
      mangaId,
      chapterId,
      startPage,
      startPage + files.length - 1,
    );

    const attemptedKeys: string[] = [];
    const uploaded: StoredPage[] = [];
    try {
      // R2 calls stay outside the database transaction.
      for (const page of prepared) {
        attemptedKeys.push(page.objectKey);
        const url = await this.storage.uploadObject(
          page.objectKey,
          page.file.buffer,
          page.contentType,
        );
        uploaded.push({
          id: randomUUID(),
          pageNumber: page.pageNumber,
          objectKey: page.objectKey,
          contentType: page.contentType,
          sizeBytes: page.file.buffer.length,
          url,
        });
      }
      await this.pagesRepo.saveBatch(mangaId, chapterId, uploaded);
    } catch (error) {
      await this.cleanup(attemptedKeys);
      throw error;
    }
    return {
      pages: uploaded.map(({ objectKey: _objectKey, ...page }) => page),
    };
  }

  async list(mangaId: string, chapterId: string): Promise<PageResponse[]> {
    const pages = await this.pagesRepo.list(mangaId, chapterId);
    return pages.map(({ objectKey, ...page }) => ({
      ...page,
      sizeBytes: Number(page.sizeBytes),
      url: this.storage.getPublicUrl(objectKey),
    }));
  }

  async importCbz(
    mangaId: string,
    chapterId: string,
    startPage: number,
    archive?: Express.Multer.File,
  ) {
    const images = await readCbz(archive);
    return this.uploadBatch(mangaId, chapterId, startPage, images);
  }

  private async cleanup(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.storage.deleteObject(key);
      } catch {
        this.logger.error('Failed to clean up chapter page: ' + key);
      }
    }
  }
}
