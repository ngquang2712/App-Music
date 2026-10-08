# Bản sửa YouTube – 05/10/2026

## Chạy trên Windows

1. Giải nén toàn bộ ZIP vào một thư mục mới, ví dụ `C:\OmniMusic_fix`.
2. Chạy `CaiDatVaChay.bat`. Script biên dịch source mới bằng `cargo run --release` rồi mở app. Lần đầu cần mạng để Cargo tải thư viện.
3. Tìm một bài hát trong bộ lọc YouTube và thử phát.

Nếu đã cài Rust và từng chạy `cargo run` thành công thì dùng ngay các bước trên. Nếu chưa có môi trường build, cài Rust bản MSVC và Visual Studio Build Tools với mục **Desktop development with C++**, đồng thời có WebView2. Hướng dẫn chính thức: https://v2.tauri.app/start/prerequisites/#windows

Có thể chạy thủ công trong PowerShell tại thư mục `done_10_3`:

```powershell
cd .\MaNguonTauri
cargo run --release
```

Để tạo EXE dùng cho những lần sau, chạy `BuildBanChaySan.bat`, sau đó mở `UngDungChaySan\KhoiChay.bat`. Giữ nguyên các thư mục đi kèm. Bản ZIP này chứa source đã sửa và engine; chưa chứa EXE của app đã biên dịch lại. EXE cũ trong bản gốc đã được bỏ khỏi gói sửa để tránh chạy nhầm code cũ.

## Engine

- `DuLieu\ThucThi\yt-dlp.exe`: nightly chính thức `2026.09.27.232945`.
- `DuLieu\ThucThi\deno.exe`: Deno `2.9.7` cho Windows x64, dùng để giải các thử thách JavaScript của YouTube.
- Cả hai đã được đối chiếu checksum SHA-256 với release chính thức.
- Khi cần cập nhật về sau: đóng app và chạy `CapNhatEngine.bat`. Script tải từ GitHub chính thức, kiểm tra checksum và giữ bản cũ trong file `.bak`.
- Muốn dùng kênh stable: mở PowerShell tại thư mục gốc và chạy `powershell -NoProfile -ExecutionPolicy Bypass -File .\CapNhatEngine.ps1 -Channel stable`.

## Các lỗi đã sửa

- Code cũ tìm `data/bin/yt-dlp.exe`, trong khi engine được đóng gói ở `DuLieu/ThucThi`. Bộ tìm đường dẫn mới hỗ trợ cả hai cấu trúc, thư mục build sâu và tài nguyên Tauri.
- Bản engine gốc khớp stable `2026.08.19`; không thể quy lỗi chỉ cho phiên bản cũ. Gói sửa cập nhật nightly và bổ sung runtime JavaScript còn thiếu.
- Thay cách lấy link InnerTube với phiên bản client hardcode bằng `yt-dlp`; tìm kiếm cũng dùng `yt-dlp`.
- Đọc metadata JSON để chọn âm thanh HTTPS trực tiếp, trả đúng MIME của M4A/WebM và giữ header từ extractor; không đưa playlist HLS vào proxy âm thanh trực tiếp.
- Giảm thời gian cache URL, kiểm tra hạn URL và giới hạn thời gian chạy engine.
- Proxy giữ header và mã lỗi từ máy chủ, hỗ trợ HTTP Range và URL dài hơn 4 KiB.
- Khôi phục 22 hàm bridge `GiaoDienUngDung` với backend, bộ biểu tượng và các hàm tiện ích bị thiếu.
- Bổ sung lệnh lưu playlist đúng ID và kết nối các nút tải nhạc/mở thư mục đã có sẵn trên giao diện.
- Bật `custom-protocol` mặc định để `cargo run` nhúng giao diện; khai báo capability và đóng gói engine trong tài nguyên Tauri.

## Kiểm tra đã thực hiện

- Biên dịch các module dịch vụ Rust bằng harness độc lập; kiểm tra kiểu của phần logic commands qua lớp giả lập Tauri. Đây không phải bản build đầy đủ của app Tauri Windows.
- 5 kiểm tra tự động về đường dẫn, URL, metadata, header, hạn URL và proxy HTTP đều qua.
- Chạy giao diện trong DOM mô phỏng: khởi tạo, tìm kiếm, 22 hàm bridge, 23 biểu tượng, lệnh backend, lưu cấu hình và giữ ID playlist đều qua; không có lỗi JavaScript trong các luồng được kiểm tra.
- Engine nightly thực tế chọn đúng M4A từ metadata mẫu.
- Chưa kiểm tra phát YouTube trực tiếp: kết nối YouTube từ môi trường kiểm tra bị timeout. Chưa build/chạy app trên Windows. Bài kiểm tra mạng SoundCloud có sẵn không chạy được ở môi trường này.

Nguồn chính thức:

- https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/tag/2026.09.27.232945
- https://github.com/yt-dlp/yt-dlp/wiki/EJS
- https://v2.tauri.app/develop/calling-rust/
