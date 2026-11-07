import { Injectable, NotFoundException } from '@nestjs/common';
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
      throw new NotFoundException('manga not found');
    }
    return manga;
  }

  async createManga(dto: CreateMangaDto): Promise<Mangas> {
    return this.mangaRepo.create(dto);
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
      throw new NotFoundException('manga not found');
    }
    const updateData = { ...data };
    if (updateData.slug === manga.slug) {
      delete updateData.slug;
    }
    if (Object.keys(updateData).length === 0) {
      return manga;
    }
    const result = await this.mangaRepo.updateById(id, updateData);
    if (result.affected === 0) {
      throw new NotFoundException('manga not found');
    }
    return this.findById(id);
  }
}
