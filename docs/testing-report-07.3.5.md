# Báo cáo Lesson 07.3.5 — Automated Testing

Ngày kiểm tra: 27/10/2026 (Asia/Ho_Chi_Minh).

Đã chạy **89 test: 89 PASS, 0 FAIL, 0 SKIPPED** trong lượt chạy có đầy đủ môi trường test. Unit: 74; E2E/integration: 15. Trong đó 84 test mới và 5 test có sẵn được giữ lại. Format check toàn repository chưa đạt do 6 file production đã sai định dạng trước khi làm nhiệm vụ; lint thành công với 1 cảnh báo có sẵn.

## 1. Code và môi trường đã xác minh

- Framework thực tế: Vitest 4.1.12; Supertest; NestJS TestingModule; TypeScript ESM/NodeNext, import nội bộ dùng `.js`.
- Kiến trúc: `MangaController → MangaService → MangaRepo → Repository<Mangas>`.
- Repository: `findAll`, `findById`, `create`. Service: `findAll`, `findById`, `createManga`.
- Routes: `GET /mangas`, `GET /mangas/:id`, `POST /mangas`.
- Validation: `z.strictObject`, `z.httpUrl`, title có trim; `@Body({ schema: createMangaSchema })`; `StandardSchemaValidationPipe` trong `main.ts`.
- Unit test mock TypeORM Repository hoặc MangaRepo; không kết nối database.
- Integration dùng toàn bộ AppModule và PostgreSQL **18.6** thật trong container tạm `nexus-manga-qa-0735`, database `nexus_manga_test`, cổng `127.0.0.1:32768`, dữ liệu nằm trong tmpfs, không mount dữ liệu development.
- Đã áp dụng migration hiện có `CreateMangas1792901379760`; không sửa Entity, migration hay cấu trúc schema, không bật synchronize.
- Test helper cài global pipe như main.ts, yêu cầu `RUN_DB_TESTS=1`, `NODE_ENV=test`, đủ biến môi trường và tên database kết thúc bằng `_test` trước khi import AppModule. Xác minh database thực tế, PostgreSQL 18 và synchronize=false sau khi khởi tạo.
- Cleanup chỉ xóa slug mang UUID riêng của suite. Kiểm tra trực tiếp sau test cho thấy **0 dòng còn lại**; container đã dừng và tự xóa.
- Runtime local: Node.js **26.12.1**, npm **12.2.1**. CI đang cấu hình Node.js 24; chưa chạy GitHub Actions từ phiên này.

## 2. File tạo/chỉnh sửa

| File                                                                                                  | Thay đổi                                                               |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [src/modules/mangas/mangas.repo.spec.ts](../src/modules/mangas/mangas.repo.spec.ts)                   | Tạo 6 unit test Repository                                             |
| [src/modules/mangas/mangas.service.spec.ts](../src/modules/mangas/mangas.service.spec.ts)             | Tạo 7 unit test Service                                                |
| [src/modules/mangas/dto/create-manga.dto.spec.ts](../src/modules/mangas/dto/create-manga.dto.spec.ts) | Tạo 58 test Zod                                                        |
| [test/mangas.e2e-spec.ts](../test/mangas.e2e-spec.ts)                                                 | Tạo 13 test HTTP/PostgreSQL                                            |
| [test/app.e2e-spec.ts](../test/app.e2e-spec.ts)                                                       | Giữ 2 test hiện có, dùng bootstrap và điều kiện database test an toàn  |
| [test/fixtures/manga.ts](../test/fixtures/manga.ts)                                                   | Fixture entity cho unit test                                           |
| [test/helpers/postgres-test-app.ts](../test/helpers/postgres-test-app.ts)                             | Bootstrap ứng dụng test, global validation pipe và kiểm tra môi trường |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml)                                               | Bật RUN_DB_TESTS=1 cho bước E2E đã có database test                    |
| [docs/testing-report-07.3.5.md](testing-report-07.3.5.md)                                             | Báo cáo này                                                            |

Không sửa business logic production; không commit, push hoặc tạo PR. Các thay đổi có sẵn của người dùng được giữ lại.

## 3. Kết quả từng test case

