import { Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { BusinessException } from '../../common/exeptions/bussines.exeption.js';
import { ErrorCode } from '../../common/filter/errors/error-code.js';
import { MangaRepo } from '../mangas/mangas.repo.js';
import type { Chapters, ChapterStatus } from './chapters.entity.js';
import type { CreateChapterDto } from './dto/create-chapter.dto.js';
import type { UpdateChapterDto } from './dto/update-chapter.dto.js';
import { ChapterRepo } from './repositories/chapters.repo.js';

@Injectable()
export class ChapterService {
  constructor(
    private readonly chapterRepo: ChapterRepo,
    private readonly mangaRepo: MangaRepo,
  ) {}

  async findAll(): Promise<Chapters[]> {
    return this.chapterRepo.findAll();
  }

  async findById(id: string): Promise<Chapters> {
    const chapter = await this.chapterRepo.findById(id);
    if (!chapter) {
      throw new BusinessException(ErrorCode.CHAPTER_NOT_FOUND, {
        resourceId: id,
      });
    }
    return chapter;
  }

  async findByMangaId(mangaId: string): Promise<Chapters[]> {
    const manga = await this.mangaRepo.findById(mangaId);
    if (!manga) {
      throw new BusinessException(ErrorCode.MANGA_NOT_FOUND, {
        resourceId: mangaId,
      });
    }
    return this.chapterRepo.findByMangaId(mangaId);
  }

  async findPaginated(
    mangaId: string,
    page: number,
    limit: number,
    status?: ChapterStatus,
  ): Promise<{
    data: Chapters[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const manga = await this.mangaRepo.findById(mangaId);
    if (!manga) {
      throw new BusinessException(ErrorCode.MANGA_NOT_FOUND, {
        resourceId: mangaId,
      });
    }
    const { data, total } = await this.chapterRepo.findPaginated(
      mangaId,
      page,
      limit,
      status,
    );
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createChapter(dto: CreateChapterDto): Promise<Chapters> {
    const manga = await this.mangaRepo.findById(dto.mangaId);
    if (!manga) {
      throw new BusinessException(ErrorCode.MANGA_NOT_FOUND, {
        resourceId: dto.mangaId,
      });
    }

    try {
      return await this.chapterRepo.create(dto);
    } catch (error) {
      if (!(error instanceof QueryFailedError)) {
        throw error;
      }

      const { code, constraint } = error.driverError as {
        code?: string;
        constraint?: string;
      };
      if (code === '23505' && constraint === 'uq_chapters_manga_number') {
        throw new BusinessException(ErrorCode.CHAPTER_NUMBER_ALREADY_EXISTS, {
          cause: error,
        });
      }
      if (code === '23503' && constraint === 'fk_chapters_manga') {
        throw new BusinessException(ErrorCode.MANGA_NOT_FOUND, {
          resourceId: dto.mangaId,
          cause: error,
        });
      }
      throw error;
    }
  }

  async updateById(id: string, dto: UpdateChapterDto): Promise<Chapters> {
    const chapter = await this.findById(id);
    if (Object.keys(dto).length === 0) {
      return chapter;
    }
    if (dto.mangaId !== undefined && dto.mangaId !== chapter.mangaId) {
      const manga = await this.mangaRepo.findById(dto.mangaId);
      if (!manga) {
        throw new BusinessException(ErrorCode.MANGA_NOT_FOUND, {
          resourceId: dto.mangaId,
        });
      }
    }

    try {
      const result = await this.chapterRepo.updateById(id, dto);
      if (result.affected === 0) {
        throw new BusinessException(ErrorCode.CHAPTER_NOT_FOUND, {
          resourceId: id,
        });
      }
    } catch (error) {
      if (!(error instanceof QueryFailedError)) {
        throw error;
      }

      const { code, constraint } = error.driverError as {
        code?: string;
        constraint?: string;
      };
      if (code === '23505' && constraint === 'uq_chapters_manga_number') {
        throw new BusinessException(ErrorCode.CHAPTER_NUMBER_ALREADY_EXISTS, {
          resourceId: id,
          cause: error,
        });
      }
      if (code === '23503' && constraint === 'fk_chapters_manga') {
        throw new BusinessException(ErrorCode.MANGA_NOT_FOUND, {
          resourceId: dto.mangaId ?? chapter.mangaId,
          cause: error,
        });
      }
      throw error;
    }
    return this.findById(id);
  }

  async deleteById(id: string): Promise<void> {
    const result = await this.chapterRepo.deleteById(id);
    if (result.affected === 0) {
      throw new BusinessException(ErrorCode.CHAPTER_NOT_FOUND, {
        resourceId: id,
      });
    }
  }
}
