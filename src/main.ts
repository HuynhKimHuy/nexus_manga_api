import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';
import { setupSwagger } from './config/swagger.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('PORT');
  app.useGlobalPipes(new ZodValidationPipe());
  setupSwagger(app);
  await app.listen(port);

  console.log(`Server running at http://localhost:${port}`);
  console.log(`Swagger UI at http://localhost:${port}/docs`);
}
await bootstrap();
