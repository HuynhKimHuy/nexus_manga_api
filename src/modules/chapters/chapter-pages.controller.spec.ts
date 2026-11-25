import { ChapterPagesRepo } from './repositories/chapter-pages.repo.js';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { ChapterPagesController } from './chapter-pages.controller.js';
import { ChapterPagesService } from './chapter-pages.service.js';
import { R2StorageService } from '../storage/r2-storage-service.js';
import { makeCbz } from '../../../test/fixtures/cbz.js';

describe('Chapter batch multipart', () => {
  let app: INestApplication<App>;
  const manager = {
    findOne: vi.fn().mockResolvedValue({ status: 'draft' }),
    query: vi.fn().mockResolvedValue([]),
  };
  const storage = {
    uploadObject: vi.fn().mockResolvedValue('https://images.example.com/page'),
    deleteObject: vi.fn(),
  };
  const path =
    '/mangas/e5969fe8-4968-49bc-b257-c56049f633b7/chapters/a5213ce0-2adc-41b6-af1b-031b12176be7/pages';
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=',
    'base64',
  );
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ChapterPagesController],
      providers: [
        ChapterPagesService,
        ChapterPagesRepo,
        {
          provide: DataSource,
          useValue: {
            manager,
            transaction: async (fn: (m: typeof manager) => unknown) =>
              fn(manager),
          },
        },
        { provide: R2StorageService, useValue: storage },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });
  beforeEach(() => vi.clearAllMocks());
  afterAll(async () => app.close());
  it('imports nested CBZ images in filename order and ignores metadata', async () => {
    const zip = makeCbz([
      { name: 'chapter/12.png', data: png },
      { name: 'chapter/3.png', data: Buffer.concat([png, Buffer.from('3')]) },
      { name: 'chapter/5.png', data: Buffer.concat([png, Buffer.from('5')]) },
      { name: 'ComicInfo.xml', data: Buffer.from('metadata') },
    ]);
    const { body } = await request(app.getHttpServer())
      .post(path + '/import')
      .field('startPage', '51')
      .attach('archive', zip, 'chapter.cbz')
      .expect(201);
    expect(
      body.pages.map((page: { pageNumber: number }) => page.pageNumber),
    ).toEqual([51, 52, 53]);
    expect(storage.uploadObject.mock.calls.map((call) => call[1])).toEqual([
      Buffer.concat([png, Buffer.from('3')]),
      Buffer.concat([png, Buffer.from('5')]),
      png,
    ]);
  });
  it('imports 120 pages with default startPage', async () => {
    const zip = makeCbz(
      Array.from({ length: 120 }, (_, i) => ({
        name: i + 3 + '.png',
        data: png,
      })),
    );
    const { body } = await request(app.getHttpServer())
      .post(path + '/import')
      .attach('archive', zip, 'chapter.cbz')
      .expect(201);
    expect(body.pages).toHaveLength(120);
    expect(body.pages[0].pageNumber).toBe(1);
  });
  it('rejects an invalid image inside CBZ before uploading', async () => {
    const zip = makeCbz([
      { name: '3.png', data: png },
      { name: '5.png', data: Buffer.from('bad') },
    ]);
    await request(app.getHttpServer())
      .post(path + '/import')
      .attach('archive', zip, 'chapter.cbz')
      .expect(400);
    expect(storage.uploadObject).not.toHaveBeenCalled();
  });
  it('cleans up objects when importing to R2 fails', async () => {
    storage.uploadObject
      .mockResolvedValueOnce('url')
      .mockRejectedValueOnce(new Error('R2 failure'));
    const zip = makeCbz([
      { name: '3.png', data: png },
      { name: '5.png', data: png },
    ]);
    await request(app.getHttpServer())
      .post(path + '/import')
      .attach('archive', zip, 'chapter.cbz')
      .expect(500);
    expect(storage.deleteObject).toHaveBeenCalledTimes(2);
    expect(
      manager.query.mock.calls.some((call) => call[0].startsWith('INSERT')),
    ).toBe(false);
  });
  it('accepts 50 files in one request and defaults to page 1', async () => {
    let req = request(app.getHttpServer()).post(path);
    for (let i = 50; i >= 1; i--)
      req = req.attach('images', png, {
        filename: i + '.png',
        contentType: 'image/png',
      });
    const { body } = await req.expect(201);
    expect(body.pages.map((p: { pageNumber: number }) => p.pageNumber)).toEqual(
      Array.from({ length: 50 }, (_, i) => i + 1),
    );
    expect(storage.uploadObject).toHaveBeenCalledTimes(50);
    expect(
      manager.query.mock.calls.filter((call) => call[0].startsWith('INSERT')),
    ).toHaveLength(50);
  });
  it('accepts startPage and keeps the one-image endpoint', async () => {
    const result = await request(app.getHttpServer())
      .post(path)
      .field('startPage', '51')
      .attach('images', png, '1.png')
      .expect(201);
    expect(result.body.pages[0].pageNumber).toBe(51);
    const single = await request(app.getHttpServer())
      .post(path + '/7')
      .attach('image', png, '7.png')
      .expect(201);
    expect(single.body.pageNumber).toBe(7);
  });
  it.each(['0', '-1', '1.5', 'abc', ''])(
    'rejects invalid startPage %j',
    async (value) => {
      await request(app.getHttpServer())
        .post(path)
        .field('startPage', value)
        .attach('images', png, '1.png')
        .expect(400);
      expect(storage.uploadObject).not.toHaveBeenCalled();
    },
  );
  it('accepts more than 50 files in one request', async () => {
    let req = request(app.getHttpServer()).post(path);
    for (let i = 0; i < 51; i++) req = req.attach('images', png, '1.png');
    const { body } = await req.expect(201);
    expect(body.pages).toHaveLength(51);
    expect(storage.uploadObject).toHaveBeenCalledTimes(51);
  });
});
