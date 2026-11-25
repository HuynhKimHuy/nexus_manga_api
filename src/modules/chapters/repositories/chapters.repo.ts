import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type DeleteResult, type UpdateResult } from 'typeorm';
import { Chapters, type ChapterStatus } from '../chapters.entity.js';
import type { CreateChapterDto } from '../dto/create-chapter.dto.js';
import type { UpdateChapterDto } from '../dto/update-chapter.dto.js';

@Injectable()
export class ChapterRepo {
  constructor(
    @InjectRepository(Chapters)
    private readonly chapterRepo: Repository<Chapters>,
  ) {}

  async create(dto: CreateChapterDto): Promise<Chapters> {
    const chapter = this.chapterRepo.create(dto);
    return this.chapterRepo.save(chapter);
  }

  async findAll(): Promise<Chapters[]> {
    return this.chapterRepo.find({
      order: { mangaId: 'ASC', number: 'ASC' },
    });
  }

  async findById(id: string): Promise<Chapters | null> {
    return this.chapterRepo.findOneBy({ id });
  }

  async findByMangaId(mangaId: string): Promise<Chapters[]> {
    return this.chapterRepo.find({
      where: { mangaId },
      order: { number: 'ASC' },
    });
  }

  async findPaginated(
    mangaId: string,
    page: number,
    limit: number,
    status?: ChapterStatus,
  ): Promise<{ data: Chapters[]; total: number }> {
    const [data, total] = await this.chapterRepo.findAndCount({
      where: status === undefined ? { mangaId } : { mangaId, status },
      order: { number: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async updateById(id: string, dto: UpdateChapterDto): Promise<UpdateResult> {
    if (dto.status === 'published') {
      return this.chapterRepo.manager.transaction(async (manager) => {
        const chapter = await manager.findOne(Chapters, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!chapter) return manager.update(Chapters, id, dto);
        const pages: { page_number: number; upload_status: string }[] =
          await manager.query(
            'SELECT page_number, upload_status FROM tbl_chapter_pages WHERE chapter_id = $1 ORDER BY page_number ASC',
            [id],
          );
        if (
          !pages.length ||
          pages.some(
            (page, index) =>
              page.page_number !== index + 1 || page.upload_status !== 'ready',
          )
        ) {
          throw new BadRequestException(
            'Publish requires ready pages numbered consecutively from 1.',
          );
        }
        return manager.update(Chapters, id, dto);
      });
    }
    return this.chapterRepo.update(id, dto);
  }

  async deleteById(id: string): Promise<DeleteResult> {
    return this.chapterRepo.delete(id);
  }
}
