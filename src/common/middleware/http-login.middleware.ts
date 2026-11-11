import { Injectable, Logger } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { Response, NextFunction } from 'express';
import type { Requestwithcontext } from './RequestExeptionMiddleware.js';

@Injectable()
export class HttpLogginMiddleWare implements NestMiddleware {
  private readonly logger = new Logger(HttpLogginMiddleWare.name);
  use(req: Requestwithcontext, res: Response, next: NextFunction): void {
    const start = performance.now();

    res.on('finish', () => {
      const duration = performance.now() - start;
      this.logger.log(
        `${req.method} ${res.statusCode} requestId=${req.requestId} ${duration.toFixed(2)}ms`,
      );
    });
    next();
  }
}
