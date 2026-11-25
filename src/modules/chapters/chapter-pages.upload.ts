import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

// PostgreSQL page_number is an integer; this is a storage bound, not a batch limit.
export const MAX_PAGE_NUMBER = 2_147_483_647;
export const MAX_PAGE_BYTES = 10 * 1024 * 1024;

export type PageImage = Pick<
  Express.Multer.File,
  'originalname' | 'mimetype' | 'buffer'
>;

export interface PageResponse {
  id: string;
  pageNumber: number;
  url: string;
  contentType: string;
  sizeBytes: number;
}

export interface StoredPage extends PageResponse {
  objectKey: string;
}

const filenameOrder = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
});

export function parseStartPage(body: Record<string, unknown>): number {
  const value = body.startPage ?? '1';
  if (
    Object.keys(body).some((key) => key !== 'startPage') ||
    typeof value !== 'string' ||
    !/^[0-9]+$/.test(value)
  ) {
    throw new BadRequestException(
      'Only startPage is allowed and must be a positive integer.',
    );
  }
  return Number(value);
}

export function preparePages(
  chapterId: string,
  startPage: number,
  files: PageImage[],
) {
  if (!files.length) throw new BadRequestException('Send at least one image.');
  if (
    !Number.isSafeInteger(startPage) ||
    startPage < 1 ||
    startPage + files.length - 1 > MAX_PAGE_NUMBER
  ) {
    throw new BadRequestException(
      'Page numbers must be positive PostgreSQL integers.',
    );
  }
  return (
    [...files]
      // Filenames may start anywhere and skip numbers (3, 5, 12).
      // pageNumber is the reading position, not the number in the filename.
      .sort((a, b) => filenameOrder.compare(a.originalname, b.originalname))
      .map((file, index) => ({
        file,
        pageNumber: startPage + index,
        contentType: validateImage(file),
        objectKey:
          'chapters/' +
          chapterId +
          '/' +
          (startPage + index) +
          '-' +
          randomUUID(),
      }))
  );
}

function validateImage(file: PageImage): string {
  const buffer = file.buffer;
  let contentType = '';
  if (buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) {
    contentType = 'image/jpeg';
  } else if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    contentType = 'image/png';
  } else if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    contentType = 'image/webp';
  }
  if (!contentType || contentType !== file.mimetype)
    throw new BadRequestException('Expected JPEG, PNG or WebP image content.');
  return contentType;
}
