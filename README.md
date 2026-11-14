# Nộp Bài — Landing page

HTML5, CSS3, JavaScript thuần, Bootstrap 5 và Axios. Gồm form nộp bài lên Google Drive.

## Chạy

Mở `frontend/index.html`, hoặc chạy tại thư mục dự án:

```sh
python -m http.server 5173 --bind 127.0.0.1 --directory frontend
```

Truy cập <http://127.0.0.1:5173>. Không cần cài package hoặc build. Cần Internet để tải Bootstrap từ CDN và gửi bài lên Drive.

## Cấu trúc

```text
frontend/index.html      Landing page và form
frontend/styles.css      Giao diện responsive
frontend/app.js          Tương tác và xác nhận nộp bài
frontend/upload-core.js  Kiểm tra file, gửi và xác nhận kết quả
frontend/vendor/axios/   Axios 1.21.1 bản trình duyệt, source map và giấy phép MIT
GoogleAppsScript.gs      Backend chạy trên Google Apps Script
appsscript.json          Manifest, quyền Drive và URL Fetch
tests/upload.test.cjs    Kiểm tra bằng JavaScript
```

## Cập nhật Google Apps Script

1. Chép `GoogleAppsScript.gs` vào dự án Apps Script. Đặt `UPLOAD_FOLDER_ID` thành ID thư mục nhận bài; tài khoản chạy script phải có quyền tạo file và đủ dung lượng Drive.
2. Trong **Project Settings**, bật hiển thị manifest `appsscript.json`; cập nhật nội dung theo file cùng tên trong dự án. Manifest khai báo quyền Drive, URL Fetch và dịch vụ Drive API v3. Nếu dùng Cloud project riêng, bật Google Drive API trong Google Cloud Console.
3. Chạy hàm `authorizeUpload` một lần trong Apps Script để cấp quyền cho tài khoản nhận bài.
4. Chọn **Deploy → Manage deployments → Edit → New version → Deploy** để cập nhật bản đang chạy. Với triển khai mới, chọn **Web app**, chạy dưới tài khoản của bạn và cho phép người cần nộp bài truy cập. Người nộp chỉ nhập họ tên và Student ID.
5. Nếu URL Web app thay đổi, cập nhật `API_URL` ở đầu `frontend/app.js` bằng URL kết thúc `/exec`.

Sửa file `.gs` trên máy chưa cập nhật bản Google đang chạy; cần triển khai phiên bản mới trong Apps Script.

Mở URL `/exec` để kiểm tra API: bản đã cập nhật trả JSON có `service: "nop-bai"`, `status: "online"` và `protocol: "resumable-v3"`. Kiểm tra này chỉ xác nhận API truy cập được, không tạo file hoặc xác nhận quyền ghi Drive. Với trang nộp bài công khai, bản triển khai cần cho phép người nộp truy cập mà không dùng tài khoản của người quản lý.

API nhận POST JSON với Content-Type `text/plain;charset=utf-8`, trả `protocol: "resumable-v3"`. Giao diện từ chối phiên bản cũ để bảo đảm dữ liệu gửi khớp phiên bản máy chủ:

Giao diện gọi API bằng `axios.post`, gửi chuỗi JSON với Content-Type `text/plain;charset=utf-8`, không gửi cookie hoặc token XSRF và có timeout 6 phút cho mỗi request. Axios được lưu sẵn trong `frontend/vendor/axios/`, không cần CDN hoặc npm để tải thư viện này khi mở trang. Vẫn cần triển khai đúng Apps Script và quyền truy cập; Axios không bỏ qua CORS hay sửa URL trả 404. Lỗi HTTP, timeout và mất kết nối được xử lý riêng, chỉ báo thành công khi xác nhận đủ file.

- `action: "start"`: nhận `studentName`, `studentId`, `studentClass`, `course` và `files` chứa metadata `name`, `mimeType`, `size`. Backend kiểm tra thông tin người nộp và lớp, rồi trả các vé tải lên có chữ ký; chưa báo đã lưu file.
- `action: "chunk"`: nhận `ticket`, `offset`, `base64` của một phần file. Backend chuyển phần này vào phiên resumable upload của Drive.
- `action: "status"`: kiểm tra số byte Drive đã nhận để tiếp tục sau lỗi kết nối.

Tối đa **10 file, 1 GB mỗi file** (1.073.741.824 byte). Mỗi lần chỉ đọc và gửi **8 MB**, không mã hóa hoặc giữ nguyên file 1 GB trong bộ nhớ. Các file được xử lý lần lượt. Sau lỗi mạng hoặc lỗi tạm thời, tự hỏi trạng thái Drive trước khi tiếp tục, tối đa ba lần thử lại. Giữ trang mở trong lúc tải; không khôi phục phiên sau khi đóng hoặc tải lại trang.

Backend kiểm tra giới hạn dung lượng, vé có chữ ký, offset và dung lượng từng phần; chỉ xác nhận hoàn tất khi Drive trả đủ dung lượng và đúng thư mục nhận bài. Chỉ các file chưa hoàn tất được giữ lại nếu lô nộp lỗi giữa chừng. Tên file trên Drive gồm lớp, mã sinh viên, họ tên, học phần và tên file gốc. OAuth token và khóa ký chỉ ở Apps Script.

## Thông tin nộp bài

Người nộp nhập họ tên, Student ID và **Lớp** bằng ô text, ví dụ `AI25DA`. Lớp được chuẩn hóa thành chữ hoa. **Học phần** dùng ô input text một dòng, tối đa 150 ký tự. Giao diện, phần xác nhận và API dùng cùng các trường thông tin này.

Luồng này sử dụng [resumable upload của Drive](https://developers.google.com/workspace/drive/api/guides/manage-uploads#resumable), chia nhỏ request để phù hợp [giới hạn Apps Script](https://developers.google.com/apps-script/guides/services/quotas). Quota Apps Script và dung lượng tài khoản Drive vẫn áp dụng. Kiểm tra cục bộ mô phỏng giao thức; chưa thay thế kiểm tra tải file lớn trên bản Apps Script đã triển khai.

## Kiểm tra

Cần Node.js, không cần cài package:

```sh
node --test tests/upload.test.cjs
```

Kiểm tra mô phỏng HTTP và Drive, không tải file thật.

Kiểm tra URL API đang cấu hình bằng request thực:

```sh
node scripts/check-api.cjs
```

Lệnh dùng Axios, chỉ gửi GET và POST chẩn đoán với danh sách file rỗng; không tải file thật. Báo cáo gồm HTTP status, chuyển hướng, Content-Type, header CORS và phiên bản API. Nếu GET và POST trả 404 hoặc trang đăng nhập thay vì JSON, kiểm tra Web app URL và quyền truy cập trong **Deploy → Manage deployments**, rồi cập nhật `API_URL` ở `frontend/app.js`. Header CORS được báo cáo để chẩn đoán; lệnh này không thay thế kiểm tra trong trình duyệt.

## GitHub Pages

Workflow `.github/workflows/deploy.yml` xuất bản trực tiếp `frontend/`. Chọn **GitHub Actions** tại **Settings → Pages** của repository.
