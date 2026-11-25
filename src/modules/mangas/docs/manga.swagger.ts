import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiCommonErrors } from '../../../common/swagger/api-errors.decorator.js';
import { apiErrorResponseSchema } from '../../../common/filter/errors/api-error.schema.js';
import {
  mangaResponseSchema,
  paginatedMangasResponseSchema,
} from '../dto/manga-response.schema.js';

export function ApiMangaControllerDocs() {
  return applyDecorators(ApiTags('Mangas'), ApiCommonErrors());
}

export function ApiListMangasDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List mangas with pagination and filters',
      description:
        'Filter by status or search by title (case-insensitive substring). Unknown query parameters are rejected.',
    }),
    ApiOkResponse({
      description: 'Manga page and pagination metadata.',
      standardSchema: paginatedMangasResponseSchema,
    }),
  );
}

export function ApiGetMangaDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a manga by ID' }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Manga UUID' }),
    ApiOkResponse({ standardSchema: mangaResponseSchema }),
    ApiNotFoundResponse({
      description: 'MANGA_NOT_FOUND',
      standardSchema: apiErrorResponseSchema,
    }),
  );
}

export function ApiCreateMangaDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a manga',
      description:
        'Create manga details. Upload the cover separately with POST /mangas/:id/cover.',
    }),
    ApiCreatedResponse({ standardSchema: mangaResponseSchema }),
    ApiConflictResponse({
      description: 'MANGA_SLUG_ALREADY_EXISTS',
      standardSchema: apiErrorResponseSchema,
    }),
  );
}

export function ApiUploadMangaCoverDocs() {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['coverImage'],
        properties: { coverImage: { type: 'string', format: 'binary' } },
      },
    }),
    ApiOperation({ summary: 'Upload a manga cover image' }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Manga UUID' }),
    ApiOkResponse({ standardSchema: mangaResponseSchema }),
    ApiPayloadTooLargeResponse({
      description: 'Cover image exceeds 5 MiB.',
      standardSchema: apiErrorResponseSchema,
    }),
  );
}

export function ApiUpdateMangaDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update a manga',
      description: 'Provide at least one field to update.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Manga UUID' }),
    ApiOkResponse({ standardSchema: mangaResponseSchema }),
    ApiNotFoundResponse({
      description: 'MANGA_NOT_FOUND',
      standardSchema: apiErrorResponseSchema,
    }),
    ApiConflictResponse({
      description: 'MANGA_SLUG_ALREADY_EXISTS',
      standardSchema: apiErrorResponseSchema,
    }),
  );
}
