import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  type QueryDeepPartialEntity,
  type UpdateResult,
} from 'typeorm';
import { Mangas, MangaStatus } from './mangas.entity.js';
import { CreateMangaDto } from './dto/create-manga.dto.js';

@Injectable()
export class MangaRepo {
  constructor(
    @InjectRepository(Mangas)
    private readonly mangaRepo: Repository<Mangas>,
  ) {}

  async findAll(): Promise<Mangas[]> {
    return this.mangaRepo.find();
  }

  async findById(id: string): Promise<Mangas | null> {
    return this.mangaRepo.findOneBy({ id });
  }

  async create(dto: CreateMangaDto): Promise<Mangas> {
    const manga = this.mangaRepo.create(dto);
    return this.mangaRepo.save(manga);
  }

  async findPaginated(
    page: number,
    limit: number,
    status?: MangaStatus,
    search?: string,
  ): Promise<{ data: Mangas[]; total: number }> {
    const qb = this.mangaRepo.createQueryBuilder('manga');
    if (status) {
      qb.where('manga.status = :status', {
        status,
      });
    }
    if (search) {
      qb.andWhere('manga.title ILIKE :search', {
        search: `%${search}%`,
      });
    }
    const [data, total] = await qb
      .orderBy('manga.createdAt', 'DESC')
      .addOrderBy('manga.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total };
  }

  async updateById(
    id: string,
    data: QueryDeepPartialEntity<Mangas>,
  ): Promise<UpdateResult> {
    return this.mangaRepo.update(id, data);
  }
}
