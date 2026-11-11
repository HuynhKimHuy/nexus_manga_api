# Lesson 08.2 — Exception Handling Finalization & Testing

Ngày kiểm tra: 2026-11-11 (Asia/Ho_Chi_Minh).

## 1. Repository thực tế và files thay đổi

Repository dùng NestJS 12, TypeScript ESM/NodeNext, TypeORM, PostgreSQL, Zod và **Vitest**. Giữ test runner hiện có, không chuyển sang Jest hoặc thêm dependency.

Trước khi sửa đã đọc ErrorCode, ErrorCatalog, ApiErrorResponse, BusinessException, global filter, request context, HTTP logging, controller/service, schemas, bootstrap và các unit/E2E test. Repository chưa có ZodValidationPipe riêng; bootstrap dùng StandardSchemaValidationPipe của Nest. Các tên file/class hiện có, bao gồm cách viết `exeption`, được giữ nguyên.

Các file mới trong task này:

- `src/common/pipes/zod-validation.pipe.ts`
- `src/common/pipes/zod-validation.pipe.spec.ts`
- `src/common/exeptions/bussines.exeption.spec.ts`
- `src/common/filter/errors/error.catalog.spec.ts`
- `src/common/middleware/RequestExeptionMiddleware.spec.ts`
- `src/common/middleware/http-login.middleware.spec.ts`
- `docs/lesson-08.2-report.md`

Các file có thay đổi hành vi hoặc test:

- `src/common/exeptions/bussines.exeption.ts`: thêm structured details, giữ cause, cho phép bỏ options.
- `src/common/filter/errors/error-code.ts`: thêm HTTP_ERROR cho HTTP status chưa được liệt kê.
- `src/common/filter/errors/error.catalog.ts`: thêm fallback definition, bắt buộc catalog bao phủ toàn bộ ErrorCode ở compile time.
- `src/common/filter/gobal.exeption.ts`: sửa validation mapping, fallback và logging.
- `src/common/filter/gobal.exeption.spec.ts`: mở rộng kiểm tra filter.
- `src/common/middleware/http-login.middleware.ts`: dùng requestId chung và log metadata an toàn.
- `src/common/middleware/RequestExeptionMiddleware.ts`: chuẩn hóa Node import và định dạng; giữ hành vi tạo ID ở server.
- `src/app.module.ts`: request context chạy trước HTTP logger; giữ APP_FILTER hiện có.
- `src/main.ts`: dùng ZodValidationPipe kế thừa pipe hiện tại.
- `src/modules/mangas/mangas.service.ts`: map đúng slug unique violation cho create/update.
- `src/modules/mangas/mangas.service.spec.ts`: kiểm tra business errors và giữ nguyên các lỗi database khác.
- `test/helpers/postgres-test-app.ts`: dùng cùng validation pipe với bootstrap.
- `test/mangas.e2e-spec.ts`: kiểm tra error contract và success contract bằng HTTP/PostgreSQL.

Các file chỉ sửa định dạng do format check ban đầu báo lỗi:

- `src/app.controller.ts`
- `src/common/filter/errors/api-response.errors.ts`
- `src/common/middleware/authentication.ts`
- `src/modules/mangas/dto/create-manga.dto.ts`
- `src/modules/mangas/mangas.repo.ts`

`src/common/` đã tồn tại nhưng chưa được Git track trước task. Danh sách “file mới” ở trên phân biệt file mới thực sự với các file chưa track của người dùng. Các thay đổi staged/unstaged có sẵn trong AppModule được giữ lại.

## 2. Lỗi phát hiện và cách sửa

