import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { BusinessException } from '../../common/exeptions/bussines.exeption.js';
import { ErrorCode } from '../../common/filter/errors/error-code.js';
import { GobalExeptionfilter } from '../../common/filter/gobal.exeption.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ChapterService } from './chapter.service.js';
import { ChapterController } from './chapters.controller.js';
import { Chapters } from './chapters.entity.js';

describe('ChapterController HTTP', () => {
  let app: INestApplication<App>;
  const mangaId = 'e5969fe8-4968-49bc-b257-c56049f633b7';
  const chapter = Object.assign(new Chapters(), {
    id: '550e8400-e29b-41d4-a716-446655440000',
    mangaId,
    number: '1.00',
    title: null,
    status: 'draft' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
  const basePath = `/mangas/${mangaId}/chapters`;
  const chapterPath = `${basePath}/${chapter.id}`;
  const service = {
    findPaginated: vi.fn<ChapterService['findPaginated']>(),
    findById: vi.fn<ChapterService['findById']>(),
    createChapter: vi.fn<ChapterService['createChapter']>(),
    updateById: vi.fn<ChapterService['updateById']>(),
    deleteById: vi.fn<ChapterService['deleteById']>(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ChapterController],
      providers: [{ provide: ChapterService, useValue: service }],
    }).compile();
    app = module.createNestApplication<INestApplication<App>>({
      logger: false,
    });
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new GobalExeptionfilter());
    await app.init();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    service.findById.mockResolvedValue(chapter);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('lists chapters with default pagination', async () => {
    const page = {
      data: [chapter],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    service.findPaginated.mockResolvedValueOnce(page);
    const response = await request(app.getHttpServer())
      .get(basePath)
      .expect(200);
    expect(service.findPaginated).toHaveBeenCalledExactlyOnceWith(
      mangaId,
      1,
      10,
      undefined,
    );
    expect(response.body).toMatchObject({
      data: [{ id: chapter.id }],
      meta: page.meta,
    });
  });

  it('parses pagination and filters by status', async () => {
    service.findPaginated.mockResolvedValueOnce({
      data: [],
      meta: { page: 2, limit: 5, total: 0, totalPages: 0 },
    });
    await request(app.getHttpServer())
      .get(`${basePath}?page=2&limit=5&status=published`)
      .expect(200);
    expect(service.findPaginated).toHaveBeenCalledWith(
      mangaId,
      2,
      5,
      'published',
    );
  });

  it.each([
    'page=0',
    'limit=51',
    'page=1.5',
    'status=ongoing',
    'unknown=value',
  ])('rejects invalid query %s before calling the service', async (query) => {
    const response = await request(app.getHttpServer())
      .get(`${basePath}?${query}`)
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(service.findPaginated).not.toHaveBeenCalled();
  });

  it.each([`/mangas/invalid/chapters`, `${basePath}/invalid`])(
    'rejects malformed UUIDs at %s',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(400);
      expect(service.findById).not.toHaveBeenCalled();
      expect(service.findPaginated).not.toHaveBeenCalled();
    },
  );

  it('gets a chapter belonging to the manga', async () => {
    const response = await request(app.getHttpServer())
      .get(chapterPath)
      .expect(200);
    expect(response.body).toMatchObject({
      id: chapter.id,
      mangaId,
      number: '1.00',
    });
  });

  it('accepts uppercase UUIDs for the same manga', async () => {
    await request(app.getHttpServer())
      .get(`/mangas/${mangaId.toUpperCase()}/chapters/${chapter.id}`)
      .expect(200);
  });

  it.each(['get', 'patch', 'delete'] as const)(
    'rejects %s for a chapter belonging to another manga',
    async (method) => {
      const path = `/mangas/550e8400-e29b-41d4-a716-446655440001/chapters/${chapter.id}`;
      const operation = request(app.getHttpServer())[method](path);
      if (method === 'patch') operation.send({ title: 'Updated' });
      const response = await operation.expect(404);
      expect(response.body.error.code).toBe('CHAPTER_NOT_FOUND');
      expect(service.updateById).not.toHaveBeenCalled();
      expect(service.deleteById).not.toHaveBeenCalled();
    },
  );

  it('creates a chapter with the manga ID from the URL and a trimmed title', async () => {
    service.createChapter.mockResolvedValueOnce(chapter);
    await request(app.getHttpServer())
      .post(basePath)
      .send({ number: '1', title: ' Chapter 1 ' })
      .expect(201);
    expect(service.createChapter).toHaveBeenCalledExactlyOnceWith({
      mangaId,
      number: '1',
      title: 'Chapter 1',
    });
  });

  it.each([
    { number: 1 },
    { number: '0' },
    { number: '1', mangaId },
    { number: '1', status: 'ongoing' },
  ])('rejects invalid create body %j', async (body) => {
    await request(app.getHttpServer()).post(basePath).send(body).expect(400);
    expect(service.createChapter).not.toHaveBeenCalled();
  });

  it('updates a chapter and allows clearing the title', async () => {
    service.updateById.mockResolvedValueOnce(chapter);
    await request(app.getHttpServer())
      .patch(chapterPath)
      .send({ title: null })
      .expect(200);
    expect(service.updateById).toHaveBeenCalledExactlyOnceWith(chapter.id, {
      title: null,
    });
  });

  it.each([{}, { mangaId }, { unexpected: true }, { number: '-1' }])(
    'rejects invalid update body %j',
    async (body) => {
      await request(app.getHttpServer())
        .patch(chapterPath)
        .send(body)
        .expect(400);
      expect(service.updateById).not.toHaveBeenCalled();
    },
  );

  it('deletes a chapter with an empty 204 response', async () => {
    service.deleteById.mockResolvedValueOnce(undefined);
    const response = await request(app.getHttpServer())
      .delete(chapterPath)
      .expect(204);
    expect(response.text).toBe('');
    expect(service.deleteById).toHaveBeenCalledExactlyOnceWith(chapter.id);
  });

  it('returns the standard conflict error for a duplicate chapter number', async () => {
    service.createChapter.mockRejectedValueOnce(
      new BusinessException(ErrorCode.CHAPTER_NUMBER_ALREADY_EXISTS),
    );
    const response = await request(app.getHttpServer())
      .post(basePath)
      .send({ number: '1' })
      .expect(409);
    expect(response.body.error.code).toBe('CHAPTER_NUMBER_ALREADY_EXISTS');
  });

  it('preserves missing manga and chapter errors from the service', async () => {
    service.findPaginated.mockRejectedValueOnce(
      new BusinessException(ErrorCode.MANGA_NOT_FOUND),
    );
    service.findById.mockRejectedValueOnce(
      new BusinessException(ErrorCode.CHAPTER_NOT_FOUND),
    );
    const list = await request(app.getHttpServer()).get(basePath).expect(404);
    const detail = await request(app.getHttpServer())
      .get(chapterPath)
      .expect(404);
    expect(list.body.error.code).toBe('MANGA_NOT_FOUND');
    expect(detail.body.error.code).toBe('CHAPTER_NOT_FOUND');
  });

  it('documents nested routes, bodies without mangaId, and the empty delete response', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Test').setVersion('1.0').build(),
    );
    const collection = document.paths['/mangas/{mangaId}/chapters'];
    const detail = document.paths['/mangas/{mangaId}/chapters/{id}'];
    expect(collection?.post?.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: {
            required: ['number'],
            additionalProperties: false,
            properties: { number: { type: 'string' } },
          },
        },
      },
    });
    expect(JSON.stringify(collection?.post?.requestBody)).not.toContain(
      'mangaId',
    );
    expect(detail?.patch?.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: { minProperties: 1, additionalProperties: false },
        },
      },
    });
    expect(detail?.delete?.responses['204']).toEqual({
      description: 'Chapter deleted.',
    });
    expect(collection?.get?.responses['200']).toBeDefined();
    expect(detail?.get?.responses['200']).toBeDefined();
  });
});
