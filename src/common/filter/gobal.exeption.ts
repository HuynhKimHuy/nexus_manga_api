import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { BusinessException } from '../exeptions/bussines.exeption.js';
import type { Requestwithcontext } from '../middleware/RequestExeptionMiddleware.js';
import type {
  ApiError,
  ApiErrorResponse,
} from './errors/api-response.errors.js';
import { ErrorCode } from './errors/error-code.js';
import { ErrorCatalog } from './errors/error.catalog.js';

const httpErrorCodes: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.METHOD_NOT_ALLOWED]: ErrorCode.METHOD_NOT_ALLOWED,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: ErrorCode.UNSUPPORTED_MEDIA_TYPE,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
  [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_ERROR,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
};

@Catch()
export class GobalExeptionfilter implements ExceptionFilter {
  private readonly logger = new Logger(GobalExeptionfilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Requestwithcontext>();
    const res = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestId = (req.requestId ??= randomUUID());
    const path = (req.originalUrl || req.url).split('?')[0];

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        // Raw URLs, exception messages and stacks can contain credentials or SQL parameters.
        `${req.method} ${status} requestId=${requestId}`,
      );
    }

    if (res.headersSent) {
      return;
    }

    const body: ApiErrorResponse = {
      statusCode: status,
      error: this.getError(exception, status),
      requestId,
      timestamp: new Date().toISOString(),
      path,
    };

    res.setHeader('X-Request-ID', requestId);
    res.status(status).json(body);
  }

  private getError(exception: unknown, status: number): ApiError {
    if (exception instanceof BusinessException) {
      return {
        code: exception.code,
        message: ErrorCatalog[exception.code].message,
        ...(status < HttpStatus.INTERNAL_SERVER_ERROR && exception.details
          ? { details: exception.details }
          : {}),
      };
    }

    const fallbackCode =
      status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? ErrorCode.INTERNAL_ERROR
        : ErrorCode.HTTP_ERROR;
    const code = httpErrorCodes[status] ?? fallbackCode;
    const error: ApiError = { code, message: ErrorCatalog[code].message };

    if (!(exception instanceof HttpException)) return error;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) return error;

    const response = exception.getResponse();
    if (typeof response === 'string') return { code, message: response };
    if (!('message' in response)) return error;

    const message: unknown = response.message;
    if (typeof message === 'string') return { code, message };
    if (!Array.isArray(message)) return error;

    const messages = message.filter(
      (item): item is string => typeof item === 'string',
    );
    if (messages.length === 0) return error;
    return { code, message: messages.join('; ') };
  }
}