| Phát hiện                                                                                                    | Cách sửa                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filter parse `field: message` bằng `indexOf(': ')`, làm mất cấu trúc và nhầm BadRequest thông thường với Zod | ZodValidationPipe kế thừa StandardSchemaValidationPipe; dùng safeParseAsync và map trực tiếp `ZodError.issues[].path` sang `{ field, message }`, ném BusinessException VALIDATION_FAILED/400 |
| Chưa hỗ trợ rõ nested/array/root issues                                                                      | Path dùng dấu chấm, ví dụ `profile.name`, `chapters.0.title`; root issue có field rỗng; không parse nội dung message                                                                         |
| Trùng slug trả 500                                                                                           | Chỉ map QueryFailedError với SQLSTATE 23505 và constraint `tbl_mangas_slug_key` từ migration hiện có sang MANGA_SLUG_ALREADY_EXISTS/409, cả POST và PATCH                                    |
| Có thể che mất lỗi database khác                                                                             | Các lỗi khác được ném lại nguyên object; business conflict giữ original QueryFailedError trong cause                                                                                         |
| HTTP status chưa có mapping bị gán BAD_REQUEST                                                               | Dùng HTTP_ERROR cho status dưới 500 chưa được liệt kê; 5xx fallback INTERNAL_ERROR; giữ HTTP status gốc                                                                                      |
| Log có URL/query và raw stack/error message có thể chứa token, password, SQL parameters                      | Chỉ log method, status, requestId và thời gian xử lý; không log body, header, URL hay exception text                                                                                         |
| HTTP logging không dùng requestId chung                                                                      | RequestContextMiddleware chạy trước logger; filter, header, body và completion/error logs dùng cùng ID                                                                                       |
| Query string có thể lộ trong error response path                                                             | Loại query string khỏi path                                                                                                                                                                  |
| 5xx có thể mang dữ liệu nội bộ                                                                               | Message lấy từ catalog; không serialize stack/cause hoặc business details của 5xx                                                                                                            |
| Response đã gửi headers                                                                                      | Filter không ghi lại headers/status/body; vẫn ghi metadata lỗi server                                                                                                                        |
| Format check ban đầu thất bại ở 11 file                                                                      | Chạy Prettier; không đổi schema hoặc triển khai Authentication                                                                                                                               |

ApiErrorResponse và API success response contract được giữ nguyên. ParseUUIDPipe và BadRequestException thông thường vẫn là BAD_REQUEST. Không xây lại exception architecture, không triển khai User/JWT/Authentication.

## 3. Test cases và kết quả

Unit tests:

| Suite                                                    |  Passed | Failed | Skipped | Nội dung                                                                                                                                                        |
| -------------------------------------------------------- | ------: | -----: | ------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ErrorCatalog                                             |      16 |      0 |       0 | Mapping code/status/message và toàn bộ error codes                                                                                                              |
| BusinessException                                        |       3 |      0 |       0 | Code, status, message, resourceId, cause và details                                                                                                             |
| Global exception filter                                  |      28 |      0 |       0 | Business/HTTP/unknown errors, status fallback, UUID/BadRequest, Zod, 5xx privacy, requestId, headersSent                                                        |
| ZodValidationPipe                                        |      11 |      0 |       0 | Một/nhiều/missing fields, nested/array/root paths, message có dấu hai chấm, transform/coerce/default, async refinements, original errors, non-Zod compatibility |
| RequestContextMiddleware                                 |       2 |      0 |       0 | ID ở server, response header trước next, mỗi request có ID riêng                                                                                                |
| HTTP logging middleware                                  |       1 |      0 |       0 | Completion logging, shared ID, không log secrets                                                                                                                |
| MangaService                                             |      13 |      0 |       0 | Not found, slug conflict create/update, cause và database error propagation                                                                                     |
| Các unit tests sẵn có: schema, repository, AppController |      67 |      0 |       0 | Validation schema, persistence delegation và controller                                                                                                         |
| **Tổng unit**                                            | **141** |  **0** |   **0** | **10 test files**                                                                                                                                               |

E2E tests chạy qua Supertest HTTP với AppModule và PostgreSQL 18 thật:

| Case                                    | Kết quả                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| GET manga không tồn tại                 | PASS — 404 MANGA_NOT_FOUND                                                                                   |
| GET invalid UUID                        | PASS — 400 BAD_REQUEST, không có validation details                                                          |
| POST trùng slug                         | PASS — 409 MANGA_SLUG_ALREADY_EXISTS, row gốc không bị đổi                                                   |
| POST invalid DTO / required field thiếu | PASS — 400 VALIDATION_FAILED; các request không hợp lệ không insert                                          |
| POST nhiều field sai                    | PASS — details chứa title, slug, releaseYear                                                                 |
| Valid POST                              | PASS — 201; trim, đầy đủ DTO và database defaults đúng                                                       |
| Valid GET/list                          | PASS — 200; success response contract đúng                                                                   |
| Request lỗi                             | PASS — X-Request-ID khớp body                                                                                |
| Unexpected server exception             | PASS — 500 INTERNAL_ERROR; không lộ stack, cause, SQL hoặc secrets; ID khớp cả error và HTTP completion logs |
| PATCH trùng slug                        | PASS — 409; cả hai rows không bị đổi                                                                         |
| Query pagination sai / PATCH rỗng       | PASS — structured validation details và root issue                                                           |
| Valid PATCH                             | PASS — 200, trim và persistence đúng                                                                         |
| Success request với client X-Request-ID | PASS — server tạo ID riêng                                                                                   |
| PostgreSQL unique constraint            | PASS — SQLSTATE 23505 thực tế                                                                                |
| GET / và /debug/db                      | PASS — 2 AppController E2E tests sẵn có                                                                      |

