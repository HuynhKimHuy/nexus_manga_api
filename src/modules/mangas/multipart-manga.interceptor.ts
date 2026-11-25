import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class MultipartMangaInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.is('multipart/form-data')) {
      return next.handle();
    }

    // Form fields arrive as strings; the DTO expects releaseYear to be a number.
    const body = request.body as Record<string, unknown>;
    const releaseYear = body.releaseYear;
    if (typeof releaseYear === 'string' && /^\d+$/.test(releaseYear)) {
      body.releaseYear = Number(releaseYear);
    }

    return next.handle();
  }
}
