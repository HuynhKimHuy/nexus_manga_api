import { HttpException } from '@nestjs/common';
import type { ErrorCode } from '../filter/errors/error-code.js';
import { ErrorCatalog } from '../filter/errors/error.catalog.js';
import type { ApiError } from '../filter/errors/api-response.errors.js';

interface BusinessExceptionOptions {
  resourceId?: string;
  cause?: Error;
  details?: ApiError['details'];
}

export class BusinessException extends HttpException {
  readonly code: ErrorCode;
  readonly resourceId?: string;
  readonly details?: ApiError['details'];

  constructor(code: ErrorCode, options: BusinessExceptionOptions = {}) {
    const definition = ErrorCatalog[code];
    super(definition.message, definition.status, {
      cause: options.cause,
    });

    this.code = code;
    this.resourceId = options.resourceId;
    this.details = options.details;
  }
}
