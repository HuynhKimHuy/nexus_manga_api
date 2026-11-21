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
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { BusinessException } from '../../common/exeptions/bussines.exeption.js';
import { apiErrorResponseSchema } from '../../common/filter/errors/api-error.schema.js';
import { ErrorCode } from '../../common/filter/errors/error-code.js';
import { ChapterService } from './chapter.service.js';
import {
  chapterResponseSchema,
  paginatedChaptersResponseSchema,
} from './dto/chapter-response.schema.js';
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

@Controller('mangas/:mangaId/chapters')
@ApiTags('Chapters')
@ApiParam({ name: 'mangaId', format: 'uuid', description: 'Manga UUID' })
@ApiBadRequestResponse({
  description:
    'VALIDATION_FAILED for invalid input, or BAD_REQUEST for an invalid UUID.',
  standardSchema: apiErrorResponseSchema,
})
@ApiNotFoundResponse({
  description: 'MANGA_NOT_FOUND or CHAPTER_NOT_FOUND',
  standardSchema: apiErrorResponseSchema,
})
@ApiInternalServerErrorResponse({
  description: 'INTERNAL_ERROR',
  standardSchema: apiErrorResponseSchema,
})
export class ChapterController {
  constructor(private readonly chapterService: ChapterService) {}

  @Get()
  @ApiOperation({
    summary: 'List chapters of a manga with pagination and status filter',
  })
  @ApiOkResponse({ standardSchema: paginatedChaptersResponseSchema })
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
  @ApiOperation({ summary: 'Get a chapter of a manga' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Chapter UUID' })
  @ApiOkResponse({ standardSchema: chapterResponseSchema })
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
  @ApiOperation({
    summary: 'Create a chapter in a manga',
    description:
      'Manga ID comes from the URL. Number is a decimal string. Status defaults to draft.',
  })
  @ApiCreatedResponse({ standardSchema: chapterResponseSchema })
  @ApiConflictResponse({
    description: 'CHAPTER_NUMBER_ALREADY_EXISTS',
    standardSchema: apiErrorResponseSchema,
  })
  create(
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
    @Body({ schema: createChapterBodySchema }) dto: CreateChapterBodyDto,
  ) {
    return this.chapterService.createChapter({ ...dto, mangaId });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a chapter of a manga',
    description: 'Provide at least one field. Manga ID comes from the URL.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Chapter UUID' })
  @ApiOkResponse({ standardSchema: chapterResponseSchema })
  @ApiConflictResponse({
    description: 'CHAPTER_NUMBER_ALREADY_EXISTS',
    standardSchema: apiErrorResponseSchema,
  })
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
  @ApiOperation({ summary: 'Delete a chapter of a manga' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Chapter UUID' })
  @ApiNoContentResponse({ description: 'Chapter deleted.' })
  async deleteById(
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.findById(mangaId, id);
    await this.chapterService.deleteById(id);
  }
}
