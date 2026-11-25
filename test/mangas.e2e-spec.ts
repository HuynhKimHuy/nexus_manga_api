import { randomUUID } from 'node:crypto';
import { Logger, type INestApplication } from '@nestjs/common';
import { vi } from 'vitest';
import { MangaService } from '../src/modules/mangas/mangas.service.js';
import { ErrorCode } from '../src/common/filter/errors/error-code.js';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource, Like, QueryFailedError, type Repository } from 'typeorm';
import { Mangas } from '../src/modules/mangas/mangas.entity.js';
import {
  createPostgresTestApp,
  postgresTestsEnabled,
} from './helpers/postgres-test-app.js';

describe.skipIf(!postgresTestsEnabled)('Mangas API (PostgreSQL 18)', () => {
  let app: INestApplication<App>;
  let repository: Repository<Mangas>;
  let seeded: Mangas;
  // Cleanup only rows owned by this suite; no TRUNCATE or schema recreation.
  const slugPrefix = `qa-${randomUUID()}-`;

  beforeAll(async () => {
    app = await createPostgresTestApp();
    repository = app.get(DataSource).getRepository(Mangas);
  }, 30000);

  beforeEach(async () => {
    seeded = await repository.save(
      repository.create({ title: 'Seed manga', slug: `${slugPrefix}seed` }),
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await repository?.delete({ slug: Like(`${slugPrefix}%`) });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('E01 GET /mangas returns 200 and the seeded manga', async () => {
    const response = await request(app.getHttpServer())
      .get('/mangas')
      .expect(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: seeded.id, slug: seeded.slug }),
      ]),
    );
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 10,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });

  it('E02 GET /mangas/:id returns 200 for an existing UUID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/mangas/${seeded.id}`)
      .expect(200);
    expect(response.body).toMatchObject({
      id: seeded.id,
      title: seeded.title,
      slug: seeded.slug,
    });
  });

  it('E03 GET /mangas/:id returns 404 for a missing UUID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/mangas/${randomUUID()}`)
      .expect(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      error: { code: ErrorCode.MANGA_NOT_FOUND, message: 'Manga not found' },
      requestId: response.headers['x-request-id'],
      timestamp: expect.any(String),
    });
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('E04 GET /mangas/:id returns 400 for a malformed UUID', async () => {
    const response = await request(app.getHttpServer())
      .get('/mangas/not-a-uuid')
      .expect(400);
    expect(response.body.error.code).toBe(ErrorCode.BAD_REQUEST);
    expect(response.body.error.details).toBeUndefined();
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });

  it('E05 POST /mangas returns 201 and persists the full validated DTO', async () => {
    const dto = {
      title: '  Created manga  ',
      slug: `${slugPrefix}created`,
      coverImage: 'https://example.com/cover.jpg',
      author: 'Author',
      artist: 'Artist',
      status: 'completed',
      releaseYear: 2026,
    };
    const response = await request(app.getHttpServer())
      .post('/mangas')
      .send(dto)
      .expect(201);
    const persisted = await repository.findOneByOrFail({ slug: dto.slug });
    expect(response.body).toMatchObject({
      ...dto,
      title: 'Created manga',
      id: persisted.id,
      views: '0',
      rating: '0.00',
    });
    expect(persisted).toMatchObject({ ...dto, title: 'Created manga' });
    expect(persisted.createdAt).toBeInstanceOf(Date);
    expect(persisted.updatedAt).toBeInstanceOf(Date);
  });

  it('E06 POST /mangas applies database defaults when optional fields are omitted', async () => {
    const dto = { title: 'Minimal manga', slug: `${slugPrefix}minimal` };
    const response = await request(app.getHttpServer())
      .post('/mangas')
      .send(dto)
      .expect(201);
    expect(response.body).toMatchObject({
      ...dto,
      status: 'ongoing',
      coverImage: null,
      author: null,
      artist: null,
      releaseYear: null,
      views: '0',
      rating: '0.00',
    });
    expect(await repository.countBy({ slug: dto.slug })).toBe(1);
  });

  it.each([
    ['missing title', { title: undefined }],
    ['whitespace-only title', { title: ' \t\n ' }],
    ['invalid slug', { slug: 'Invalid_Slug' }],
    ['fractional releaseYear', { releaseYear: 2026.5 }],
    ['unauthorized field', { views: '999' }],
  ])(
    'E07 POST /mangas returns 400 for %s without inserting',
    async (_name, patch) => {
      const before = await repository.count();
      const response = await request(app.getHttpServer())
        .post('/mangas')
        .send({
          title: 'Invalid manga',
          slug: `${slugPrefix}invalid`,
          ...patch,
        })
        .expect(400);
      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(response.body.error.details.length).toBeGreaterThan(0);
      expect(response.body.requestId).toBe(response.headers['x-request-id']);
      expect(await repository.count()).toBe(before);
    },
  );

  it('E08 duplicate slug returns 409 MANGA_SLUG_ALREADY_EXISTS and leaves the original row intact', async () => {
    const response = await request(app.getHttpServer())
      .post('/mangas')
      .send({ title: 'Duplicate manga', slug: seeded.slug })
      .expect(409);
    expect(response.body.error).toEqual({
      code: ErrorCode.MANGA_SLUG_ALREADY_EXISTS,
      message: 'Manga slug already exists',
    });
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
    expect(await repository.countBy({ slug: seeded.slug })).toBe(1);
    expect(await repository.findOneByOrFail({ id: seeded.id })).toMatchObject({
      title: seeded.title,
      slug: seeded.slug,
    });
  });

  it('E09 PostgreSQL enforces the slug UNIQUE constraint with SQLSTATE 23505', async () => {
    const insertion = repository.save(
      repository.create({ title: 'Duplicate manga', slug: seeded.slug }),
    );
    await expect(insertion).rejects.toBeInstanceOf(QueryFailedError);
    await expect(insertion).rejects.toMatchObject({
      driverError: { code: '23505', table: 'tbl_mangas' },
    });
    expect(await repository.countBy({ slug: seeded.slug })).toBe(1);
  });

  it('E10 reports all invalid DTO fields with structured details', async () => {
    const response = await request(app.getHttpServer())
      .post('/mangas')
      .send({
        title: 123,
        slug: 'INVALID',
        releaseYear: -1,
      })
      .expect(400);
    expect(response.body.error).toEqual({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Validation failed',
      details: expect.arrayContaining([
        { field: 'title', message: expect.any(String) },
        { field: 'slug', message: expect.any(String) },
        { field: 'releaseYear', message: expect.any(String) },
      ]),
    });
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });

  it('E11 reports missing required fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/mangas')
      .send({})
      .expect(400);
    expect(response.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(response.body.error.details).toEqual([
      { field: 'title', message: expect.any(String) },
      { field: 'slug', message: expect.any(String) },
    ]);
  });

  it('E12 unexpected server exceptions return safe 500 errors and consistent request IDs in both logs', async () => {
    const errorLog = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const httpLog = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});
    const error = new Error(
      'password=private-db-password token=private-access-token SQL SELECT secret',
    );
    vi.spyOn(app.get(MangaService), 'findById').mockRejectedValueOnce(error);
    const response = await request(app.getHttpServer())
      .get(`/mangas/${seeded.id}?token=private-query-token`)
      .expect(500);
    const requestId = response.headers['x-request-id'];
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.body).toEqual({
      statusCode: 500,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal server error',
      },
      requestId,
      timestamp: expect.any(String),
      path: `/mangas/${seeded.id}`,
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /stack|cause|private-|SQL/,
    );
    expect(errorLog).toHaveBeenCalledWith(`GET 500 requestId=${requestId}`);
    expect(httpLog).toHaveBeenCalledWith(
      expect.stringContaining(`GET 500 requestId=${requestId}`),
    );
    expect(
      JSON.stringify([errorLog.mock.calls, httpLog.mock.calls]),
    ).not.toMatch(/private-|SQL|password|token/);
  });

  it('E13 PATCH duplicate slug returns 409 and preserves both rows', async () => {
    const other = await repository.save(
      repository.create({ title: 'Other manga', slug: `${slugPrefix}other` }),
    );
    const response = await request(app.getHttpServer())
      .patch(`/mangas/${other.id}`)
      .send({ slug: seeded.slug })
      .expect(409);
    expect(response.body.error.code).toBe(ErrorCode.MANGA_SLUG_ALREADY_EXISTS);
    expect((await repository.findOneByOrFail({ id: other.id })).slug).toBe(
      other.slug,
    );
    expect((await repository.findOneByOrFail({ id: seeded.id })).slug).toBe(
      seeded.slug,
    );
  });

  it('E14 invalid pagination returns 400 VALIDATION_FAILED', async () => {
    const response = await request(app.getHttpServer())
      .get('/mangas?page=0&limit=100')
      .expect(400);
    expect(response.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(response.body.error.details).toEqual([
      { field: 'page', message: expect.any(String) },
      { field: 'limit', message: expect.any(String) },
    ]);
  });

  it('E15 empty PATCH reports a root validation error', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/mangas/${seeded.id}`)
      .send({})
      .expect(400);
    expect(response.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(response.body.error.details).toEqual([
      { field: '', message: 'At least one field is required' },
    ]);
  });

  it('E16 valid PATCH keeps the success contract and database changes', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/mangas/${seeded.id}`)
      .send({ title: ' Updated title ' })
      .expect(200);
    expect(response.body).toMatchObject({
      id: seeded.id,
      title: 'Updated title',
      slug: seeded.slug,
    });
    expect((await repository.findOneByOrFail({ id: seeded.id })).title).toBe(
      'Updated title',
    );
  });

  it('E17 successful requests have a server-owned X-Request-ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/mangas/${seeded.id}`)
      .set('X-Request-ID', 'untrusted-id')
      .expect(200);
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers['x-request-id']).not.toBe('untrusted-id');
  });
});
