import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiCommonErrors } from '../../../common/swagger/api-errors.decorator.js';
import { apiErrorResponseSchema } from '../../../common/filter/errors/api-error.schema.js';
import {
  chapterResponseSchema,
  paginatedChaptersResponseSchema,
} from '../dto/chapter-response.schema.js';

export function ApiChapterControllerDocs() {
  return applyDecorators(
    ApiTags('Chapters'),
    ApiParam({ name: 'mangaId', format: 'uuid', description: 'Manga UUID' }),
    ApiCommonErrors(),
    ApiNotFoundResponse({
      description: 'MANGA_NOT_FOUND or CHAPTER_NOT_FOUND',
      standardSchema: apiErrorResponseSchema,
    }),
  );
}

export function ApiListChaptersDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List chapters of a manga with pagination and status filter',
    }),
    ApiOkResponse({ standardSchema: paginatedChaptersResponseSchema }),
  );
}

export function ApiGetChapterDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a chapter of a manga' }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Chapter UUID' }),
    ApiOkResponse({ standardSchema: chapterResponseSchema }),
  );
}

export function ApiCreateChapterDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a chapter in a manga',
      description:
        'Manga ID comes from the URL. Number is a decimal string. Status defaults to draft.',
    }),
    ApiCreatedResponse({ standardSchema: chapterResponseSchema }),
    ApiConflictResponse({
      description: 'CHAPTER_NUMBER_ALREADY_EXISTS',
      standardSchema: apiErrorResponseSchema,
    }),
  );
}

export function ApiUpdateChapterDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update a chapter of a manga',
      description: 'Provide at least one field. Manga ID comes from the URL.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Chapter UUID' }),
    ApiOkResponse({ standardSchema: chapterResponseSchema }),
    ApiConflictResponse({
      description: 'CHAPTER_NUMBER_ALREADY_EXISTS',
      standardSchema: apiErrorResponseSchema,
    }),
  );
}

export function ApiDeleteChapterDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a chapter of a manga' }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Chapter UUID' }),
    ApiNoContentResponse({ description: 'Chapter deleted.' }),
  );
}

export function ApiChapterPagesControllerDocs() {
  return applyDecorators(ApiTags('Chapter pages'));
}

export function ApiUploadChapterPagesDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Upload pages sorted naturally by filename' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['images'],
        properties: {
          images: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
          },
          startPage: { type: 'integer', minimum: 1, default: 1 },
        },
      },
    }),
  );
}

export function ApiImportChapterPagesDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Import CBZ pages into a draft chapter' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['archive'],
        properties: {
          archive: { type: 'string', format: 'binary' },
          startPage: { type: 'integer', minimum: 1, default: 1 },
        },
      },
    }),
  );
}

export function ApiUploadChapterPageDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Upload a page at an explicit reading position' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['image'],
        properties: { image: { type: 'string', format: 'binary' } },
      },
    }),
  );
}

export function ApiListChapterPagesDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get chapter pages in reading order' }),
  );
}
