import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
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
    await request(app.getHttpServer())
      .get(`/mangas/${randomUUID()}`)
      .expect(404);
  });

  it('E04 GET /mangas/:id returns 400 for a malformed UUID', async () => {
    await request(app.getHttpServer()).get('/mangas/not-a-uuid').expect(400);
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
      await request(app.getHttpServer())
        .post('/mangas')
        .send({
          title: 'Invalid manga',
          slug: `${slugPrefix}invalid`,
          ...patch,
        })
        .expect(400);
      expect(await repository.count()).toBe(before);
    },
  );

  it('E08 duplicate slug returns current HTTP 500 and leaves the original row intact', async () => {
    // No global exception mapper exists yet: do not assume HTTP 409.
    await request(app.getHttpServer())
      .post('/mangas')
      .send({ title: 'Duplicate manga', slug: seeded.slug })
      .expect(500);
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
});