E2E tổng cộng: **23 passed, 0 failed, 0 skipped**, 2 test files.

## 4. Tổng số tests

**164 passed, 0 failed, 0 skipped**: 141 unit + 23 E2E. Đây là số test của các lần chạy verification cuối, không cộng lặp các lần chạy trước.

## 5. Commands và kết quả verification

| Command                                               | Kết quả cuối                                               |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `npm run typecheck`                                   | PASS — exit 0                                              |
| `npm run lint`                                        | PASS — exit 0; còn 3 warnings có sẵn ở authentication stub |
| `npm run format:check`                                | PASS — exit 0 sau khi sửa format                           |
| `npm run build`                                       | PASS — exit 0                                              |
| `npm test`                                            | PASS — 141 tests                                           |
| `npm test -- --reporter=verbose`                      | PASS — 141 tests, kiểm tra từng case                       |
| `npm run migration:run` với test environment bên dưới | PASS — migration hiện có được apply vào nexus_manga_test   |
| `npm run test:e2e` với test environment bên dưới      | PASS — 23 tests, không skipped                             |
| `git diff --check`                                    | PASS — exit 0                                              |

Các thao tác database đã chạy:

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'
docker exec nexus-manga-postgres-1 sh -c \
  'psql -U "$POSTGRES_USER" -d postgres -Atc "SELECT datname FROM pg_database WHERE datname LIKE '\''%_test'\''"'
docker exec nexus-manga-postgres-1 sh -c \
  'createdb -U "$POSTGRES_USER" nexus_manga_test'
```

Wrapper đã chạy để nạp credentials từ environment file hiện có mà không in chúng, giữ process env test ưu tiên hơn env file:

```bash
NODE_ENV=test POSTGRES_DB=nexus_manga_test RUN_DB_TESTS=1 \
node --env-file=../.env --input-type=module -e \
'import { spawnSync } from "node:child_process"; const result = spawnSync("npm", ["run", "migration:run"], { stdio: "inherit", env: process.env }); process.exit(result.status ?? 1);'

NODE_ENV=test POSTGRES_DB=nexus_manga_test RUN_DB_TESTS=1 \
node --env-file=../.env --input-type=module -e \
'import { spawnSync } from "node:child_process"; const result = spawnSync("npm", ["run", "test:e2e"], { stdio: "inherit", env: process.env }); process.exit(result.status ?? 1);'
```

Docker và kết nối PostgreSQL cần chạy ngoài sandbox trong môi trường hiện tại. Lần migration đầu trong sandbox thất bại với EPERM; lần chạy lại với quyền truy cập localhost thành công. Format check đầu thất bại do format có sẵn; đã sửa và chạy lại thành công. Không có unit/E2E test nào thất bại trong các lần chạy của task.

Test helper bắt buộc NODE_ENV=test và tên database kết thúc bằng `_test`, kiểm tra database/version thật và giữ synchronize=false. E2E chỉ dọn rows có slug prefix `qa-<UUID>-` do suite sở hữu. Không xóa/reset dữ liệu database development, không dùng TRUNCATE hoặc recreate schema.

## 6. Vấn đề còn tồn tại và giới hạn

- Còn 3 lint warnings về parameters chưa dùng trong `src/common/middleware/authentication.ts`. Stub được giữ nguyên hành vi vì Authentication nằm ngoài phạm vi task.
- Slug error mapping cố ý dùng constraint `tbl_mangas_slug_key` từ migration hiện có. Nếu migration sau đổi tên constraint, cần cập nhật mapping và test tương ứng.
- Log chỉ lưu metadata an toàn; không xuất raw exception message/stack. Cause gốc vẫn được giữ trong business exception và các lỗi khác không bị wrap lại.
- Chạy E2E không bật RUN_DB_TESTS sẽ skip theo thiết kế repository. Kết quả 23 PASS ở báo cáo này dùng flag và database test thật.
- Đây là verification trong môi trường local/PostgreSQL 18, không phải chứng nhận toàn bộ hệ thống đã sẵn sàng triển khai production.

## 7. Đánh giá chuyển bài

**Lesson 08.2 sẵn sàng để chuyển sang User Module và JWT.** Các yêu cầu exception/validation và HTTP regression tests của bài đã được kiểm tra thành công. Ba lint warnings ở authentication stub không làm command thất bại và không chặn lesson này; xử lý cùng task Authentication sau.

Không commit, push hoặc merge.
