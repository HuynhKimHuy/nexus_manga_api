import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chapters } from './chapters.entity.js';
import { MangasModule } from '../mangas/mangas.module.js';
import { ChapterService } from './chapter.service.js';
import { ChapterRepo } from './repositories/chapters.repo.js';
import { ChapterController } from './chapters.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Chapters]), MangasModule],
  controllers: [ChapterController],
  providers: [ChapterService, ChapterRepo],
  exports: [ChapterService, ChapterRepo],
})
export class ChaptersModule {}
