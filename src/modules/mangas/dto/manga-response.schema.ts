import { z } from 'zod';
import { createMangaSchema } from './create-manga.dto.js';

// JSON responses use nullable database columns and strings for bigint/numeric.
export const mangaResponseSchema = z.object({
  ...createMangaSchema.required().shape,
  id: z.uuid(),
  coverImage: createMangaSchema.shape.coverImage.unwrap().nullable(),
  author: createMangaSchema.shape.author.unwrap().nullable(),
  artist: createMangaSchema.shape.artist.unwrap().nullable(),
  releaseYear: createMangaSchema.shape.releaseYear.unwrap().nullable(),
  views: z.string().meta({
    example: '0',
    description: 'PostgreSQL bigint serialized as a string.',
  }),
  rating: z.string().meta({
    example: '0.00',
    description: 'PostgreSQL numeric serialized as a string.',
  }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const paginatedMangasResponseSchema = z.object({
  data: z.array(mangaResponseSchema),
  meta: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(50),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});
