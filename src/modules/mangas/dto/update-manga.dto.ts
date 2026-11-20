import z from 'zod';
import { createMangaSchema } from './create-manga.dto.js';
export const updateMangaSchema = createMangaSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
  .meta({
    title: 'UpdateManga',
    description:
      'Provide at least one field. Unknown fields and null values are rejected.',
    minProperties: 1,
    example: { title: 'One Piece (updated)' },
  });

export type UpdateMangaDto = z.infer<typeof updateMangaSchema>;
