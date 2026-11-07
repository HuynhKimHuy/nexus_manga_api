import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { MangaService } from './mangas.service.js';
import {
  createMangaSchema,
  type CreateMangaDto,
} from './dto/create-manga.dto.js';
import {
  paginationQuerySchema,
  type PaginationQueryDto,
} from './dto/pagination-query.dto.js';
import {
  updateMangaSchema,
  type UpdateMangaDto,
} from './dto/update-manga.dto.js';

@Controller('mangas')
export class MangaController {
  constructor(private readonly mangaService: MangaService) {}

  @Get()
  findPaginated(
    @Query({ schema: paginationQuerySchema }) query: PaginationQueryDto,
  ) {
    return this.mangaService.findPaginated(
      query.page,
      query.limit,
      query.status,
      query.search,
    );
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.mangaService.findById(id);
  }

  @Post()
  create(@Body({ schema: createMangaSchema }) dto: CreateMangaDto) {
    return this.mangaService.createManga(dto);
  }

  @Patch(':id')
  updateById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: updateMangaSchema }) dto: UpdateMangaDto,
  ) {
    return this.mangaService.updateById(id, dto);
  }
}
