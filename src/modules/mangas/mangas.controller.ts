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
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { apiErrorResponseSchema } from '../../common/filter/errors/api-error.schema.js';
import {
  mangaResponseSchema,
  paginatedMangasResponseSchema,
} from './dto/manga-response.schema.js';
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
@ApiTags('Mangas')
@ApiBadRequestResponse({
  description:
    'VALIDATION_FAILED for invalid input, or BAD_REQUEST for an invalid UUID.',
  standardSchema: apiErrorResponseSchema,
})
@ApiInternalServerErrorResponse({
  description: 'INTERNAL_ERROR',
  standardSchema: apiErrorResponseSchema,
})
export class MangaController {
  constructor(private readonly mangaService: MangaService) {}

  @Get()
  @ApiOperation({
    summary: 'List mangas with pagination and filters',
    description:
      'Filter by status or search by title (case-insensitive substring). Unknown query parameters are rejected.',
  })
  @ApiOkResponse({
    description: 'Manga page and pagination metadata.',
    standardSchema: paginatedMangasResponseSchema,
  })
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
  @ApiOperation({ summary: 'Get a manga by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Manga UUID' })
  @ApiOkResponse({ standardSchema: mangaResponseSchema })
  @ApiNotFoundResponse({
    description: 'MANGA_NOT_FOUND',
    standardSchema: apiErrorResponseSchema,
  })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.mangaService.findById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a manga',
    description:
      'Title and slug are required. Status defaults to ongoing. Unknown fields and null values are rejected.',
  })
  @ApiCreatedResponse({ standardSchema: mangaResponseSchema })
  @ApiConflictResponse({
    description: 'MANGA_SLUG_ALREADY_EXISTS',
    standardSchema: apiErrorResponseSchema,
  })
  create(@Body({ schema: createMangaSchema }) dto: CreateMangaDto) {
    return this.mangaService.createManga(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a manga',
    description: 'Provide at least one field to update.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Manga UUID' })
  @ApiOkResponse({ standardSchema: mangaResponseSchema })
  @ApiNotFoundResponse({
    description: 'MANGA_NOT_FOUND',
    standardSchema: apiErrorResponseSchema,
  })
  @ApiConflictResponse({
    description: 'MANGA_SLUG_ALREADY_EXISTS',
    standardSchema: apiErrorResponseSchema,
  })
  updateById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: updateMangaSchema }) dto: UpdateMangaDto,
  ) {
    return this.mangaService.updateById(id, dto);
  }
}
