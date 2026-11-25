import type {} from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  Body,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
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
import {
  ApiCreateMangaDocs,
  ApiGetMangaDocs,
  ApiListMangasDocs,
  ApiMangaControllerDocs,
  ApiUpdateMangaDocs,
  ApiUploadMangaCoverDocs,
} from './docs/manga.swagger.js';

const MAX_COVER_SIZE = 5 * 1024 * 1024;

@Controller('mangas')
@ApiMangaControllerDocs()
export class MangaController {
  constructor(private readonly mangaService: MangaService) {}
  //Find manga
  @Get()
  @ApiListMangasDocs()
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
  //Find By ID
  @Get(':id')
  @ApiGetMangaDocs()
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.mangaService.findById(id);
  }

  // Create manga
  @Post()
  @ApiCreateMangaDocs()
  create(@Body({ schema: createMangaSchema }) dto: CreateMangaDto) {
    return this.mangaService.createManga(dto);
  }

  // Upload manga cover
  @Post(':id/cover')
  @UseInterceptors(
    FileInterceptor('coverImage', {
      limits: { fileSize: MAX_COVER_SIZE, files: 1, fields: 0 },
    }),
  )
  @ApiUploadMangaCoverDocs()
  uploadCover(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    if (!coverImage) {
      throw new BadRequestException('coverImage file is required.');
    }
    return this.mangaService.uploadCover(id, coverImage);
  }

  //upload manga
  @Patch(':id')
  @ApiUpdateMangaDocs()
  updateById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: updateMangaSchema }) dto: UpdateMangaDto,
  ) {
    return this.mangaService.updateById(id, dto);
  }
}
