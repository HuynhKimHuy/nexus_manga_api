import type { NextFunction, Response } from 'express';
import { vi } from 'vitest';
import {
  RequestContextMiddleware,
  type Requestwithcontext,
} from './RequestExeptionMiddleware.js';

describe('RequestContextMiddleware', () => {
  it('generates a server-owned request ID and sets the response header before next', () => {
    const middleware = new RequestContextMiddleware();
    const request = {
      headers: { 'x-request-id': 'untrusted-request-id' },
    } as unknown as Requestwithcontext;
    const response = { setHeader: vi.fn() };
    const next = vi.fn(() => {
      expect(request.requestId).toMatch(/^[0-9a-f-]{36}$/);
      expect(response.setHeader).toHaveBeenCalledExactlyOnceWith(
        'X-Request-ID',
        request.requestId,
      );
    });
    middleware.use(
      request,
      response as unknown as Response,
      next as NextFunction,
    );
    expect(request.requestId).not.toBe('untrusted-request-id');
    expect(next).toHaveBeenCalledExactlyOnceWith();
  });

  it('assigns a different ID to each request', () => {
    const middleware = new RequestContextMiddleware();
    const first = {} as Requestwithcontext;
    const second = {} as Requestwithcontext;
    const response = { setHeader: vi.fn() } as unknown as Response;
    middleware.use(first, response, vi.fn());
    middleware.use(second, response, vi.fn());
    expect(first.requestId).not.toBe(second.requestId);
  });
});
