# ⚡ QUICKSTART — 5 Phút Để Upload Thành Công

## 🎯 Mục tiêu

Khắc phục lỗi **"Thất bại - Server báo lỗi: 405"** và upload file thành công.

---

## 🔴 Vấn đề Gốc (Đã Fix)

```
❌ Backend file: sever.js  →  TYPO (nên là server.js)
✅ Solution: Đã rename thành server.js
   Backend sẽ khởi động thành công khi chạy npm start
```

---

## ✅ Step 1: Cài Đặt (1 phút)

### Terminal 1: Backend
```bash
cd backend
npm install
npm start
```

**Kỳ vọng:**
```
✅ Server running at http://localhost:3001
   Allowed origins: http://localhost:5173
```

### Terminal 2: Frontend
```bash
cd frontend
npm install
npm run dev
```

**Kỳ vọng:**
```
✅ Local: http://localhost:5173
```

---

## ✅ Step 2: Test Direct (Backend)

### cURL Test (Terminal 3)

```bash
# Test health
curl http://localhost:3001/api/health
# Kỳ vọng: {"success":true,"message":"Server đang chạy..."}

# Test upload
curl -X POST http://localhost:3001/api/upload \
  -F "studentName=Test User" \
  -F "studentEmail=test@example.com" \
  -F "files=@test.css"

# Kỳ vọng: {"success":true,"message":"Nộp bài thành công!","data":{...}}
```

---

## ✅ Step 3: Test Frontend (2 phút)

1. **Mở browser:** `http://localhost:5173`

2. **Điền form:**
   - Họ tên: `Nguyễn Văn A`
   - Email: `vana@example.com`
   - Ghi chú: `Lớp B1` (optional)
   - File: Chọn file `.css` hoặc `.pdf`

3. **Click:** "Nộp bài"

4. **Kỳ vọng:**
   - ✅ Toast hiện: **"Nộp bài thành công! 🎉"** (green toast)
   - ✅ Form reset
   - ✅ DevTools Network tab status: `200 OK`

---

## ❌ Nếu Lỗi, Debug Ngay Tại Đây

### 1️⃣ Hiển Thị Lỗi: "Connection refused"

```
❌ Nguyên nhân: Backend không chạy
✅ Fix:
   □ Terminal 1: npm start in backend/
   □ Kiểm tra: curl http://localhost:3001/api/health
```

### 2️⃣ Hiển Thị Lỗi: "Thất bại - Server báo lỗi: 405"

```
❌ Nguyên nhân: HTTP Method sai hoặc CORS block
✅ Fix:
   □ Mở DevTools (F12) → Network tab
   □ Submit form lại
   □ Tìm request "upload"
   □ Kiểm tra:
      • Method: POST (không phải GET)
      • Status: 200 (không phải 405)
      • Headers → Content-Type: multipart/form-data; boundary=...
   □ Nếu OPTIONS request → Status 200?
      • Không: CORS issue, check backend server.js cors config
   □ Nếu POST → Status 405: Route không support POST
      • Check backend routes/upload.js (should be router.post)
```

### 3️⃣ Hiển Thị Lỗi: "⚠ Nhập họ và tên." hoặc "⚠ Chọn ít nhất 1 file."

```
❌ Nguyên nhân: Form validation fail (frontend)
✅ Fix:
   □ Điền đầy đủ: Họ tên + Email + File
   □ Email format: xxx@xxx.xxx
   □ File size: < 10MB
```

### 4️⃣ File Type "Loại file không hợp lệ"

```
❌ Nguyên nhân: MIME type blocked
✅ Fix:
   □ Allowed types: PDF, DOC, DOCX, XLS, XLSX, CSS, JS, TXT, ZIP, Images
   □ Try: Upload file .pdf hoặc .txt
   □ Add type: Edit backend/middleware/multerConfig.js → ALLOWED_MIMES
```

### 5️⃣ Network Show "No status code"

```
❌ Nguyên nhân: Server không chạy hoặc port wrong
✅ Fix:
   □ Backend port: 3001? 
      • Check: lsof -i :3001 (Mac/Linux)
      • Check: netstat -ano | findstr :3001 (Windows)
   □ Terminal 1: npm start backend/
   □ Wait 3 sec for server start
```

---

## 🧪 DevTools Network Checklist

Khi submit form, DevTools Network tab sẽ hiện request "upload":

```
✅ CORRECT:
┌─ Request
│  ├─ URL: http://localhost:3001/api/upload
│  ├─ Method: POST ← PHẢI là POST
│  ├─ Status: 200 ← PHẢI là 200
│  └─ Headers:
│     ├─ Content-Type: multipart/form-data; boundary=----... ← ĐÚNG
│     └─ (Không phải application/json)
│
└─ Response
   ├─ Body: {"success":true,"message":"Nộp bài thành công!","data":{...}}
   └─ Status: 200 OK

❌ WRONG:
┌─ Request
│  ├─ Status: 405 ← SAI: Method not allowed
│  └─ OR Status: (no status) ← SAI: Connection refused
│
└─ Response
   └─ {"success":false,"message":"Method \"GET\" không được hỗ trợ..."}
```

---

## 📞 Still Broken?

1. **Check all 3 services running:**
   ```bash
   # Terminal 1 output
   ✅ Server running at http://localhost:3001
   
   # Terminal 2 output
   ✅ Local: http://localhost:5173
   
   # Terminal 3
   curl http://localhost:3001/api/health
   # Expect: 200 OK, JSON response
   ```

2. **Console logs:**
   - Frontend: Browser DevTools Console (F12)
   - Backend: Terminal 1 output
   - Network: DevTools Network tab (F12)

3. **Read full docs:**
   - [HTTP_405_ANALYSIS.md](./HTTP_405_ANALYSIS.md) — Deep troubleshooting
   - [TESTING_GUIDE.md](./TESTING_GUIDE.md) — Advanced testing
   - [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) — Production

---

## 🎉 Success!

Khi thấy **"Nộp bài thành công! 🎉"** toast:

1. ✅ File đã upload thành công
2. ✅ File lưu tại: `backend/uploads/[timestamp]_[random]_[filename]`
3. ✅ Có thể download qua: `http://localhost:3001/uploads/[filename]`

---

## 📝 Next Steps

- [ ] Test với file khác nhau (.pdf, .doc, .zip, v.v.)
- [ ] Test với multiple files (drag 2-3 files)
- [ ] Test file > 10MB (should fail)
- [ ] Test invalid email format (should fail)
- [ ] Xem hướng dẫn deployment: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

---

**Created:** 2026-05-23  
**Status:** ✅ Ready to use
