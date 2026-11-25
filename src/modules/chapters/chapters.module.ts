import { ChapterPagesRepo } from './repositories/chapter-pages.repo.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chapters } from './chapters.entity.js';
import { MangasModule } from '../mangas/mangas.module.js';
import { ChapterService } from './chapter.service.js';
import { ChapterRepo } from './repositories/chapters.repo.js';
import { ChapterController } from './chapters.controller.js';
import { ChapterPagesController } from './chapter-pages.controller.js';
import { ChapterPagesService } from './chapter-pages.service.js';
import { R2Module } from '../storage/r2.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Chapters]), MangasModule, R2Module],
  controllers: [ChapterController, ChapterPagesController],
  providers: [
    ChapterService,
    ChapterRepo,
    ChapterPagesService,
    ChapterPagesRepo,
  ],
  exports: [ChapterService, ChapterRepo],
})
export class ChaptersModule {}
