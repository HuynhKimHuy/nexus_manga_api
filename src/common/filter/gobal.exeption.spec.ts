import {
  BadRequestException,
  HttpException,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { vi } from 'vitest';
import { z } from 'zod';
import { BusinessException } from '../exeptions/bussines.exeption.js';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe.js';
import { ErrorCode } from './errors/error-code.js';
import type { ApiErrorResponse } from './errors/api-response.errors.js';
import { GobalExeptionfilter } from './gobal.exeption.js';

describe('GobalExeptionfilter', () => {
  const filter = new GobalExeptionfilter();
  const errorLog = vi.fn<Logger['error']>();

  function respond(
    exception: unknown,
    requestId: string | null = 'req-123',
    headersSent = false,
  ) {
    const request = {
      method: 'GET',
      originalUrl:
        '/mangas/missing?token=secret-token&password=secret-password',
      requestId: requestId ?? undefined,
    };
    const response = {
      headersSent,
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn<(body: ApiErrorResponse) => void>(),
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
    filter.catch(exception, host);
    return { response, request, body: response.json.mock.calls[0]?.[0] };
  }

  beforeEach(() => {
    errorLog.mockReset();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(errorLog);
  });
  afterEach(() => vi.restoreAllMocks());

  it('preserves business codes and the full error response contract', () => {
    const { response, body } = respond(
      new BusinessException(ErrorCode.MANGA_NOT_FOUND, {
        resourceId: 'missing',
      }),
    );
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.setHeader).toHaveBeenCalledWith('X-Request-ID', 'req-123');
    expect(body).toEqual({
      statusCode: 404,
      error: { code: 'MANGA_NOT_FOUND', message: 'Manga not found' },
      requestId: 'req-123',
      timestamp: expect.any(String),
      path: '/mangas/missing',
    });
    expect(Number.isNaN(Date.parse(body!.timestamp))).toBe(false);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'BAD_REQUEST'],
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [405, 'METHOD_NOT_ALLOWED'],
    [409, 'CONFLICT'],
    [413, 'PAYLOAD_TOO_LARGE'],
    [415, 'UNSUPPORTED_MEDIA_TYPE'],
    [429, 'TOO_MANY_REQUESTS'],
    [500, 'INTERNAL_ERROR'],
    [503, 'SERVICE_UNAVAILABLE'],
    [418, 'HTTP_ERROR'],
    [499, 'HTTP_ERROR'],
    [502, 'INTERNAL_ERROR'],
  ])(
    'maps HTTP status %i to %s without changing the status',
    (status, code) => {
      const { response, body } = respond(
        new HttpException('Public message', status),
      );
      expect(response.status).toHaveBeenCalledWith(status);
      expect(body?.error.code).toBe(code);
      expect(body?.error.message).toBe(
        status >= 500
          ? status === 503
            ? 'Service unavailable'
            : 'Internal server error'
          : 'Public message',
      );
    },
  );

  it('keeps ordinary BadRequestException message arrays distinct from Zod', () => {
    const { body } = respond(
      new BadRequestException(['title: Required', 'Invalid body']),
    );
    expect(body?.error).toEqual({
      code: 'BAD_REQUEST',
      message: 'title: Required; Invalid body',
    });
  });

  it('keeps ParseUUIDPipe errors as BAD_REQUEST', async () => {
    const exception = await new ParseUUIDPipe()
      .transform('invalid', { type: 'param' })
      .catch((error: unknown) => error);
    const { body } = respond(exception);
    expect(body?.statusCode).toBe(400);
    expect(body?.error.code).toBe('BAD_REQUEST');
    expect(body?.error.details).toBeUndefined();
  });

  it('renders Zod details from actual nested and array issue paths', async () => {
    const schema = z.object({
      profile: z.object({ name: z.string() }),
      items: z.array(z.object({ title: z.string() })),
    });
    const exception = await new ZodValidationPipe()
      .transform(
        { profile: { name: 1 }, items: [{ title: 2 }] },
        { type: 'body', schema },
      )
      .catch((error: unknown) => error);
    const { body } = respond(exception);
    expect(body?.statusCode).toBe(400);
    expect(body?.error).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      details: [
        { field: 'profile.name', message: expect.any(String) },
        { field: 'items.0.title', message: expect.any(String) },
      ],
    });
    expect(JSON.stringify(body)).not.toContain('stack');
    expect(JSON.stringify(body)).not.toContain('cause');
  });

  it.each([
    new Error('password=secret-password token=secret-token'),
    new HttpException('password=secret-password', 500),
    'secret-password',
    null,
    undefined,
    { password: 'secret-password' },
  ])(
    'returns a safe 500 for an unknown or server exception: %j',
    (exception) => {
      const { response, body } = respond(exception);
      expect(response.status).toHaveBeenCalledWith(500);
      expect(body?.error).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
      const output = JSON.stringify(body);
      expect(output).not.toMatch(/stack|cause|secret-password|secret-token/);
      expect(errorLog).toHaveBeenCalledExactlyOnceWith(
        'GET 500 requestId=req-123',
      );
    },
  );

  it('does not expose business 5xx causes or details', () => {
    const { body } = respond(
      new BusinessException(ErrorCode.SERVICE_UNAVAILABLE, {
        cause: new Error('secret-password'),
        details: [{ field: 'password', message: 'secret-password' }],
      }),
    );
    expect(body?.statusCode).toBe(503);
    expect(body?.error).toEqual({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service unavailable',
    });
  });

  it('falls back to catalog messages when HTTP response messages are absent or invalid', () => {
    for (const response of [{}, { message: [null, 123] }, { message: 123 }]) {
      expect(respond(new HttpException(response, 400)).body?.error).toEqual({
        code: 'BAD_REQUEST',
        message: 'Bad request',
      });
    }
  });

  it('creates one matching request ID for request, header, body and error logging', () => {
    const { request, response, body } = respond(new Error('private'), null);
    const generated = body!.requestId;
    expect(generated).toMatch(/^[0-9a-f-]{36}$/);
    expect(request.requestId).toBe(generated);
    expect(response.setHeader).toHaveBeenLastCalledWith(
      'X-Request-ID',
      generated,
    );
    expect(errorLog).toHaveBeenCalledExactlyOnceWith(
      `GET 500 requestId=${generated}`,
    );
  });

  it('avoids writing when headers are already sent while still logging server failures', () => {
    const { response } = respond(new Error('private'), 'req-123', true);
    expect(response.setHeader).not.toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledOnce();
  });
});
