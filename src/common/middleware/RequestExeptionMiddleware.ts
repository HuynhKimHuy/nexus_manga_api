import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export interface Requestwithcontext extends Request {
  requestId?: string;
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Requestwithcontext, res: Response, next: NextFunction): void {
    req.requestId = randomUUID();

    res.setHeader('X-Request-ID', req.requestId);

    next();
  }
}
