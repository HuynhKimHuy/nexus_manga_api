import { z } from 'zod';
import {
  createChapterBodySchema,
  createChapterSchema,
} from './create-chapter.dto.js';

export const updateChapterSchema = createChapterSchema
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  })
  .meta({
    title: 'UpdateChapter',
    minProperties: 1,
    example: { title: 'Updated chapter title' },
  });

export type UpdateChapterDto = z.infer<typeof updateChapterSchema>;

export const updateChapterBodySchema = createChapterBodySchema
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  })
  .meta({
    title: 'UpdateChapterBody',
    minProperties: 1,
    example: { title: 'Updated chapter title' },
  });

export type UpdateChapterBodyDto = z.infer<typeof updateChapterBodySchema>;