Bảng dưới lấy trạng thái thực tế từ JSON reporter của Vitest, không suy diễn PASS từ việc đọc code.

### `src/app.controller.spec.ts`

| Tên test case                                                  | Mục đích                                       | Kết quả |
| -------------------------------------------------------------- | ---------------------------------------------- | ------- |
| should return "Hello World!"                                   | Giữ hành vi getHello; không truy vấn database. | PASS    |
| should execute the database health query and return its result | Gọi đúng truy vấn health check và trả kết quả. | PASS    |
| should propagate database errors                               | Giữ nguyên lỗi database của health check.      | PASS    |

### `src/modules/mangas/mangas.repo.spec.ts`

| Tên test case                                            | Mục đích                                                    | Kết quả |
| -------------------------------------------------------- | ----------------------------------------------------------- | ------- |
| R01 findAll returns the TypeORM list                     | Trả đúng danh sách và gọi TypeORM find đúng một lần.        | PASS    |
| R02 findAll returns an empty list                        | Xử lý danh sách rỗng.                                       | PASS    |
| R03 findById queries the ID and returns the manga        | Truy vấn đúng ID và trả Manga tìm thấy.                     | PASS    |
| R04 findById returns null for a missing manga            | Trả null khi TypeORM không tìm thấy Manga.                  | PASS    |
| R05 create builds an entity and returns the saved result | Truyền DTO vào create, lưu đúng entity và trả kết quả save. | PASS    |
| R06 create propagates a save failure                     | Giữ nguyên lỗi phát sinh từ save.                           | PASS    |

### `src/modules/mangas/mangas.service.spec.ts`

| Tên test case                                                         | Mục đích                                                            | Kết quả |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- |
| S01 findAll delegates to the repository and returns its list          | Gọi custom repository đúng một lần và trả đúng danh sách.           | PASS    |
| S02 findById returns an existing manga                                | Truyền đúng ID và trả Manga tồn tại.                                | PASS    |
| S03 findById throws NotFoundException for a missing manga             | Ném NotFoundException khi repository trả null.                      | PASS    |
| S04 createManga forwards the full DTO and returns the saved manga     | Truyền nguyên DTO có đầy đủ optional fields và trả Manga đã lưu.    | PASS    |
| S05 createManga preserves database error 23505 (duplicate key)        | Giữ nguyên QueryFailedError mã 23505; không đổi thành HTTP 409.     | PASS    |
| S06 createManga preserves database error 08006 (connection failure)   | Giữ nguyên lỗi kết nối database mã 08006; không đổi thành HTTP 409. | PASS    |
| S07 findById preserves database errors instead of reporting not found | Không che lỗi database thành lỗi không tìm thấy.                    | PASS    |

### `src/modules/mangas/dto/create-manga.dto.spec.ts`

