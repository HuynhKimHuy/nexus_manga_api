import type {} from 'multer';
import { randomUUID } from 'node:crypto';
import { R2StorageService } from '../storage/r2-storage-service.js';
import { Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '../../common/exeptions/bussines.exeption.js';
import { ErrorCode } from '../../common/filter/errors/error-code.js';
import { QueryFailedError } from 'typeorm';
import { Mangas, MangaStatus } from './mangas.entity.js';
import { MangaRepo } from './mangas.repo.js';
import { CreateMangaDto } from './dto/create-manga.dto.js';

import type { UpdateMangaDto } from './dto/update-manga.dto.js';

@Injectable()
export class MangaService {
  private readonly logger = new Logger(MangaService.name);
  constructor(
    private readonly mangaRepo: MangaRepo,
    private readonly storage: R2StorageService,
  ) {}

  async findAll(): Promise<Mangas[]> {
    return this.mangaRepo.findAll();
  }

  async findById(id: string): Promise<Mangas> {
    const manga = await this.mangaRepo.findById(id);
    if (!manga) {
      throw new BusinessException(ErrorCode.MANGA_NOT_FOUND, {
        resourceId: id,
      });
    }
    return manga;
  }

  async createManga(
    dto: CreateMangaDto,
    legacyCover?: Express.Multer.File,
  ): Promise<Mangas> {

    if (legacyCover) {
      const cover = await this.uploadCoverFile(legacyCover);
      try {
        return await this.mangaRepo.create({ ...dto, coverImage: cover.url });
      } catch (error) {
        await this.deleteCover(cover.key);
        this.rethrowWriteError(error);
      }
    }
    try {
      return await this.mangaRepo.create(dto);
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async uploadCover(id: string, file: Express.Multer.File): Promise<Mangas> {
    const manga = await this.findById(id);
    const cover = await this.uploadCoverFile(file);

    try {
      await this.mangaRepo.updateById(id, { coverImage: cover.url });
      return this.findById(id);
    } catch (error) {
      await this.deleteCover(cover.key);
      throw error;
    }
  }

  async findPaginated(
    page: number,
    limit: number,
    status?: MangaStatus,
    search?: string,
  ): Promise<{
    data: Mangas[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { data, total } = await this.mangaRepo.findPaginated(
      page,
      limit,
      status,
      search,
    );
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async updateById(id: string, data: UpdateMangaDto): Promise<Mangas> {
    const manga = await this.mangaRepo.findById(id);
    if (!manga) {
      throw new BusinessException(ErrorCode.MANGA_NOT_FOUND, {
        resourceId: id,
      });
    }
    const updateData = { ...data };
    if (updateData.slug === manga.slug) {
      delete updateData.slug;
    }
    if (Object.keys(updateData).length === 0) {
      return manga;
    }
    const result = await this.mangaRepo
      .updateById(id, updateData)
      .catch((error: unknown) => {
        this.rethrowWriteError(error, id);
      });
    if (result.affected === 0) {
      throw new BusinessException(ErrorCode.MANGA_NOT_FOUND, {
        resourceId: id,
      });
    }
    return this.findById(id);
  }

  private async uploadCoverFile(file: Express.Multer.File) {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const extension = extensions[file.mimetype];
    if (!extension) {
      throw new Error('Unsupported cover image type');
    }

    const key = `mangas/covers/${randomUUID()}.${extension}`;
    const url = await this.storage.uploadObject(
      key,
      file.buffer,
      file.mimetype,
    );
    return { key, url };
  }

  private async deleteCover(key: string): Promise<void> {
    try {
      await this.storage.deleteObject(key);
    } catch {
      this.logger.error(`Failed to clean up manga cover: ${key}`);
    }
  }

  private rethrowWriteError(error: unknown, resourceId?: string): never {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as {
        code?: string;
        constraint?: string;
      };
      // Match the slug constraint created by the existing migration, not other unique violations.
      if (
        driverError.code === '23505' &&
        driverError.constraint === 'tbl_mangas_slug_key'
      ) {
        throw new BusinessException(ErrorCode.MANGA_SLUG_ALREADY_EXISTS, {
          resourceId,
          cause: error,
        });
      }
    }
    throw error;
  }
}
