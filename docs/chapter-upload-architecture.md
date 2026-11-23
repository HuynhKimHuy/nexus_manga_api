# Bản đồ code upload chương

## Phân công từng file

Các đường dẫn dưới đây tính từ src/modules/chapters, trừ khi ghi rõ.

| File                                                  | Công việc                                                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| chapters.controller.ts                                | Nhận request tạo, xem, sửa, xóa chapter; lấy mangaId từ URL. PATCH status=published đi qua đây.                   |
| chapter.service.ts                                    | Kiểm tra manga/chapter tồn tại, tạo draft, xử lý lỗi nghiệp vụ và gọi repository.                                 |
| repositories/chapters.repo.ts                         | CRUD chapter; khóa chapter và kiểm tra trang liên tục, ready trước khi publish.                                   |
| chapters.entity.ts                                    | Ánh xạ bảng tbl_chapters bằng TypeORM.                                                                            |
| chapter-pages.controller.ts                           | Nhận multipart images/image, đọc tham số, giới hạn số file và gọi service. Khai báo Swagger.                      |
| chapter-pages.upload.ts                               | Các giới hạn dùng chung, kiểu page, đọc startPage, sắp tên tự nhiên và kiểm tra chữ ký ảnh. Không truy cập DB/R2. |
| chapter-pages.service.ts                              | Điều phối chuẩn bị ảnh → kiểm tra → upload R2 → lưu batch; dọn R2 khi lỗi; tạo response URL.                      |
| repositories/chapter-pages.repo.ts                    | Kiểm tra chapter draft và số trang trống, lưu batch trong transaction, đọc trang theo thứ tự. Không gọi R2.       |
| chapters.module.ts                                    | Đăng ký controller, service, repository và module R2.                                                             |
| dto/create-chapter.dto.ts                             | Kiểm tra dữ liệu tạo chapter: số chương, tiêu đề, trạng thái.                                                     |
| dto/update-chapter.dto.ts                             | Kiểm tra dữ liệu cập nhật chapter.                                                                                |
| dto/pagination-query.dto.ts                           | Kiểm tra phân trang và lọc trạng thái.                                                                            |
| dto/chapter-response.schema.ts                        | Mô tả response chapter và danh sách chapter.                                                                      |
| ../storage/r2-client.provider.ts                      | Tạo S3 client kết nối Cloudflare R2.                                                                              |
| ../storage/r2-storage-service.ts                      | Upload/xóa object, dựng URL public; có sẵn hàm ký URL và đọc metadata cho luồng khác.                             |
| ../storage/r2.module.ts                               | Cung cấp client và storage service qua dependency injection.                                                      |
| ../storage/type/r2.type.ts                            | Kiểu metadata object R2.                                                                                          |
| ../../database/migrations/1795276383116-CreatePage.ts | Tạo bảng page, ràng buộc số trang duy nhất trong chapter và khóa ngoại.                                           |
| chapter-pages.controller.spec.ts                      | Test multipart 50 ảnh, startPage, endpoint một ảnh và lỗi request.                                                |
| chapter-pages.service.spec.ts                         | Test upload cùng repository với DB/R2 mock: sắp tên, lỗi, cleanup, conflict, đọc trang, publish.                  |
| chapter.service.spec.ts                               | Test nghiệp vụ CRUD chapter.                                                                                      |
| chapters.controller.spec.ts                           | Test HTTP CRUD chapter và kiểm tra chapter thuộc manga.                                                           |
| dto/chapter.dto.spec.ts                               | Test validation DTO chapter.                                                                                      |
| ../storage/r2-storage-service.spec.ts                 | Test cấu hình URL và ký upload R2.                                                                                |

## Luồng sử dụng API

1. POST /mangas/:mangaId/chapters tạo chapter draft, nhận chapterId.
2. POST /mangas/:mangaId/chapters/:chapterId/pages nhận nhiều file images, không giới hạn cố định số lượng, và startPage (mặc định 1).
3. Chuẩn bị toàn bộ ảnh: kiểm tra, sắp 1.jpg → 2.jpg → 10.jpg và đánh số từ startPage.
4. Kiểm tra chapter thuộc manga, còn draft, khoảng số trang chưa được dùng.
5. Upload R2 ngoài transaction. Giữ objectKey của từng ảnh để cleanup nếu có lỗi.
6. Mở transaction, khóa chapter, kiểm tra lại trạng thái và trùng trang, lưu toàn bộ batch rồi commit.
7. GET /pages xem thứ tự và URL; upload thêm với startPage tiếp theo nếu cần.
8. PATCH chapter với status=published. Chỉ cho phép khi có ít nhất một trang và tất cả trang ready, liên tục từ 1.

Nếu upload/lưu lỗi: không lưu một phần batch; cố gắng xóa các object của request.
Nếu cleanup lỗi: ghi objectKey vào log để xử lý. API hiện chưa có cơ chế phục hồi khi
process bị tắt đột ngột giữa upload và commit.

## Mức hoàn thiện và việc tiếp theo

Đã có: tạo draft, upload batch theo tên, xem trang, publish có kiểm tra,
transaction và cleanup khi lỗi được bắt. Không cần migration mới cho refactor.

Để xác nhận hoàn tất API upload trên môi trường thật:

- Chạy flow với PostgreSQL và bucket R2 thật: tạo draft → 50 ảnh → GET đúng thứ tự → publish.
- Test tích hợp với PostgreSQL thật cho rollback giữa batch, hai request trùng số trang,
  và upload đồng thời publish. Các test hiện tại dùng mock cho DB/R2.
- Kiểm tra ảnh ở URL public và xử lý lỗi R2/DB bằng log đủ thông tin nhưng không lộ credentials.

Để hoàn thiện công cụ đăng truyện thực tế:

- Thêm thay/xóa trang, sửa thứ tự để xử lý ảnh đăng nhầm.
- Quy định xóa chapter có page; hiện khóa ngoại RESTRICT có thể gây 500 chưa được ánh xạ.
- Phân quyền người đăng và tách API đọc public khỏi quản trị draft. Hiện draft không ẩn URL public.
- Nếu cần xác nhận đủ tổng số ảnh, thêm số trang dự kiến; hiện trang 1–3 vẫn publish được dù người đăng định gửi 50 trang.
- Nếu cần phục hồi sau crash, thêm quy trình đối soát/dọn object mồ côi; không gộp vào refactor này.

Refactor này tối ưu khả năng đọc và bảo trì, không thay đổi cách upload tuần tự hay
tuyên bố tăng tốc độ. Kiểm tra chữ ký ảnh hiện không thay thế việc giải mã ảnh hoàn chỉnh.

## Import CBZ

- chapter-pages.cbz.ts: đọc archive, lọc metadata, kiểm tra CRC, giới hạn giải nén;
  trả ảnh cho uploadBatch, không ghi file ra ổ đĩa.
- chapter-pages.cbz.spec.ts: test CBZ thật, thư mục con, mã hóa, archive lỗi và giới hạn.
- test/fixtures/cbz.ts (từ gốc repo): tạo ZIP fixture cho test, không dùng trong runtime.
- chapter-pages.controller.ts: thêm POST /pages/import nhận field archive và startPage.
- chapter-pages.service.ts: importCbz đọc archive rồi gọi uploadBatch; không nhân đôi luồng lưu.

Không cần migration mới. Sau import, GET /pages để kiểm tra rồi publish như cũ.
