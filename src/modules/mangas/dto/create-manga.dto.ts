import { z } from 'zod';
import type { MangaStatus } from '../mangas.entity.js';

export const createMangaSchema = z.strictObject({
    title: z.string().trim().min(1).max(255),
    slug: z
        .string()
        .max(255)
        .regex(/^[a-z0-9-]+$/),
    coverImage: z.httpUrl().max(500).optional(),
    author: z.string().max(150).optional(),
    artist: z.string().max(150).optional(),
    status: z
        .enum([
            'ongoing',
            'completed',
            'hiatus',
            'cancelled',
        ] satisfies MangaStatus[])
        .optional(),
    releaseYear: z.number().int().positive().optional(),
});

export type CreateMangaDto = z.infer<typeof createMangaSchema>;
