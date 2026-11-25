import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { Response } from 'express';
import { vi } from 'vitest';
import { HttpLogginMiddleWare } from './http-login.middleware.js';
import type { Requestwithcontext } from './RequestExeptionMiddleware.js';

describe('HttpLogginMiddleWare', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs completion with the shared request ID and excludes request secrets', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const req = {
      method: 'POST',
      requestId: 'req-123',
      originalUrl:
        '/private/secret-path?token=secret-token&password=secret-password',
      headers: { authorization: 'Bearer secret-bearer' },
      body: { password: 'secret-body' },
    } as unknown as Requestwithcontext;
    const res = Object.assign(new EventEmitter(), { statusCode: 400 });
    const next = vi.fn();
    new HttpLogginMiddleWare().use(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledExactlyOnceWith();
    expect(log).not.toHaveBeenCalled();
    res.emit('finish');
    expect(log).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^POST 400 requestId=req-123 \d+\.\d{2}ms$/),
    );
    expect(JSON.stringify(log.mock.calls)).not.toMatch(
      /secret-|authorization|password|token/,
    );
  });
});
