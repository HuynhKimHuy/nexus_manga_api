import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppController } from '../app.controller.js';
import { AppService } from '../app.service.js';
import { MangaController } from '../modules/mangas/mangas.controller.js';
import { MangaService } from '../modules/mangas/mangas.service.js';
import { ChapterController } from '../modules/chapters/chapters.controller.js';
import { ChapterService } from '../modules/chapters/chapter.service.js';
import { ChapterPagesController } from '../modules/chapters/chapter-pages.controller.js';
import { ChapterPagesService } from '../modules/chapters/chapter-pages.service.js';
import { setupSwagger } from './swagger.config.js';

describe('Swagger documentation', () => {
  let app: INestApplication<App>;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        AppController,
        MangaController,
        ChapterController,
        ChapterPagesController,
      ],
      providers: [
        { provide: AppService, useValue: {} },
        { provide: MangaService, useValue: {} },
        { provide: ChapterService, useValue: {} },
        { provide: ChapterPagesService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication<INestApplication<App>>({
      logger: false,
    });
    setupSwagger(app);
    await app.init();
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Test').setVersion('1.0').build(),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it('serves Swagger UI, assets, and JSON/YAML documents without a database', async () => {
    const server = app.getHttpServer();
    const ui = await request(server).get('/docs').expect(200);
    expect(ui.text).toContain('Nexus Manga API Docs');
    await request(server).get('/docs/swagger-ui.css').expect(200);
    const json = await request(server).get('/docs-json').expect(200);
    expect(json.body).toMatchObject({
      openapi: '3.0.0',
      info: { title: 'Nexus Manga API' },
      paths: document.paths,
    });
    const yaml = await request(server).get('/docs-yaml').expect(200);
    expect(yaml.text).toContain('/mangas:');
  });

  it('derives strict create and partial update bodies from the validation schemas', () => {
    expect(document.paths['/mangas']?.post?.requestBody).toMatchObject({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['title', 'slug'],
            additionalProperties: false,
            properties: {
              title: { type: 'string', minLength: 1, maxLength: 255 },
              slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
              status: { enum: ['ongoing', 'completed', 'hiatus', 'cancelled'] },
              releaseYear: {
                type: 'integer',
                minimum: 0,
                exclusiveMinimum: true,
              },
            },
            example: { title: 'One Piece', slug: 'one-piece' },
          },
        },
      },
    });
    expect(document.paths['/mangas/{id}']?.patch?.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: {
            minProperties: 1,
            additionalProperties: false,
            example: { title: 'One Piece (updated)' },
          },
        },
      },
    });
    expect(
      JSON.stringify(document.paths['/mangas/{id}']?.patch?.requestBody),
    ).not.toContain('"required":[');
  });

  it('documents optional pagination defaults, limits, filters, and UUID IDs', () => {
    expect(document.paths['/mangas']?.get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'page',
          in: 'query',
          required: false,
          schema: expect.objectContaining({
            type: 'integer',
            minimum: 1,
            default: 1,
          }),
        }),
        expect.objectContaining({
          name: 'limit',
          in: 'query',
          required: false,
          schema: expect.objectContaining({
            type: 'integer',
            minimum: 1,
            maximum: 50,
            default: 10,
          }),
        }),
        expect.objectContaining({
          name: 'status',
          in: 'query',
          required: false,
        }),
        expect.objectContaining({
          name: 'search',
          in: 'query',
          required: false,
          schema: expect.objectContaining({ minLength: 1, maxLength: 255 }),
        }),
      ]),
    );
    expect(document.paths['/mangas/{id}']?.get?.parameters).toContainEqual(
      expect.objectContaining({
        name: 'id',
        in: 'path',
        required: true,
        schema: expect.objectContaining({ type: 'string', format: 'uuid' }),
      }),
    );
  });

  it('describes actual success and error response formats', () => {
    expect(document.paths['/mangas']?.post?.responses).toMatchObject({
      '201': {
        content: {
          'application/json': {
            schema: {
              properties: {
                id: { format: 'uuid' },
                author: { type: 'string', nullable: true },
                releaseYear: { type: 'integer', nullable: true },
                views: { type: 'string' },
                rating: { type: 'string' },
                createdAt: { format: 'date-time' },
              },
            },
          },
        },
      },
      '400': {
        content: {
          'application/json': {
            schema: {
              properties: {
                statusCode: { type: 'integer' },
                error: {
                  properties: {
                    code: {
                      enum: expect.arrayContaining(['VALIDATION_FAILED']),
                    },
                    details: { type: 'array' },
                  },
                },
                requestId: { type: 'string' },
                timestamp: { format: 'date-time' },
                path: { type: 'string' },
              },
            },
          },
        },
      },
      '409': { description: 'MANGA_SLUG_ALREADY_EXISTS' },
      '500': { description: 'INTERNAL_ERROR' },
    });
    expect(document.paths['/mangas']?.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            properties: {
              data: { type: 'array' },
              meta: { required: ['page', 'limit', 'total', 'totalPages'] },
            },
          },
        },
      },
    });
    expect(document.paths['/mangas/{id}']?.get?.responses['404']).toMatchObject(
      { description: 'MANGA_NOT_FOUND' },
    );
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining(['/', '/debug/db', '/mangas', '/mangas/{id}']),
    );
  });

  it('keeps multipart documentation for cover, page batch, and CBZ import', () => {
    expect(document.paths['/mangas/{id}/cover']?.post).toMatchObject({
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              required: ['coverImage'],
              properties: { coverImage: { format: 'binary' } },
            },
          },
        },
      },
    });
    expect(
      document.paths['/mangas/{mangaId}/chapters/{chapterId}/pages']?.post,
    ).toMatchObject({
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              required: ['images'],
              properties: {
                images: { type: 'array' },
                startPage: { type: 'integer', default: 1 },
              },
            },
          },
        },
      },
    });
    expect(
      document.paths['/mangas/{mangaId}/chapters/{chapterId}/pages/import']
        ?.post,
    ).toMatchObject({
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              required: ['archive'],
              properties: { archive: { format: 'binary' } },
            },
          },
        },
      },
    });
  });
});
