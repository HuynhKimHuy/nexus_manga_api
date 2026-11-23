import { applyDecorators } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { apiErrorResponseSchema } from '../filter/errors/api-error.schema.js';

export function ApiAppControllerDocs() {
  return applyDecorators(ApiTags('App'));
}

export function ApiHealthDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Check API health' }),
    ApiProduces('application/json'),
    ApiOkResponse({
      description: 'The API is running',
      example: {
        status: 'ok',
        timestamp: '2026-11-22T12:00:00.000Z',
        uptimeSeconds: 42,
      },
    }),
  );
}

export function ApiGreetingDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get the API greeting' }),
    ApiProduces('text/html'),
    ApiOkResponse({ type: String, example: 'Hello World!' }),
  );
}

export function ApiDatabaseHealthDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Check the database connection' }),
    ApiOkResponse({
      standardSchema: z.array(z.object({ result: z.number().int() })),
      example: [{ result: 1 }],
    }),
    ApiInternalServerErrorResponse({
      description: 'INTERNAL_ERROR',
      standardSchema: apiErrorResponseSchema,
    }),
  );
}
