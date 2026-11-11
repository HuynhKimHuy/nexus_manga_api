import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.js';

export const ErrorCatalog = {
  // Fallback definition; the filter preserves the exception's actual HTTP status.
  [ErrorCode.HTTP_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'HTTP error',
  },
  [ErrorCode.MANGA_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Manga not found',
  },

  [ErrorCode.MANGA_SLUG_ALREADY_EXISTS]: {
    status: HttpStatus.CONFLICT,
    message: 'Manga slug already exists',
  },

  [ErrorCode.BAD_REQUEST]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Bad request',
  },

  [ErrorCode.VALIDATION_FAILED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Validation failed',
  },

  [ErrorCode.UNAUTHORIZED]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Unauthorized',
  },
  [ErrorCode.FORBIDDEN]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Forbidden',
  },

  [ErrorCode.NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Not found',
  },

  [ErrorCode.METHOD_NOT_ALLOWED]: {
    status: HttpStatus.METHOD_NOT_ALLOWED,
    message: 'Method not allowed',
  },

  [ErrorCode.CONFLICT]: {
    status: HttpStatus.CONFLICT,
    message: 'Conflict',
  },

  [ErrorCode.PAYLOAD_TOO_LARGE]: {
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    message: 'Payload too large',
  },

  [ErrorCode.UNSUPPORTED_MEDIA_TYPE]: {
    status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    message: 'Unsupported media type',
  },

  [ErrorCode.TOO_MANY_REQUESTS]: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: 'Too many requests',
  },

  [ErrorCode.INTERNAL_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  },

  [ErrorCode.SERVICE_UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'Service unavailable',
  },
} satisfies Record<ErrorCode, { status: number; message: string }>;
