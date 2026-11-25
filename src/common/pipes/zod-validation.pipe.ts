import { Injectable, StandardSchemaValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { ZodType } from 'zod';
import { BusinessException } from '../exeptions/bussines.exeption.js';
import { ErrorCode } from '../filter/errors/error-code.js';

@Injectable()
export class ZodValidationPipe extends StandardSchemaValidationPipe {
  protected override async validate<T = unknown>(
    value: unknown,
    schema: NonNullable<ArgumentMetadata['schema']>,
    options?: Record<string, unknown>,
  ) {
    if (!(schema instanceof ZodType)) {
      return super.validate<T>(value, schema, options);
    }

    const result = await schema.safeParseAsync(value);
    if (!result.success) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, {
        cause: result.error,
        details: result.error.issues.map((issue) => ({
          field: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      });
    }

    return { value: result.data as T };
  }
}
