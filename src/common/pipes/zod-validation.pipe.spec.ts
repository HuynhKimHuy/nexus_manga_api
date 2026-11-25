import type { ArgumentMetadata } from '@nestjs/common';
import { ZodError, z } from 'zod';
import { BusinessException } from '../exeptions/bussines.exeption.js';
import { createMangaSchema } from '../../modules/mangas/dto/create-manga.dto.js';
import { paginationQuerySchema } from '../../modules/mangas/dto/pagination-query.dto.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe();

  it.each([
    [{ title: 123, slug: 'valid-slug' }, ['title']],
    [{ title: 123, slug: 456 }, ['title', 'slug']],
    [{}, ['title', 'slug']],
  ])(
    'maps invalid or missing fields from Zod issues: %j',
    async (input, fields) => {
      const result = pipe.transform(input, {
        type: 'body',
        schema: createMangaSchema,
      });
      await expect(result).rejects.toBeInstanceOf(BusinessException);
      await expect(result).rejects.toMatchObject({
        code: 'VALIDATION_FAILED',
        status: 400,
        cause: expect.any(ZodError),
        details: fields.map((field) => ({
          field,
          message: expect.any(String),
        })),
      });
    },
  );

  it('maps nested fields, array indexes and keys containing colons without parsing messages', async () => {
    const schema = z.object({
      profile: z.object({ name: z.string() }),
      chapters: z.array(z.object({ title: z.string() })),
      'label: name': z.string({ error: 'Message: with: colons' }),
    });
    const result = pipe.transform(
      {
        profile: { name: 1 },
        chapters: [{ title: false }],
        'label: name': 2,
      },
      { type: 'body', schema },
    );
    await expect(result).rejects.toMatchObject({
      details: [
        { field: 'profile.name', message: expect.any(String) },
        { field: 'chapters.0.title', message: expect.any(String) },
        { field: 'label: name', message: 'Message: with: colons' },
      ],
    });
  });

  it('maps a root issue to an empty field', async () => {
    const schema = z
      .object({})
      .refine(() => false, { message: 'Invalid body' });
    await expect(
      pipe.transform({}, { type: 'body', schema }),
    ).rejects.toMatchObject({
      details: [{ field: '', message: 'Invalid body' }],
    });
  });

  it('retains successful body transforms', async () => {
    await expect(
      pipe.transform(
        { title: ' Manga ', slug: 'manga' },
        {
          type: 'body',
          schema: createMangaSchema,
        },
      ),
    ).resolves.toEqual({ title: 'Manga', slug: 'manga' });
  });

  it('retains query coercion and default values', async () => {
    await expect(
      pipe.transform(
        { page: '2' },
        {
          type: 'query',
          schema: paginationQuerySchema,
        },
      ),
    ).resolves.toEqual({ page: 2, limit: 10 });
  });

  it('supports async Zod refinements', async () => {
    const schema = z
      .string()
      .refine(async () => false, { message: 'Rejected' });
    await expect(
      pipe.transform('value', { type: 'body', schema }),
    ).rejects.toMatchObject({
      details: [{ field: '', message: 'Rejected' }],
    });
  });

  it('does not mask unexpected schema execution errors', async () => {
    const error = new Error('Unexpected refinement failure');
    const schema = z.string().transform(() => {
      throw error;
    });
    await expect(
      pipe.transform('value', { type: 'body', schema }),
    ).rejects.toBe(error);
  });

  it('passes through parameters without a schema for ParseUUIDPipe', async () => {
    await expect(pipe.transform('not-a-uuid', { type: 'param' })).resolves.toBe(
      'not-a-uuid',
    );
  });

  it('retains Standard Schema compatibility without classifying other validation as Zod', async () => {
    const schema: NonNullable<ArgumentMetadata['schema']> = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: () => ({ issues: [{ message: 'Other validation' }] }),
      },
    };
    const result = pipe.transform({}, { type: 'body', schema });
    await expect(result).rejects.not.toBeInstanceOf(BusinessException);
    await expect(result).rejects.toMatchObject({ status: 400 });
  });
});
