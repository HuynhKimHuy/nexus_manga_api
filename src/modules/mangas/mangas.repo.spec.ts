import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { vi } from 'vitest';
import { makeManga } from '../../../test/fixtures/manga.js';
import type { CreateMangaDto } from './dto/create-manga.dto.js';
import { Mangas } from './mangas.entity.js';
import { MangaRepo } from './mangas.repo.js';

describe('MangaRepo', () => {
  let module: TestingModule;
  let repository: MangaRepo;
  const orm = {
    find: vi.fn<Repository<Mangas>['find']>(),
    findOneBy: vi.fn<Repository<Mangas>['findOneBy']>(),
    create: vi.fn<(dto: CreateMangaDto) => Mangas>(),
    save: vi.fn<(manga: Mangas) => Promise<Mangas>>(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    module = await Test.createTestingModule({
      providers: [
        MangaRepo,
        { provide: getRepositoryToken(Mangas), useValue: orm },
      ],
    }).compile();
    repository = module.get(MangaRepo);
  });

  afterEach(async () => {
    await module?.close();
  });

  it('R01 findAll returns the TypeORM list', async () => {
    const mangas = [makeManga()];
    orm.find.mockResolvedValueOnce(mangas);

    await expect(repository.findAll()).resolves.toBe(mangas);
    expect(orm.find).toHaveBeenCalledExactlyOnceWith();
  });

  it('R02 findAll returns an empty list', async () => {
    orm.find.mockResolvedValueOnce([]);

    await expect(repository.findAll()).resolves.toEqual([]);
    expect(orm.find).toHaveBeenCalledExactlyOnceWith();
  });

  it('R03 findById queries the ID and returns the manga', async () => {
    const manga = makeManga();
    orm.findOneBy.mockResolvedValueOnce(manga);

    await expect(repository.findById(manga.id)).resolves.toBe(manga);
    expect(orm.findOneBy).toHaveBeenCalledExactlyOnceWith({ id: manga.id });
  });

  it('R04 findById returns null for a missing manga', async () => {
    const id = makeManga().id;
    orm.findOneBy.mockResolvedValueOnce(null);

    await expect(repository.findById(id)).resolves.toBeNull();
    expect(orm.findOneBy).toHaveBeenCalledExactlyOnceWith({ id });
  });

  it('R05 create builds an entity and returns the saved result', async () => {
    const dto: CreateMangaDto = {
      title: 'One Piece',
      slug: 'one-piece',
      coverImage: 'https://example.com/cover.jpg',
      author: 'Eiichiro Oda',
      artist: 'Eiichiro Oda',
      status: 'ongoing',
      releaseYear: 1997,
    };
    const entity = Object.assign(new Mangas(), dto);
    const saved = makeManga(dto);
    orm.create.mockReturnValueOnce(entity);
    orm.save.mockResolvedValueOnce(saved);

    await expect(repository.create(dto)).resolves.toBe(saved);
    expect(orm.create).toHaveBeenCalledExactlyOnceWith(dto);
    expect(orm.save).toHaveBeenCalledExactlyOnceWith(entity);
    expect(orm.save.mock.calls[0]?.[0]).toBe(entity);
  });

  it('R06 create propagates a save failure', async () => {
    const dto = { title: 'One Piece', slug: 'one-piece' };
    const entity = makeManga();
    const error = new Error('Database unavailable');
    orm.create.mockReturnValueOnce(entity);
    orm.save.mockRejectedValueOnce(error);

    await expect(repository.create(dto)).rejects.toBe(error);
    expect(orm.save).toHaveBeenCalledExactlyOnceWith(entity);
  });
});
