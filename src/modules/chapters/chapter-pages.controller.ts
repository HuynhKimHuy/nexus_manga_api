import type {} from 'multer';
import {
  Controller,
  Body,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ChapterPagesService } from './chapter-pages.service.js';
import { MAX_CBZ_BYTES } from './chapter-pages.cbz.js';
import { MAX_PAGE_BYTES, parseStartPage } from './chapter-pages.upload.js';
import {
  ApiChapterPagesControllerDocs,
  ApiImportChapterPagesDocs,
  ApiListChapterPagesDocs,
  ApiUploadChapterPageDocs,
  ApiUploadChapterPagesDocs,
} from './docs/chapter.swagger.js';

@Controller('mangas/:mangaId/chapters/:chapterId/pages')
@ApiChapterPagesControllerDocs()
export class ChapterPagesController {
  constructor(private readonly pages: ChapterPagesService) {}

  @Post()
  @ApiUploadChapterPagesDocs()
  @UseInterceptors(
    FilesInterceptor('images', undefined, {
      limits: { fileSize: MAX_PAGE_BYTES, fields: 1 },
    }),
  )
  uploadBatch(
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() images: Express.Multer.File[],
  ) {
    return this.pages.uploadBatch(
      mangaId,
      chapterId,
      parseStartPage(body),
      images,
    );
  }

  @Post('import')
  @ApiImportChapterPagesDocs()
  @UseInterceptors(
    FileInterceptor('archive', {
      limits: { fileSize: MAX_CBZ_BYTES, files: 1, fields: 1 },
    }),
  )
  importCbz(
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() body: Record<string, unknown>,
    @UploadedFile() archive?: Express.Multer.File,
  ) {
    return this.pages.importCbz(
      mangaId,
      chapterId,
      parseStartPage(body),
      archive,
    );
  }

  @Post(':pageNumber')
  @ApiUploadChapterPageDocs()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_PAGE_BYTES, files: 1, fields: 0 },
    }),
  )
  upload(
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Param('pageNumber', ParseIntPipe) pageNumber: number,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.pages.upload(mangaId, chapterId, pageNumber, image);
  }
  @Get()
  @ApiListChapterPagesDocs()
  list(
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
  ) {
    return this.pages.list(mangaId, chapterId);
  }
}