| Tên test case                                                          | Mục đích                                                          | Kết quả |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- | ------- |
| Z01 accepts required fields without optional fields                    | Chấp nhận DTO chỉ có hai field bắt buộc.                          | PASS    |
| Z02 trims surrounding title whitespace                                 | Chuẩn hóa khoảng trắng đầu/cuối title.                            | PASS    |
| Z03 accepts all optional fields together                               | Chấp nhận đủ các optional fields hợp lệ.                          | PASS    |
| Z-valid accepts title with Vietnamese characters                       | Chấp nhận title chứa tiếng Việt.                                  | PASS    |
| Z-valid accepts one-character title                                    | Chấp nhận title dài 1 ký tự.                                      | PASS    |
| Z-valid accepts title at 255 characters                                | Chấp nhận title đúng 255 ký tự.                                   | PASS    |
| Z-valid accepts slug containing lowercase letters, numbers and hyphens | Chấp nhận slug có chữ thường, số và dấu gạch nối.                 | PASS    |
| Z-valid accepts slug at 255 characters                                 | Chấp nhận slug đúng 255 ký tự.                                    | PASS    |
| Z-valid accepts coverImage at 500 characters                           | Chấp nhận coverImage đúng 500 ký tự.                              | PASS    |
| Z-valid accepts HTTP coverImage                                        | Chấp nhận coverImage dùng HTTP.                                   | PASS    |
| Z-valid accepts author at 150 characters                               | Chấp nhận author đúng 150 ký tự.                                  | PASS    |
| Z-valid accepts artist at 150 characters                               | Chấp nhận artist đúng 150 ký tự.                                  | PASS    |
| Z-valid accepts empty optional author and artist                       | Chấp nhận author và artist là chuỗi rỗng theo schema hiện tại.    | PASS    |
| Z-valid accepts ongoing status                                         | Chấp nhận status ongoing.                                         | PASS    |
| Z-valid accepts completed status                                       | Chấp nhận status completed.                                       | PASS    |
| Z-valid accepts hiatus status                                          | Chấp nhận status hiatus.                                          | PASS    |
| Z-valid accepts cancelled status                                       | Chấp nhận status cancelled.                                       | PASS    |
| Z-valid accepts smallest positive releaseYear                          | Chấp nhận releaseYear bằng 1.                                     | PASS    |
| Z-invalid rejects missing title                                        | Từ chối thiếu title và xác nhận đúng field lỗi.                   | PASS    |
| Z-invalid rejects empty title                                          | Từ chối title rỗng và xác nhận đúng field lỗi.                    | PASS    |
| Z-invalid rejects whitespace-only title                                | Từ chối title chỉ chứa khoảng trắng và xác nhận đúng field lỗi.   | PASS    |
| Z-invalid rejects non-string title                                     | Từ chối title sai kiểu và xác nhận đúng field lỗi.                | PASS    |
| Z-invalid rejects title longer than 255                                | Từ chối title vượt 255 ký tự và xác nhận đúng field lỗi.          | PASS    |
| Z-invalid rejects missing slug                                         | Từ chối thiếu slug và xác nhận đúng field lỗi.                    | PASS    |
| Z-invalid rejects empty slug                                           | Từ chối slug rỗng và xác nhận đúng field lỗi.                     | PASS    |
| Z-invalid rejects uppercase slug                                       | Từ chối slug có chữ hoa và xác nhận đúng field lỗi.               | PASS    |
| Z-invalid rejects slug with spaces                                     | Từ chối slug có khoảng trắng và xác nhận đúng field lỗi.          | PASS    |
| Z-invalid rejects slug with underscore                                 | Từ chối slug có dấu gạch dưới và xác nhận đúng field lỗi.         | PASS    |
| Z-invalid rejects slug with accented letters                           | Từ chối slug có chữ có dấu và xác nhận đúng field lỗi.            | PASS    |
| Z-invalid rejects non-string slug                                      | Từ chối slug sai kiểu và xác nhận đúng field lỗi.                 | PASS    |
| Z-invalid rejects slug longer than 255                                 | Từ chối slug vượt 255 ký tự và xác nhận đúng field lỗi.           | PASS    |
| Z-invalid rejects malformed coverImage                                 | Từ chối coverImage sai định dạng URL và xác nhận đúng field lỗi.  | PASS    |
| Z-invalid rejects non-HTTP coverImage                                  | Từ chối coverImage dùng giao thức FTP và xác nhận đúng field lỗi. | PASS    |
| Z-invalid rejects empty coverImage                                     | Từ chối coverImage rỗng và xác nhận đúng field lỗi.               | PASS    |
| Z-invalid rejects coverImage longer than 500                           | Từ chối coverImage vượt 500 ký tự và xác nhận đúng field lỗi.     | PASS    |
| Z-invalid rejects author longer than 150                               | Từ chối author vượt 150 ký tự và xác nhận đúng field lỗi.         | PASS    |
| Z-invalid rejects non-string author                                    | Từ chối author sai kiểu và xác nhận đúng field lỗi.               | PASS    |
| Z-invalid rejects artist longer than 150                               | Từ chối artist vượt 150 ký tự và xác nhận đúng field lỗi.         | PASS    |
| Z-invalid rejects non-string artist                                    | Từ chối artist sai kiểu và xác nhận đúng field lỗi.               | PASS    |
| Z-invalid rejects unknown status                                       | Từ chối status ngoài 4 giá trị Entity và xác nhận đúng field lỗi. | PASS    |
| Z-invalid rejects uppercase status                                     | Từ chối status viết hoa và xác nhận đúng field lỗi.               | PASS    |
| Z-invalid rejects zero releaseYear                                     | Từ chối releaseYear bằng 0 và xác nhận đúng field lỗi.            | PASS    |
| Z-invalid rejects negative releaseYear                                 | Từ chối releaseYear âm và xác nhận đúng field lỗi.                | PASS    |
| Z-invalid rejects fractional releaseYear                               | Từ chối releaseYear không nguyên và xác nhận đúng field lỗi.      | PASS    |
| Z-invalid rejects string releaseYear                                   | Từ chối releaseYear là chuỗi và xác nhận đúng field lỗi.          | PASS    |
| Z-invalid rejects infinite releaseYear                                 | Từ chối releaseYear là Infinity và xác nhận đúng field lỗi.       | PASS    |
| Z-invalid rejects NaN releaseYear                                      | Từ chối releaseYear là NaN và xác nhận đúng field lỗi.            | PASS    |
| Z-null rejects explicit null for optional coverImage                   | Phân biệt optional và nullable: từ chối null cho coverImage.      | PASS    |
| Z-null rejects explicit null for optional author                       | Phân biệt optional và nullable: từ chối null cho author.          | PASS    |
| Z-null rejects explicit null for optional artist                       | Phân biệt optional và nullable: từ chối null cho artist.          | PASS    |
| Z-null rejects explicit null for optional status                       | Phân biệt optional và nullable: từ chối null cho status.          | PASS    |
| Z-null rejects explicit null for optional releaseYear                  | Phân biệt optional và nullable: từ chối null cho releaseYear.     | PASS    |
| Z-strict rejects unauthorized field id                                 | Xác nhận strictObject từ chối field id.                           | PASS    |
| Z-strict rejects unauthorized field views                              | Xác nhận strictObject từ chối field views.                        | PASS    |
| Z-strict rejects unauthorized field rating                             | Xác nhận strictObject từ chối field rating.                       | PASS    |
| Z-strict rejects unauthorized field createdAt                          | Xác nhận strictObject từ chối field createdAt.                    | PASS    |
| Z-strict rejects unauthorized field updatedAt                          | Xác nhận strictObject từ chối field updatedAt.                    | PASS    |
| Z-strict rejects unauthorized field unexpected                         | Xác nhận strictObject từ chối field unexpected.                   | PASS    |

