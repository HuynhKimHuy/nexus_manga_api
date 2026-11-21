import { z } from 'zod';
import { createChapterSchema } from './create-chapter.dto.js';

export const chapterResponseSchema = z.object({
  ...createChapterSchema.required().shape,
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const paginatedChaptersResponseSchema = z.object({
  data: z.array(chapterResponseSchema),
  meta: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(50),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});
