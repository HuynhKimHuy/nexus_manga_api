import { z } from 'zod';
import { createMangaSchema } from './create-manga.dto.js';

export const paginationQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: createMangaSchema.shape.status,
  search: z.string().trim().min(1).max(255).optional(),
});

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;
