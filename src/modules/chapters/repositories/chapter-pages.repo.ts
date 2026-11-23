import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { Chapters } from '../chapters.entity.js';
import type { StoredPage } from '../chapter-pages.upload.js';

@Injectable()
export class ChapterPagesRepo {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async assertAvailable(
    mangaId: string,
    chapterId: string,
    firstPage: number,
    lastPage: number,
  ) {
    await this.checkAvailable(
      this.db.manager,
      mangaId,
      chapterId,
      firstPage,
      lastPage,
    );
  }

  async saveBatch(mangaId: string, chapterId: string, pages: StoredPage[]) {
    await this.db.transaction(async (manager) => {
      // Publishing uses this same chapter lock.
      await this.checkAvailable(
        manager,
        mangaId,
        chapterId,
        pages[0].pageNumber,
        pages[pages.length - 1].pageNumber,
        true,
      );
      for (const page of pages) {
        await manager.query(
          "INSERT INTO tbl_chapter_pages (id, chapter_id, page_number, object_key, content_type, size_bytes, upload_status) VALUES ($1,$2,$3,$4,$5,$6,'ready')",
          [
            page.id,
            chapterId,
            page.pageNumber,
            page.objectKey,
            page.contentType,
            page.sizeBytes,
          ],
        );
      }
    });
  }

  private async checkAvailable(
    manager: EntityManager,
    mangaId: string,
    chapterId: string,
    firstPage: number,
    lastPage: number,
    lock = false,
  ) {
    const chapter = await manager.findOne(Chapters, {
      where: { id: chapterId, mangaId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!chapter)
      throw new NotFoundException('Chapter not found in this manga.');
    if (chapter.status !== 'draft')
      throw new ConflictException(
        'Set chapter to draft before uploading pages.',
      );
    const existing: { id: string }[] = await manager.query(
      'SELECT id FROM tbl_chapter_pages WHERE chapter_id = $1 AND page_number BETWEEN $2 AND $3',
      [chapterId, firstPage, lastPage],
    );
    if (existing.length)
      throw new ConflictException('Page number already exists.');
  }

  async list(mangaId: string, chapterId: string) {
    const chapter = await this.db
      .getRepository(Chapters)
      .findOneBy({ id: chapterId, mangaId });
    if (!chapter)
      throw new NotFoundException('Chapter not found in this manga.');
    const pages: {
      id: string;
      pageNumber: number;
      objectKey: string;
      contentType: string;
      sizeBytes: string;
    }[] = await this.db.query(
      'SELECT id, page_number AS "pageNumber", object_key AS "objectKey", content_type AS "contentType", size_bytes AS "sizeBytes" FROM tbl_chapter_pages WHERE chapter_id = $1 AND upload_status = $2 ORDER BY page_number ASC',
      [chapterId, 'ready'],
    );
    return pages;
  }
}
