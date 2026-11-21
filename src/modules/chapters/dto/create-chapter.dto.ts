import { z } from 'zod';

export const createChapterSchema = z
  .strictObject({
    mangaId: z.uuid(),
    // PostgreSQL numeric(8, 2) is represented as a string in the entity.
    number: z
      .string()
      .regex(/^\d{1,6}(\.\d{1,2})?$/, {
        message: 'Use up to 6 integer digits and 2 decimal places',
      })
      .refine((value) => Number(value) > 0, {
        message: 'Chapter number must be greater than 0',
      }),
    title: z.string().trim().max(255).nullable().optional(),
    status: z.enum(['draft', 'published']).optional(),
  })
  .meta({
    title: 'CreateChapter',
    example: {
      mangaId: '550e8400-e29b-41d4-a716-446655440000',
      number: '1.5',
      title: 'Chapter 1.5',
      status: 'draft',
    },
  });

export type CreateChapterDto = z.infer<typeof createChapterSchema>;

// The nested route supplies mangaId from the URL.
export const createChapterBodySchema = createChapterSchema
  .omit({ mangaId: true })
  .meta({
    title: 'CreateChapterBody',
    example: { number: '1.5', title: 'Chapter 1.5', status: 'draft' },
  });

export type CreateChapterBodyDto = z.infer<typeof createChapterBodySchema>;
