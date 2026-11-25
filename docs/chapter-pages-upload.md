# Chapter publishing

Run database migrations before using page endpoints: npm run migration:run

1. POST /mangas/:mangaId/chapters with JSON:
   { "number": "1", "title": "Chapter 1", "status": "draft" }
2. POST /mangas/:mangaId/chapters/:chapterId/pages with multipart form-data:
   images (File, select multiple files), startPage (Text, optional, defaults to 1).
3. GET /mangas/:mangaId/chapters/:chapterId/pages to check order and image URLs.
4. PATCH /mangas/:mangaId/chapters/:chapterId with JSON:
   { "status": "published" }

Each batch accepts one or more JPEG, PNG or WebP images without a fixed file-count limit, at most 10 MiB per image.
Files are sorted naturally by filename, ignoring case: 1.jpg, 2.jpg, 10.jpg.
Filenames do not have to start at 1 or be consecutive. For example, sending
12.jpg, 3.jpg, 5.jpg produces reading order 3.jpg → 5.jpg → 12.jpg.
With default startPage=1 these receive internal pageNumber values 1, 2, 3.
The publish continuity check applies to these reading positions, not filenames.
Equivalent names (such as 02.JPG and 2.jpg) retain their order in the request.
Page numbers are assigned consecutively from startPage; numbers in filenames only
determine ordering. Send startPage=51 to append pages 51–100 after a 50-page batch.
The response is HTTP 201 with { "pages": [...] }, in reading order. Each page has
id, pageNumber, url, contentType and numeric sizeBytes.

The existing POST /pages/:pageNumber endpoint still accepts one image field.
Page positions are positive PostgreSQL integers. Upload order does not affect reading order.
Duplicate numbers return 409. Published chapters reject uploads with 409;
set status to draft to add pages. Publishing requires at least one ready page
and consecutive page numbers starting at 1. Check the final page count yourself:
the API cannot know whether you intended to upload additional pages.

R2 uses the same configuration as manga covers. Files go through the API;
do not set multipart Content-Type manually in Postman. All files are validated before
uploading. R2 uploads happen outside the database transaction. Before saving, the API
locks the chapter and rechecks draft status and page conflicts. All page records are
saved in one transaction. Failed uploads or saves trigger best-effort R2 cleanup;
cleanup failures are logged with the object key. No partial batch is saved to the DB.
The existing page migration prevents deleting chapters containing pages.
Page replacement/deletion and direct .zip/.cbr uploads are not included.

Draft is workflow state, not access control. These routes follow the existing API
without authentication; public image URLs can be accessed directly.

## Import a CBZ

After creating a draft chapter, send:

POST /mangas/:mangaId/chapters/:chapterId/pages/import

Postman Body → form-data:

| Key       | Type | Value                   |
| --------- | ---- | ----------------------- |
| archive   | File | chapter.cbz             |
| startPage | Text | Optional, defaults to 1 |

Returns HTTP 201 with { "pages": [...] }, identical to batch image upload.
Import does not change chapter status. Check GET /pages, then PATCH status to published.

Images inside subfolders are included. Sorting uses the image basename, ignoring
folders: 3.jpg → 5.jpg → 12.jpg. Equal names keep archive entry order.
JPEG, PNG and WebP are supported. ComicInfo.xml, other non-image entries, hidden
files and __MACOSX metadata are ignored. Encrypted, damaged and unsafe-path archives
are rejected. No files are extracted onto the server filesystem.

There is no fixed image-count or archive-entry-count limit. Size limits remain:
10 MiB per image, 100 MiB archive and total extracted images. Unsupported image formats are ignored; no supported
images returns 400. All images are validated before R2 uploads. Import reuses batch
transaction and cleanup logic; no partial batch is saved when a transaction fails.
