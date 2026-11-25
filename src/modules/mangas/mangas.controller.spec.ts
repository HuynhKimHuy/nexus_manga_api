import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { MangaController } from './mangas.controller.js';
import { MangaService } from './mangas.service.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const png = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AX//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AX//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IYf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIAAwAAAB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Ef/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Rf//Z',
  'base64',
);

describe('Manga controller', () => {
  let app: INestApplication<App>;
  const service = {
    createManga: vi.fn().mockResolvedValue({ id: 'created' }),
    uploadCover: vi.fn().mockResolvedValue({ id: 'updated' }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MangaController],
      providers: [{ provide: MangaService, useValue: service }],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });
  beforeEach(() => {
    service.createManga.mockClear();
    service.uploadCover.mockClear();
  });
  afterAll(async () => app?.close());

  it('creates manga details with JSON', async () => {
    const body = { title: 'Manga', slug: 'manga', status: 'ongoing' };
    await request(app.getHttpServer()).post('/mangas').send(body).expect(201);
    expect(service.createManga).toHaveBeenCalledWith(body);
  });

  it('uploads the cover through the separate endpoint', async () => {
    await request(app.getHttpServer())
      .post('/mangas/e5969fe8-4968-49bc-b257-c56049f633b7/cover')
      .attach('coverImage', png, {
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    expect(service.uploadCover).toHaveBeenCalledWith(
      'e5969fe8-4968-49bc-b257-c56049f633b7',
      expect.objectContaining({ mimetype: 'image/jpeg' }),
    );
  });
});
