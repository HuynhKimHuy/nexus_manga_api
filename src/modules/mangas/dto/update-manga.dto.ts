import z from 'zod';
import { createMangaSchema } from './create-manga.dto.js';
export const updateMangaSchema = createMangaSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export type UpdateMangaDto = z.infer<typeof updateMangaSchema>;
