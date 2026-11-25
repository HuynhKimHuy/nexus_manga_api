import { R2Module } from '../storage/r2.module.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mangas } from './mangas.entity.js';
import { MangaService } from './mangas.service.js';
import { MangaRepo } from './mangas.repo.js';
import { MangaController } from './mangas.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Mangas]), R2Module],
  controllers: [MangaController],
  providers: [MangaService, MangaRepo],
  exports: [TypeOrmModule, MangaRepo],
})
export class MangasModule {}
