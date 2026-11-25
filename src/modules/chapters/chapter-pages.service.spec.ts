import { ChapterPagesRepo } from './repositories/chapter-pages.repo.js';
import { describe, it, expect, vi } from 'vitest';
import { DataSource, type Repository } from 'typeorm';
import { ChapterPagesService } from './chapter-pages.service.js';
import { R2StorageService } from '../storage/r2-storage-service.js';
import { ChapterRepo } from './repositories/chapters.repo.js';
import type { Chapters } from './chapters.entity.js';

function setup() {
  const manager = {
    findOne: vi.fn().mockResolvedValue({ status: 'draft' }),
    query: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
  };
  const db = { manager, transaction: vi.fn(async (fn) => fn(manager)) };
  const storage = {
    uploadObject: vi.fn().mockResolvedValue('https://images.example.com/page'),
    deleteObject: vi.fn(),
  };
  const service = new ChapterPagesService(
    new ChapterPagesRepo(db as unknown as DataSource),
    storage as unknown as R2StorageService,
  );
  const file = {
    buffer: Buffer.from([255, 216, 255, 0]),
    mimetype: 'image/jpeg',
    originalname: '1.jpg',
  } as Express.Multer.File;
  return { manager, db, storage, service, file };
}

describe('Chapter page upload', () => {
  it('accepts filenames starting at 3 with gaps and saves their ascending reading order', async () => {
    const { service, file, storage, manager } = setup();
    const files = [12, 5, 3, 20].map((number) => ({
      ...file,
      originalname: number + '.jpg',
      buffer: Buffer.from([255, 216, 255, number]),
    }));
    const result = await service.uploadBatch('manga', 'chapter', 1, files);
    expect(storage.uploadObject.mock.calls.map((call) => call[1][3])).toEqual([
      3, 5, 12, 20,
    ]);
    expect(result.pages.map((page) => page.pageNumber)).toEqual([1, 2, 3, 4]);
    expect(
      manager.query.mock.calls
        .filter((call) => call[0].startsWith('INSERT'))
        .map((call) => call[1][2]),
    ).toEqual([1, 2, 3, 4]);
  });
  it('cleans all objects when committing the batch fails', async () => {
    const { service, file, storage, db } = setup();
    db.transaction.mockRejectedValueOnce(new Error('transaction failed'));
    await expect(
      service.uploadBatch('manga', 'chapter', 1, [file, file]),
    ).rejects.toThrow('transaction failed');
    expect(storage.deleteObject).toHaveBeenCalledTimes(2);
  });
  it('returns numeric sizes and public URLs from an ordered page query', async () => {
    const db = {
      getRepository: () => ({
        findOneBy: vi.fn().mockResolvedValue({ id: 'chapter' }),
      }),
      query: vi.fn().mockResolvedValue([
        {
          id: 'page',
          pageNumber: 1,
          objectKey: 'key',
          contentType: 'image/png',
          sizeBytes: '123',
        },
      ]),
    };
    const storage = {
      getPublicUrl: vi.fn().mockReturnValue('https://images.example.com/key'),
    };
    const service = new ChapterPagesService(
      new ChapterPagesRepo(db as unknown as DataSource),
      storage as unknown as R2StorageService,
    );
    expect(await service.list('manga', 'chapter')).toEqual([
      {
        id: 'page',
        pageNumber: 1,
        contentType: 'image/png',
        sizeBytes: 123,
        url: 'https://images.example.com/key',
      },
    ]);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY page_number ASC'),
      ['chapter', 'ready'],
    );
  });
  it('sorts natural filenames, preserves ties, and offsets page numbers', async () => {
    const { service, file, storage } = setup();
    const files = ['10.jpg', '02.JPG', '2.jpg', '1.jpg'].map(
      (originalname, index) => ({
        ...file,
        originalname,
        buffer: Buffer.from([255, 216, 255, index]),
      }),
    );
    const result = await service.uploadBatch('manga', 'chapter', 51, files);
    expect(result.pages.map((page) => page.pageNumber)).toEqual([
      51, 52, 53, 54,
    ]);
    expect(storage.uploadObject.mock.calls.map((call) => call[1][3])).toEqual([
      3, 1, 2, 0,
    ]);
  });
  it('validates all images before uploading any', async () => {
    const { service, file, storage } = setup();
    await expect(
      service.uploadBatch('manga', 'chapter', 1, [
        file,
        { ...file, buffer: Buffer.from('invalid') },
      ]),
    ).rejects.toThrow();
    expect(storage.uploadObject).not.toHaveBeenCalled();
  });
  it('cleans up attempted objects when R2 fails before saving pages', async () => {
    const { service, file, storage, db } = setup();
    storage.uploadObject
      .mockResolvedValueOnce('url')
      .mockRejectedValueOnce(new Error('R2 failure'));
    await expect(
      service.uploadBatch('manga', 'chapter', 1, [file, file]),
    ).rejects.toThrow('R2 failure');
    expect(storage.deleteObject).toHaveBeenCalledTimes(2);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it.each(['published', 'duplicate'])(
    'rechecks %s after uploading and cleans up',
    async (reason) => {
      const { service, file, storage, manager } = setup();
      if (reason === 'published')
        manager.findOne
          .mockResolvedValueOnce({ status: 'draft' })
          .mockResolvedValueOnce({ status: 'published' });
      else
        manager.query
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 'other' }]);
      await expect(
        service.uploadBatch('manga', 'chapter', 1, [file]),
      ).rejects.toThrow();
      expect(storage.deleteObject).toHaveBeenCalledTimes(1);
      expect(
        manager.query.mock.calls.some((call) => call[0].startsWith('INSERT')),
      ).toBe(false);
    },
  );
  it('rejects empty batches and database page number overflow', async () => {
    const { service, file, storage } = setup();
    for (const files of [[]]) {
      await expect(
        service.uploadBatch('manga', 'chapter', 1, files),
      ).rejects.toThrow();
    }
    await expect(
      service.uploadBatch('manga', 'chapter', 2_147_483_647, [file, file]),
    ).rejects.toThrow();
    expect(storage.uploadObject).not.toHaveBeenCalled();
  });
  it('stores the explicit reading position', async () => {
    const { service, file, manager } = setup();
    await expect(
      service.upload('manga', 'chapter', 2, file),
    ).resolves.toMatchObject({ pageNumber: 2 });
    expect(manager.query.mock.calls[2][1]).toEqual([
      expect.any(String),
      'chapter',
      2,
      expect.stringContaining('chapters/chapter/2-'),
      'image/jpeg',
      4,
    ]);
  });
  it.each(['published', 'missing', 'duplicate'])(
    'rejects %s without uploading',
    async (reason) => {
      const { service, file, manager, storage } = setup();
      if (reason === 'published')
        manager.findOne.mockResolvedValue({ status: 'published' });
      if (reason === 'missing') manager.findOne.mockResolvedValue(null);
      if (reason === 'duplicate')
        manager.query.mockReset().mockResolvedValue([{ id: 'existing' }]);
      await expect(
        service.upload('manga', 'chapter', 1, file),
      ).rejects.toThrow();
      expect(storage.uploadObject).not.toHaveBeenCalled();
    },
  );
  it('cleans up R2 when saving the page fails', async () => {
    const { service, file, manager, storage } = setup();
    manager.query
      .mockReset()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('DB failure'));
    await expect(service.upload('manga', 'chapter', 1, file)).rejects.toThrow(
      'DB failure',
    );
    expect(storage.deleteObject).toHaveBeenCalledWith(
      storage.uploadObject.mock.calls[0][0],
    );
  });
  it('rejects fake images and invalid positions', async () => {
    const { service, file, storage } = setup();
    await expect(service.upload('manga', 'chapter', 0, file)).rejects.toThrow();
    await expect(
      service.upload('manga', 'chapter', 1, {
        ...file,
        buffer: Buffer.from('not an image'),
      }),
    ).rejects.toThrow();
    expect(storage.uploadObject).not.toHaveBeenCalled();
  });
});

describe('Publishing chapters', () => {
  it.each([
    { pages: [] },
    { pages: [{ page_number: 2, upload_status: 'ready' }] },
    { pages: [{ page_number: 1, upload_status: 'pending' }] },
  ])('rejects invalid page sets: %j', async ({ pages }) => {
    const { manager, db } = setup();
    manager.query.mockReset().mockResolvedValue(pages);
    const repo = new ChapterRepo({
      manager: db,
    } as unknown as Repository<Chapters>);
    await expect(
      repo.updateById('chapter', { status: 'published' }),
    ).rejects.toThrow('Publish requires');
    expect(manager.update).not.toHaveBeenCalled();
  });
  it('publishes consecutive ready pages under a chapter lock', async () => {
    const { manager, db } = setup();
    manager.query.mockReset().mockResolvedValue([
      { page_number: 1, upload_status: 'ready' },
      { page_number: 2, upload_status: 'ready' },
    ]);
    const repo = new ChapterRepo({
      manager: db,
    } as unknown as Repository<Chapters>);
    await expect(
      repo.updateById('chapter', { status: 'published' }),
    ).resolves.toMatchObject({ affected: 1 });
    expect(manager.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });
});
