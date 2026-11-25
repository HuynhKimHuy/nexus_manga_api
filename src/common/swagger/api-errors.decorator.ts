import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { apiErrorResponseSchema } from '../filter/errors/api-error.schema.js';

export function ApiCommonErrors() {
  return applyDecorators(
    ApiBadRequestResponse({
      description:
        'VALIDATION_FAILED for invalid input, or BAD_REQUEST for an invalid UUID.',
      standardSchema: apiErrorResponseSchema,
    }),
    ApiInternalServerErrorResponse({
      description: 'INTERNAL_ERROR',
      standardSchema: apiErrorResponseSchema,
    }),
  );
}
