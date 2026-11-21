import { z } from 'zod';
import { createChapterSchema } from './create-chapter.dto.js';

export const chapterPaginationQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: createChapterSchema.shape.status,
});

export type ChapterPaginationQueryDto = z.infer<
  typeof chapterPaginationQuerySchema
>;