### `test/app.e2e-spec.ts`

| Tên test case   | Mục đích                                                   | Kết quả |
| --------------- | ---------------------------------------------------------- | ------- |
| / (GET)         | Xác nhận endpoint gốc trả 200 và Hello World!.             | PASS    |
| /debug/db (GET) | Xác nhận health check truy vấn PostgreSQL thật và trả 200. | PASS    |

### `test/mangas.e2e-spec.ts`

| Tên test case                                                                  | Mục đích                                                                   | Kết quả |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------- |
| E01 GET /mangas returns 200 and the seeded manga                               | Xác nhận GET danh sách trả 200 và chứa bản ghi thật đã seed.               | PASS    |
| E02 GET /mangas/:id returns 200 for an existing UUID                           | Xác nhận GET UUID tồn tại trả 200 và dữ liệu chính xác.                    | PASS    |
| E03 GET /mangas/:id returns 404 for a missing UUID                             | Xác nhận GET UUID không tồn tại trả 404.                                   | PASS    |
| E04 GET /mangas/:id returns 400 for a malformed UUID                           | Xác nhận ParseUUIDPipe trả 400 cho UUID sai.                               | PASS    |
| E05 POST /mangas returns 201 and persists the full validated DTO               | Xác nhận POST 201, trim title và lưu đầy đủ dữ liệu vào PostgreSQL.        | PASS    |
| E06 POST /mangas applies database defaults when optional fields are omitted    | Xác nhận các giá trị mặc định/null khi thiếu optional fields.              | PASS    |
| E07 POST /mangas returns 400 for missing title without inserting               | Xác nhận HTTP 400 và số bản ghi database không tăng.                       | PASS    |
| E07 POST /mangas returns 400 for whitespace-only title without inserting       | Xác nhận HTTP 400 và số bản ghi database không tăng.                       | PASS    |
| E07 POST /mangas returns 400 for invalid slug without inserting                | Xác nhận HTTP 400 và số bản ghi database không tăng.                       | PASS    |
| E07 POST /mangas returns 400 for fractional releaseYear without inserting      | Xác nhận HTTP 400 và số bản ghi database không tăng.                       | PASS    |
| E07 POST /mangas returns 400 for unauthorized field without inserting          | Xác nhận HTTP 400 và số bản ghi database không tăng.                       | PASS    |
| E08 duplicate slug returns current HTTP 500 and leaves the original row intact | Ghi nhận HTTP 500 hiện tại cho slug trùng, giữ nguyên bản ghi gốc.         | PASS    |
| E09 PostgreSQL enforces the slug UNIQUE constraint with SQLSTATE 23505         | Xác nhận UNIQUE thực sự từ PostgreSQL qua QueryFailedError/SQLSTATE 23505. | PASS    |

