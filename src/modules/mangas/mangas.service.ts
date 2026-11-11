import { Injectable } from '@nestjs/common';
import { BusinessException } from '../../common/exeptions/bussines.exeption.js';
import { ErrorCode } from '../../common/filter/errors/error-code.js';
import { QueryFailedError } from 'typeorm';
import { Mangas, MangaStatus } from './mangas.entity.js';
import { MangaRepo } from './mangas.repo.js';
import { CreateMangaDto } from './dto/create-manga.dto.js';

import type { UpdateMangaDto } from './dto/update-manga.dto.js';

@Injectable()
export class MangaService {
  constructor(private readonly mangaRepo: MangaRepo) {}

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

  async createManga(dto: CreateMangaDto): Promise<Mangas> {
    try {
      return await this.mangaRepo.create(dto);
    } catch (error) {
      this.rethrowWriteError(error);
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
