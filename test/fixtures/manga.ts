import { Mangas } from '../../src/modules/mangas/mangas.entity.js';

export function makeManga(overrides: Partial<Mangas> = {}): Mangas {
  return Object.assign(new Mangas(), {
    id: 'e5969fe8-4968-49bc-b257-c56049f633b7',
    title: 'One Piece',
    slug: 'one-piece',
    coverImage: null,
    author: null,
    artist: null,
    status: 'ongoing',
    releaseYear: null,
    views: '0',
    rating: '0.00',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}