## 4. Tổng hợp và các lệnh đã thực sự chạy

| Nhóm                      |   PASS |  FAIL | SKIPPED |
| ------------------------- | -----: | ----: | ------: |
| MangaRepo                 |      6 |     0 |       0 |
| MangaService              |      7 |     0 |       0 |
| Zod                       |     58 |     0 |       0 |
| AppController unit có sẵn |      3 |     0 |       0 |
| Manga E2E/integration     |     13 |     0 |       0 |
| AppController E2E có sẵn  |      2 |     0 |       0 |
| **Tổng**                  | **89** | **0** |   **0** |

Đã chạy riêng `npm run test:e2e` khi chưa opt in: **15 SKIPPED**, không import AppModule để đọc cấu hình development. Đây là lượt kiểm tra cơ chế bỏ qua an toàn; cả 15 case sau đó đã được chạy lại và PASS với PostgreSQL thật. Không cộng lặp các case này vào tổng cuối cùng.

| Lệnh kiểm tra                                                                                                                   | Kết quả cuối                              |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `npm run format:check`                                                                                                          | FAIL: 6 file production có sẵn            |
| `npm run lint`                                                                                                                  | PASS, exit 0; 1 warning import không dùng |
| `npm run typecheck`                                                                                                             | PASS                                      |
| `npm run build`                                                                                                                 | PASS                                      |
| `npm test -- --reporter=verbose --reporter=json --outputFile=/tmp/nexus-manga-unit-results.json`                                | 74 PASS                                   |
| `npm run test:e2e -- --reporter=verbose --reporter=json --outputFile=/tmp/nexus-manga-e2e-results.json` với môi trường bên dưới | 15 PASS                                   |
| `npm run migration:run` với môi trường test                                                                                     | PASS                                      |
| `git diff --check`                                                                                                              | PASS                                      |

Môi trường được truyền tường minh vào migration và E2E (password chỉ dùng cho container tạm đã xóa):

```bash
NODE_ENV=test PORT=3000 POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=32768 POSTGRES_DB=nexus_manga_test POSTGRES_USER=nexus_manga_test POSTGRES_PASSWORD=nexus_manga_test_only npm run migration:run
RUN_DB_TESTS=1 NODE_ENV=test PORT=3000 POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=32768 POSTGRES_DB=nexus_manga_test POSTGRES_USER=nexus_manga_test POSTGRES_PASSWORD=nexus_manga_test_only npm run test:e2e -- --reporter=verbose --reporter=json --outputFile=/tmp/nexus-manga-e2e-results.json
```

Các lệnh chuẩn bị/dọn môi trường đã chạy:

```bash
docker info --format '{{.ServerVersion}}'
docker image ls --format '{{.Repository}}:{{.Tag}}'
docker run --detach --rm --name nexus-manga-qa-0735 --label purpose=nexus-manga-automated-tests --tmpfs /var/lib/postgresql -e POSTGRES_DB=nexus_manga_test -e POSTGRES_USER=nexus_manga_test -e POSTGRES_PASSWORD=nexus_manga_test_only -p 127.0.0.1::5432 postgres:18-alpine
docker port nexus-manga-qa-0735 5432/tcp
docker exec nexus-manga-qa-0735 pg_isready -U nexus_manga_test -d nexus_manga_test
docker exec nexus-manga-qa-0735 psql -U nexus_manga_test -d nexus_manga_test -v ON_ERROR_STOP=1 -c 'SELECT version(); SELECT count(*) AS remaining_test_rows FROM tbl_mangas; SELECT name FROM migrations;'
docker stop --time 5 nexus-manga-qa-0735
```

