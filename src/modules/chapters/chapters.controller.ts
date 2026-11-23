import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BusinessException } from '../../common/exeptions/bussines.exeption.js';
import { ErrorCode } from '../../common/filter/errors/error-code.js';
import { ChapterService } from './chapter.service.js';
import {
  createChapterBodySchema,
  type CreateChapterBodyDto,
} from './dto/create-chapter.dto.js';
import {
  chapterPaginationQuerySchema,
  type ChapterPaginationQueryDto,
} from './dto/pagination-query.dto.js';
import {
  updateChapterBodySchema,
  type UpdateChapterBodyDto,
} from './dto/update-chapter.dto.js';
import {
  ApiChapterControllerDocs,
  ApiCreateChapterDocs,
  ApiDeleteChapterDocs,
  ApiGetChapterDocs,
  ApiListChaptersDocs,
  ApiUpdateChapterDocs,
} from './docs/chapter.swagger.js';

@Controller('mangas/:mangaId/chapters')
@ApiChapterControllerDocs()
export class ChapterController {
  constructor(private readonly chapterService: ChapterService) {}

  @Get()
  @ApiListChaptersDocs()
  findPaginated(
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
    @Query({ schema: chapterPaginationQuerySchema })
    query: ChapterPaginationQueryDto,
  ) {
    return this.chapterService.findPaginated(
      mangaId,
      query.page,
      query.limit,
      query.status,
    );
  }

  @Get(':id')
  @ApiGetChapterDocs()
  async findById(
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const chapter = await this.chapterService.findById(id);
    if (chapter.mangaId.toLowerCase() !== mangaId.toLowerCase()) {
      throw new BusinessException(ErrorCode.CHAPTER_NOT_FOUND, {
        resourceId: id,
      });
    }
    return chapter;
  }

  @Post()
  @ApiCreateChapterDocs()
  create(
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
    @Body({ schema: createChapterBodySchema }) dto: CreateChapterBodyDto,
  ) {
    return this.chapterService.createChapter({ ...dto, mangaId });
  }

  @Patch(':id')
  @ApiUpdateChapterDocs()
  async updateById(
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: updateChapterBodySchema }) dto: UpdateChapterBodyDto,
  ) {
    await this.findById(mangaId, id);
    return this.chapterService.updateById(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteChapterDocs()
  async deleteById(
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.findById(mangaId, id);
    await this.chapterService.deleteById(id);
  }
}
