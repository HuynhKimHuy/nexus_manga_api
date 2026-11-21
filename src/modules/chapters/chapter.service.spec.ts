import { Test, type TestingModule } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { vi } from 'vitest';
import { makeManga } from '../../../test/fixtures/manga.js';
import { MangaRepo } from '../mangas/mangas.repo.js';
import { ChapterService } from './chapter.service.js';
import { Chapters } from './chapters.entity.js';
import { ChapterRepo } from './repositories/chapters.repo.js';

describe('ChapterService', () => {
  let module: TestingModule;
  let service: ChapterService;
  const manga = makeManga();
  const chapter = Object.assign(new Chapters(), {
    id: '550e8400-e29b-41d4-a716-446655440000',
    mangaId: manga.id,
    number: '1.00',
    title: null,
    status: 'draft' as const,
  });
  const dto = { mangaId: manga.id, number: '1' };
  const repository = {
    findAll: vi.fn<ChapterRepo['findAll']>(),
    findById: vi.fn<ChapterRepo['findById']>(),
    findByMangaId: vi.fn<ChapterRepo['findByMangaId']>(),
    findPaginated: vi.fn<ChapterRepo['findPaginated']>(),
    create: vi.fn<ChapterRepo['create']>(),
    updateById: vi.fn<ChapterRepo['updateById']>(),
    deleteById: vi.fn<ChapterRepo['deleteById']>(),
  };
  const mangaRepository = { findById: vi.fn<MangaRepo['findById']>() };

  beforeEach(async () => {
    vi.resetAllMocks();
    mangaRepository.findById.mockResolvedValue(manga);
    module = await Test.createTestingModule({
      providers: [
        ChapterService,
        { provide: ChapterRepo, useValue: repository },
        { provide: MangaRepo, useValue: mangaRepository },
      ],
    }).compile();
    service = module.get(ChapterService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('returns all chapters', async () => {
    repository.findAll.mockResolvedValueOnce([chapter]);
    await expect(service.findAll()).resolves.toEqual([chapter]);
  });

  it('returns a chapter by ID', async () => {
    repository.findById.mockResolvedValueOnce(chapter);
    await expect(service.findById(chapter.id)).resolves.toBe(chapter);
  });

  it('reports a missing chapter', async () => {
    repository.findById.mockResolvedValueOnce(null);
    await expect(service.findById(chapter.id)).rejects.toMatchObject({
      code: 'CHAPTER_NOT_FOUND',
      status: 404,
      resourceId: chapter.id,
    });
  });

  it('returns an empty list for a manga without chapters', async () => {
    repository.findByMangaId.mockResolvedValueOnce([]);
    await expect(service.findByMangaId(manga.id)).resolves.toEqual([]);
    expect(repository.findByMangaId).toHaveBeenCalledWith(manga.id);
  });

  it.each([
    [0, 0],
    [21, 3],
  ])(
    'paginates %i chapters and applies the status filter',
    async (total, totalPages) => {
      repository.findPaginated.mockResolvedValueOnce({ data: [], total });
      await expect(
        service.findPaginated(manga.id, 2, 10, 'published'),
      ).resolves.toEqual({
        data: [],
        meta: { page: 2, limit: 10, total, totalPages },
      });
      expect(repository.findPaginated).toHaveBeenCalledWith(
        manga.id,
        2,
        10,
        'published',
      );
    },
  );

  it.each(['create', 'list', 'paginate'] as const)(
    'rejects %s for a missing manga before accessing chapters',
    async (operation) => {
      mangaRepository.findById.mockResolvedValueOnce(null);
      let result: Promise<unknown>;
      switch (operation) {
        case 'create':
          result = service.createChapter(dto);
          break;
        case 'list':
          result = service.findByMangaId(manga.id);
          break;
        case 'paginate':
          result = service.findPaginated(manga.id, 1, 10);
          break;
      }
      await expect(result).rejects.toMatchObject({
        code: 'MANGA_NOT_FOUND',
        status: 404,
        resourceId: manga.id,
      });
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.findByMangaId).not.toHaveBeenCalled();
      expect(repository.findPaginated).not.toHaveBeenCalled();
    },
  );

  it('creates a chapter after checking its manga', async () => {
    repository.create.mockResolvedValueOnce(chapter);
    await expect(service.createChapter(dto)).resolves.toBe(chapter);
    expect(mangaRepository.findById).toHaveBeenCalledWith(dto.mangaId);
    expect(repository.create).toHaveBeenCalledWith(dto);
  });

  it('updates and returns the saved chapter, including clearing its title', async () => {
    const updated = Object.assign(new Chapters(), chapter, {
      title: null,
      status: 'published' as const,
    });
    repository.findById
      .mockResolvedValueOnce(chapter)
      .mockResolvedValueOnce(updated);
    repository.updateById.mockResolvedValueOnce({
      affected: 1,
      generatedMaps: [],
      raw: [],
    });
    await expect(
      service.updateById(chapter.id, { title: null, status: 'published' }),
    ).resolves.toEqual(updated);
    expect(repository.updateById).toHaveBeenCalledWith(chapter.id, {
      title: null,
      status: 'published',
    });
  });

  it('does not update a missing chapter', async () => {
    repository.findById.mockResolvedValueOnce(null);
    await expect(
      service.updateById(chapter.id, { title: 'Updated' }),
    ).rejects.toMatchObject({ code: 'CHAPTER_NOT_FOUND', status: 404 });
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('checks the destination manga before moving a chapter', async () => {
    repository.findById.mockResolvedValueOnce(chapter);
    mangaRepository.findById.mockResolvedValueOnce(null);
    const mangaId = 'e5969fe8-4968-49bc-b257-c56049f633b8';
    await expect(
      service.updateById(chapter.id, { mangaId }),
    ).rejects.toMatchObject({ code: 'MANGA_NOT_FOUND', resourceId: mangaId });
    expect(mangaRepository.findById).toHaveBeenCalledWith(mangaId);
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('reports a chapter deleted between reading and updating', async () => {
    repository.findById.mockResolvedValueOnce(chapter);
    repository.updateById.mockResolvedValueOnce({
      affected: 0,
      generatedMaps: [],
      raw: [],
    });
    await expect(
      service.updateById(chapter.id, { title: 'Updated' }),
    ).rejects.toMatchObject({
      code: 'CHAPTER_NOT_FOUND',
      resourceId: chapter.id,
    });
    expect(repository.findById).toHaveBeenCalledTimes(1);
  });

  it('deletes a chapter', async () => {
    repository.deleteById.mockResolvedValueOnce({ affected: 1, raw: [] });
    await expect(service.deleteById(chapter.id)).resolves.toBeUndefined();
    expect(repository.deleteById).toHaveBeenCalledWith(chapter.id);
  });

  it('reports a missing chapter when deleting', async () => {
    repository.deleteById.mockResolvedValueOnce({ affected: 0, raw: [] });
    await expect(service.deleteById(chapter.id)).rejects.toMatchObject({
      code: 'CHAPTER_NOT_FOUND',
      status: 404,
      resourceId: chapter.id,
    });
  });

  describe.each(['create', 'update'] as const)(
    '%s database errors',
    (operation) => {
      function write(): Promise<Chapters> {
        return operation === 'create'
          ? service.createChapter(dto)
          : service.updateById(chapter.id, { number: '1' });
      }

      function rejectWrite(error: Error): void {
        repository.findById.mockResolvedValueOnce(chapter);
        repository.create.mockRejectedValueOnce(error);
        repository.updateById.mockRejectedValueOnce(error);
      }

      it.each([
        [
          '23505',
          'uq_chapters_manga_number',
          'CHAPTER_NUMBER_ALREADY_EXISTS',
          409,
        ],
        ['23503', 'fk_chapters_manga', 'MANGA_NOT_FOUND', 404],
      ])(
        'maps %s on %s to %s',
        async (code, constraint, businessCode, status) => {
          const error = new QueryFailedError(
            'private SQL',
            [],
            Object.assign(new Error('Database error'), { code, constraint }),
          );
          rejectWrite(error);
          await expect(write()).rejects.toMatchObject({
            code: businessCode,
            status,
            cause: error,
          });
        },
      );

      it.each([
        ['23505', 'pk_chapters'],
        ['23503', 'unrelated_foreign_key'],
        ['08006', undefined],
      ])(
        'preserves unrelated database errors %s on %s',
        async (code, constraint) => {
          const error = new QueryFailedError(
            'private SQL',
            [],
            Object.assign(new Error('Database error'), { code, constraint }),
          );
          rejectWrite(error);
          await expect(write()).rejects.toBe(error);
        },
      );
    },
  );

  it('preserves database failures while checking the manga', async () => {
    const error = new Error('Database unavailable');
    mangaRepository.findById.mockRejectedValueOnce(error);
    await expect(service.createChapter(dto)).rejects.toBe(error);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