Đã chạy Prettier `--write` và `--check` trên các file test/helper, workflow và báo cáo được chỉnh trong nhiệm vụ này. Đã chạy `npm test` ban đầu: 3 test có sẵn PASS; `node --version`, `npm --version` để ghi nhận runtime.

Lần đầu truy cập Docker socket và TCP PostgreSQL bị sandbox chặn. Các thao tác được thực thi lại với quyền phù hợp trên đúng container test và thành công. Một lỗi khai báo kiểu trong helper test phát sinh khi phát triển đã được sửa; typecheck cuối cùng PASS. Không coi lỗi công cụ/môi trường trung gian là lỗi production hay test PASS.

## 5. Phát hiện trong production code

Không phát hiện lỗi chức năng trong các case thuộc yêu cầu đã chạy. Các điểm chất lượng và giới hạn hiện tại:

1. **Format check thất bại từ trước khi thêm test**, tại `src/app.controller.ts`, `src/main.ts`, `src/modules/mangas/dto/create-manga.dto.ts`, `src/modules/mangas/mangas.controller.ts`, `src/modules/mangas/mangas.repo.ts`, `src/modules/mangas/mangas.service.ts`. Chưa sửa các file này trong nhiệm vụ test.
2. **Import `ConflictException` không dùng** tại dòng 1 của `mangas.service.ts`. Lint trả exit 0 nhưng vẫn cảnh báo.
3. **Slug trùng trả HTTP 500** theo exception handling hiện tại. Đây là giới hạn đã được đề bài nêu, không phải test bị fail. PostgreSQL thực sự từ chối insert bằng UNIQUE/23505; Service giữ nguyên lỗi và không tự đổi thành 409.
4. `releaseYear` được schema kiểm tra nguyên dương, chưa có giới hạn trên tương ứng kiểu PostgreSQL INT. Đây là rủi ro nhận thấy khi đọc code, chưa kiểm chứng bằng E2E giá trị vượt INT; không ghi nhận là lỗi đã tái hiện.

## 6. Những trường hợp chưa được kiểm chứng

- Không còn case bắt buộc nào bị bỏ qua trong lượt chạy đầy đủ.
- Chưa chạy workflow GitHub Actions thực tế, Node.js 24 hoặc build Docker image; đã chạy Nest build local thành công. Cần CI xác nhận riêng tính tương thích runtime đó.
- Chưa kiểm tra HTTP 409 vì global exception mapping chưa triển khai.
- Chưa chạy load test, nhiều POST trùng slug đồng thời, database mất kết nối qua HTTP, hoặc mọi biên độ dài qua HTTP. Các biên validation được kiểm tra trực tiếp bằng unit test; HTTP được kiểm tra với các nhóm đầu vào đại diện.
- Chưa đo coverage phần trăm; không suy ra coverage từ số test.
- Chưa test giới hạn trên releaseYear ngoài PostgreSQL INT.

## 7. Đề xuất cải thiện

- Format 6 file nêu trên và bỏ import không dùng; thêm format check vào CI khi baseline đã sạch.
- Khi triển khai global exception handling, map riêng lỗi UNIQUE/23505 sang 409, giữ các lỗi database khác là lỗi hệ thống và cập nhật test HTTP tương ứng. Giữ Service độc lập với mapping này.
- Tách cấu hình ứng dụng dùng chung cho `main.ts` và bootstrap test để tránh lệch global pipes khi thay đổi sau này.
- Xác định giới hạn releaseYear theo nghiệp vụ và kiểu INT trước khi bổ sung validation cùng regression test.
- Duy trì PostgreSQL test riêng trong CI, opt in tường minh và cleanup theo dữ liệu do suite sở hữu. Khi chạy lại local, tạo container mới, lấy cổng mới, truyền đủ biến môi trường và chạy migration trước E2E; không tái sử dụng endpoint development.
