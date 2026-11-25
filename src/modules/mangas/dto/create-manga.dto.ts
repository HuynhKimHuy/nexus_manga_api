import { z } from 'zod';
import type { SchemaObject } from '@nestjs/swagger';
import type { MangaStatus } from '../mangas.entity.js';

export const createMangaSchema = z
  .strictObject({
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
  })
  .meta({
    title: 'CreateManga',
    example: {
      title: 'One Piece',
      slug: 'one-piece',
      author: 'Eiichiro Oda',
      status: 'ongoing',
      releaseYear: 1997,
    },
  });

export type CreateMangaDto = z.infer<typeof createMangaSchema>;

// Swagger adds the file input; regular body validation still uses createMangaSchema.
const mangaBodySchema = z.toJSONSchema(createMangaSchema, {
  target: 'openapi-3.0',
}) as SchemaObject;

export const createMangaRequestSchema: SchemaObject = {
  ...mangaBodySchema,
  properties: {
    ...mangaBodySchema.properties,
    coverImage: {
      oneOf: [
        { type: 'string', format: 'binary' },
        { type: 'string', format: 'uri', maxLength: 500 },
      ],
      description:
        'Optional JPEG, PNG or WebP file (max 5 MiB), or an HTTP URL. Do not send both.',
    },
  },
};
