import { createChapterSchema } from './create-chapter.dto.js';
import { updateChapterSchema } from './update-chapter.dto.js';

const requiredFields = {
  mangaId: '550e8400-e29b-41d4-a716-446655440000',
  number: '1',
};

describe('createChapterSchema', () => {
  it('accepts required fields without adding defaults', () => {
    expect(createChapterSchema.parse(requiredFields)).toEqual(requiredFields);
  });

  it.each(['0.01', '1', '1.5', '999999.99'])(
    'accepts chapter number %s',
    (number) => {
      expect(
        createChapterSchema.safeParse({ ...requiredFields, number }).success,
      ).toBe(true);
    },
  );

  it.each([
    { mangaId: undefined },
    { mangaId: 'invalid-uuid' },
    { number: undefined },
    { number: 1 },
    { number: '0' },
    { number: '0.00' },
    { number: '-1' },
    { number: '1.001' },
    { number: '1000000' },
    { number: '1e2' },
    { title: 'a'.repeat(256) },
    { status: 'unknown' },
    { status: null },
    { id: 'unexpected' },
  ])('rejects invalid input %j', (patch) => {
    expect(
      createChapterSchema.safeParse({ ...requiredFields, ...patch }).success,
    ).toBe(false);
  });

  it.each(['draft', 'published'])('accepts status %s', (status) => {
    expect(
      createChapterSchema.parse({ ...requiredFields, status }).status,
    ).toBe(status);
  });

  it('trims title whitespace', () => {
    expect(
      createChapterSchema.parse({ ...requiredFields, title: ' Chapter 1 ' })
        .title,
    ).toBe('Chapter 1');
  });

  it('accepts a null title', () => {
    expect(
      createChapterSchema.parse({ ...requiredFields, title: null }).title,
    ).toBeNull();
  });
});

describe('updateChapterSchema', () => {
  it.each([
    { title: 'Updated title' },
    { title: null },
    { status: 'published' },
  ])('accepts a partial update %j', (patch) => {
    expect(updateChapterSchema.parse(patch)).toEqual(patch);
  });

  it.each([{}, { title: undefined }, { number: '0' }, { unexpected: true }])(
    'rejects an empty or invalid update %j',
    (patch) => {
      expect(updateChapterSchema.safeParse(patch).success).toBe(false);
    },
  );
});
