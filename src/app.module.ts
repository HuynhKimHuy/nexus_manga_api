import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envSchema } from './config/env.schema.js';
import { envFilePaths } from './config/env.paths.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpLogginMiddleWare } from './common/middleware/http-login.middleware.js';
import { Mangas } from './modules/mangas/mangas.entity.js';
import { MangasModule } from './modules/mangas/mangas.module.js';
import { RequestContextMiddleware } from './common/middleware/RequestExeptionMiddleware.js';
import { APP_FILTER } from '@nestjs/core';
import { GobalExeptionfilter } from './common/filter/gobal.exeption.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePaths,
      validationSchema: envSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        applicationName: 'nexus-manga-api',
        type: 'postgres',
        host: config.getOrThrow<string>('POSTGRES_HOST'),
        port: config.getOrThrow<number>('POSTGRES_PORT'),
        username: config.getOrThrow<string>('POSTGRES_USER'),
        password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
        database: config.getOrThrow<string>('POSTGRES_DB'),
        synchronize: false,
        migrationsRun: false,
        entities: [Mangas],
      }),
    }),
    MangasModule,
  ],

  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GobalExeptionfilter,
    },
    AppService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestContextMiddleware, HttpLogginMiddleWare)
      .forRoutes('*');
  }
}
