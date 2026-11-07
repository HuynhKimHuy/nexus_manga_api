import { createMangaSchema } from './create-manga.dto.js';

describe('createMangaSchema', () => {
  const minimal = { title: 'One Piece', slug: 'one-piece' };
  const urlPrefix = 'https://example.com/';

  it('Z01 accepts required fields without optional fields', () => {
    expect(createMangaSchema.parse(minimal)).toEqual(minimal);
  });

  it('Z02 trims surrounding title whitespace', () => {
    expect(
      createMangaSchema.parse({ ...minimal, title: '  One Piece \n' }).title,
    ).toBe('One Piece');
  });

  it('Z03 accepts all optional fields together', () => {
    const dto = {
      ...minimal,
      coverImage: 'https://example.com/cover.jpg',
      author: 'Eiichiro Oda',
      artist: 'Eiichiro Oda',
      status: 'ongoing',
      releaseYear: 1997,
    };
    expect(createMangaSchema.parse(dto)).toEqual(dto);
  });

  it.each([
    ['title with Vietnamese characters', { title: 'Truyện tranh' }],
    ['one-character title', { title: 'A' }],
    ['title at 255 characters', { title: 'a'.repeat(255) }],
    [
      'slug containing lowercase letters, numbers and hyphens',
      { slug: 'manga-123' },
    ],
    ['slug at 255 characters', { slug: 'a'.repeat(255) }],
    [
      'coverImage at 500 characters',
      { coverImage: urlPrefix + 'a'.repeat(500 - urlPrefix.length) },
    ],
    ['HTTP coverImage', { coverImage: 'http://example.com/cover.jpg' }],
    ['author at 150 characters', { author: 'a'.repeat(150) }],
    ['artist at 150 characters', { artist: 'a'.repeat(150) }],
    ['empty optional author and artist', { author: '', artist: '' }],
    ['ongoing status', { status: 'ongoing' }],
    ['completed status', { status: 'completed' }],
    ['hiatus status', { status: 'hiatus' }],
    ['cancelled status', { status: 'cancelled' }],
    ['smallest positive releaseYear', { releaseYear: 1 }],
  ])('Z-valid accepts %s', (_name, patch) => {
    const dto = { ...minimal, ...patch };
    expect(createMangaSchema.parse(dto)).toEqual(dto);
  });

  it.each([
    ['missing title', { title: undefined }, 'title'],
    ['empty title', { title: '' }, 'title'],
    ['whitespace-only title', { title: ' \t\n ' }, 'title'],
    ['non-string title', { title: 123 }, 'title'],
    ['title longer than 255', { title: 'a'.repeat(256) }, 'title'],
    ['missing slug', { slug: undefined }, 'slug'],
    ['empty slug', { slug: '' }, 'slug'],
    ['uppercase slug', { slug: 'One-piece' }, 'slug'],
    ['slug with spaces', { slug: 'one piece' }, 'slug'],
    ['slug with underscore', { slug: 'one_piece' }, 'slug'],
    ['slug with accented letters', { slug: 'truyện' }, 'slug'],
    ['non-string slug', { slug: 123 }, 'slug'],
    ['slug longer than 255', { slug: 'a'.repeat(256) }, 'slug'],
    ['malformed coverImage', { coverImage: 'not-a-url' }, 'coverImage'],
    [
      'non-HTTP coverImage',
      { coverImage: 'ftp://example.com/cover.jpg' },
      'coverImage',
    ],
    ['empty coverImage', { coverImage: '' }, 'coverImage'],
    [
      'coverImage longer than 500',
      { coverImage: urlPrefix + 'a'.repeat(501 - urlPrefix.length) },
      'coverImage',
    ],
    ['author longer than 150', { author: 'a'.repeat(151) }, 'author'],
    ['non-string author', { author: 123 }, 'author'],
    ['artist longer than 150', { artist: 'a'.repeat(151) }, 'artist'],
    ['non-string artist', { artist: 123 }, 'artist'],
    ['unknown status', { status: 'finished' }, 'status'],
    ['uppercase status', { status: 'ONGOING' }, 'status'],
    ['zero releaseYear', { releaseYear: 0 }, 'releaseYear'],
    ['negative releaseYear', { releaseYear: -1 }, 'releaseYear'],
    ['fractional releaseYear', { releaseYear: 2026.5 }, 'releaseYear'],
    ['string releaseYear', { releaseYear: '2026' }, 'releaseYear'],
    ['infinite releaseYear', { releaseYear: Infinity }, 'releaseYear'],
    ['NaN releaseYear', { releaseYear: NaN }, 'releaseYear'],
  ])('Z-invalid rejects %s', (_name, patch, field) => {
    const result = createMangaSchema.safeParse({ ...minimal, ...patch });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: [field] })]),
      );
    }
  });

  it.each(['coverImage', 'author', 'artist', 'status', 'releaseYear'])(
    'Z-null rejects explicit null for optional %s',
    (field) => {
      expect(
        createMangaSchema.safeParse({ ...minimal, [field]: null }).success,
      ).toBe(false);
    },
  );

  it.each(['id', 'views', 'rating', 'createdAt', 'updatedAt', 'unexpected'])(
    'Z-strict rejects unauthorized field %s',
    (field) => {
      const result = createMangaSchema.safeParse({
        ...minimal,
        [field]: 'value',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({ code: 'unrecognized_keys', keys: [field] }),
        );
      }
    },
  );
});
