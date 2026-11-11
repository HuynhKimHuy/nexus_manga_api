import { HttpStatus } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { vi } from 'vitest';
import { makeManga } from '../../../test/fixtures/manga.js';
import { BusinessException } from '../../common/exeptions/bussines.exeption.js';
import { ErrorCode } from '../../common/filter/errors/error-code.js';
import type { CreateMangaDto } from './dto/create-manga.dto.js';
import { MangaRepo } from './mangas.repo.js';
import { MangaService } from './mangas.service.js';

describe('MangaService', () => {
  let module: TestingModule;
  let service: MangaService;
  const repository = {
    findAll: vi.fn<MangaRepo['findAll']>(),
    findById: vi.fn<MangaRepo['findById']>(),
    create: vi.fn<MangaRepo['create']>(),
    updateById: vi.fn<MangaRepo['updateById']>(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    module = await Test.createTestingModule({
      providers: [MangaService, { provide: MangaRepo, useValue: repository }],
    }).compile();
    service = module.get(MangaService);
  });

  afterEach(async () => {
    await module?.close();
  });

  it('S01 findAll delegates to the repository and returns its list', async () => {
    const mangas = [makeManga()];
    repository.findAll.mockResolvedValueOnce(mangas);

    await expect(service.findAll()).resolves.toBe(mangas);
    expect(repository.findAll).toHaveBeenCalledExactlyOnceWith();
  });

  it('S02 findById returns an existing manga', async () => {
    const manga = makeManga();
    repository.findById.mockResolvedValueOnce(manga);

    await expect(service.findById(manga.id)).resolves.toBe(manga);
    expect(repository.findById).toHaveBeenCalledExactlyOnceWith(manga.id);
  });

  it('S03 findById throws MANGA_NOT_FOUND for a missing manga', async () => {
    const id = makeManga().id;
    repository.findById.mockResolvedValueOnce(null);

    const result = service.findById(id);
    await expect(result).rejects.toBeInstanceOf(BusinessException);
    await expect(result).rejects.toMatchObject({
      code: ErrorCode.MANGA_NOT_FOUND,
      resourceId: id,
      status: HttpStatus.NOT_FOUND,
    });
    expect(repository.findById).toHaveBeenCalledExactlyOnceWith(id);
  });

  it('S04 createManga forwards the full DTO and returns the saved manga', async () => {
    const dto: CreateMangaDto = {
      title: 'One Piece',
      slug: 'one-piece',
      coverImage: 'https://example.com/cover.jpg',
      author: 'Eiichiro Oda',
      artist: 'Eiichiro Oda',
      status: 'ongoing',
      releaseYear: 1997,
    };
    const saved = makeManga(dto);
    repository.create.mockResolvedValueOnce(saved);

    await expect(service.createManga(dto)).resolves.toBe(saved);
    expect(repository.create).toHaveBeenCalledExactlyOnceWith(dto);
    expect(repository.create.mock.calls[0]?.[0]).toBe(dto);
  });

  it.each([
    ['S05', '23505', 'duplicate key'],
    ['S06', '08006', 'connection failure'],
  ])(
    '%s createManga preserves database error %s (%s)',
    async (_id, code, message) => {
      const dto = { title: 'One Piece', slug: 'one-piece' };
      const error = new QueryFailedError(
        'INSERT INTO tbl_mangas ...',
        [],
        Object.assign(new Error(message), { code }),
      );
      repository.create.mockRejectedValueOnce(error);

      await expect(service.createManga(dto)).rejects.toBe(error);
      expect(repository.create).toHaveBeenCalledExactlyOnceWith(dto);
    },
  );

  it('S07 findById preserves database errors instead of reporting not found', async () => {
    const error = new Error('Database unavailable');
    const id = makeManga().id;
    repository.findById.mockRejectedValueOnce(error);

    await expect(service.findById(id)).rejects.toBe(error);
    expect(repository.findById).toHaveBeenCalledExactlyOnceWith(id);
  });

  it('S08 updateById throws MANGA_NOT_FOUND without updating a missing manga', async () => {
    const id = makeManga().id;
    repository.findById.mockResolvedValueOnce(null);

    const result = service.updateById(id, { title: 'Updated manga' });

    await expect(result).rejects.toBeInstanceOf(BusinessException);
    await expect(result).rejects.toMatchObject({
      code: ErrorCode.MANGA_NOT_FOUND,
      resourceId: id,
      status: HttpStatus.NOT_FOUND,
    });
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('S09 updateById throws MANGA_NOT_FOUND when the manga disappears before updating', async () => {
    const manga = makeManga();
    const data = { title: 'Updated manga' };
    repository.findById.mockResolvedValueOnce(manga);
    repository.updateById.mockResolvedValueOnce({
      affected: 0,
      generatedMaps: [],
      raw: [],
    });

    const result = service.updateById(manga.id, data);

    await expect(result).rejects.toBeInstanceOf(BusinessException);
    await expect(result).rejects.toMatchObject({
      code: ErrorCode.MANGA_NOT_FOUND,
      resourceId: manga.id,
      status: HttpStatus.NOT_FOUND,
    });
    expect(repository.updateById).toHaveBeenCalledExactlyOnceWith(
      manga.id,
      data,
    );
    expect(repository.findById).toHaveBeenCalledTimes(1);
  });

  it.each(['create', 'update'] as const)(
    'maps a slug conflict during %s to a business error and preserves its cause',
    async (operation) => {
      const manga = makeManga();
      const error = new QueryFailedError(
        'private SQL',
        [],
        Object.assign(new Error('duplicate slug'), {
          code: '23505',
          constraint: 'tbl_mangas_slug_key',
        }),
      );
      repository.findById.mockResolvedValueOnce(manga);
      const result =
        operation === 'create'
          ? (repository.create.mockRejectedValueOnce(error),
            service.createManga({ title: 'Manga', slug: 'duplicate' }))
          : (repository.updateById.mockRejectedValueOnce(error),
            service.updateById(manga.id, { slug: 'duplicate' }));
      await expect(result).rejects.toBeInstanceOf(BusinessException);
      await expect(result).rejects.toMatchObject({
        code: 'MANGA_SLUG_ALREADY_EXISTS',
        status: 409,
        message: 'Manga slug already exists',
        cause: error,
      });
    },
  );

  it.each([
    ['23505', 'tbl_mangas_pkey'],
    ['08006', undefined],
  ])(
    'does not mislabel update database errors %s (%s) as slug conflicts',
    async (code, constraint) => {
      const manga = makeManga();
      const error = new QueryFailedError(
        'UPDATE ...',
        [],
        Object.assign(new Error('Database error'), { code, constraint }),
      );
      repository.findById.mockResolvedValueOnce(manga);
      repository.updateById.mockRejectedValueOnce(error);
      await expect(
        service.updateById(manga.id, { title: 'Updated' }),
      ).rejects.toBe(error);
    },
  );
});
