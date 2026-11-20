import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Nexus Manga API')
    .setDescription('API for browsing, creating, and updating mangas.')
    .setVersion('1.0')
    .build();

  SwaggerModule.setup(
    'docs',
    app,
    () => SwaggerModule.createDocument(app, config),
    {
      customSiteTitle: 'Nexus Manga API Docs',
      swaggerOptions: { displayRequestDuration: true },
    },
  );
}
