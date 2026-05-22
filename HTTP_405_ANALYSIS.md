# 🔴 HTTP 405 - Method Not Allowed: Phân Tích & Giải Pháp

## I. NGUYÊN NHÂN LỖI HTTP 405

### ✅ Lỗi Tìm Thấy Trong Dự Án
```
❌ File: backend/sever.js  →  TYPO (nên là server.js)
   └─ package.json gọi: "start": "node server.js"
   └─ Kết quả: Backend không khởi động
   └─ Frontend gửi POST → Connection refused/timeout → 405-like error
```

### Các Nguyên Nhân HTTP 405 Phổ Biến

| Lỗi | Triệu Chứng | Fix |
|-----|-----------|-----|
| **Sai HTTP method** | Frontend `GET`, backend `POST` only | Kiểm tra `fetch(...{ method: 'POST' })` |
| **Route chưa khai báo** | Endpoint không tồn tại | Thêm route vào express app |
| **Backend không chạy** | Connection refused | Fix typo, run `npm start` |
| **CORS preflight block** | OPTIONS method reject | Thêm `methods: ['OPTIONS', 'POST']` vào cors config |
| **Middleware sai thứ tự** | Routes trước CORS | CORS PHẢI trước routes |
| **Reverse proxy block** | Nginx/Apache chặn POST | Kiểm tra proxy config |
| **Content-Type sai** | JSON body khi POST multipart | Không set Content-Type cho FormData |
| **Body parser block** | express.json() parse FormData | Multer xử lý FormData, json() riêng biệt |

---

## II. FLOW REQUEST UPLOAD FILE (Chuẩn Chỉnh)

### 1️⃣ Frontend Gửi
```javascript
// ✅ ĐÚNG
const formData = new FormData();
formData.append('studentName', 'Nguyễn Văn A');
formData.append('studentEmail', 'vana@example.com');
formData.append('files', fileObject1);  // File object từ input/drag-drop
formData.append('files', fileObject2);  // Tên field PHẢI khớp backend

const res = await fetch('/api/upload', {  // Dùng relative path hay full URL tùy setup
  method: 'POST',  // ← PHẢI là POST
  body: formData,  // ← fetch tự set Content-Type: multipart/form-data; boundary=...
  // ❌ KHÔNG set headers: { 'Content-Type': 'multipart/form-data' } — browser tự thêm
});
```

### 2️⃣ Browser Tự Động
```
1. Browser thấy FormData → tự sinh boundary uuid
2. Set header: Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
3. Gửi OPTIONS preflight (do cross-origin):
   OPTIONS /api/upload
   Origin: http://localhost:5173
   
4. Chỉ khi OPTIONS 200 OK, mới gửi POST thực
```

### 3️⃣ Backend Express Nhận
```javascript
// middleware thứ tự QUAN TRỌNG
app.use(cors({...}));           // ← 1. CORS PHẢI trước routes
app.use(express.json());        // ← 2. JSON cho routes khác
app.use(express.urlencoded()); // ← 3. URL-encoded cho forms
app.use('/api', routes);        // ← 4. Routes cuối cùng

// Multer parser FormData
router.post('/', 
  upload.array('files', 10),    // ← Field name 'files' PHẢI khớp FormData.append('files', ...)
  async (req, res) => {
    // req.body.studentName, req.files[] available
  }
);
```

---

## III. COMMON MISTAKES & FIXES

### ❌ Mistake 1: JSON thay vì FormData
```javascript
// ❌ SAI
const data = {
  studentName: '...',
  files: [file1.toString('base64'), file2.toString('base64')]
};
await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// ✅ ĐÚNG
const formData = new FormData();
formData.append('studentName', '...');
formData.append('files', file1);  // Native File object
formData.append('files', file2);
await fetch('/api/upload', {
  method: 'POST',
  body: formData  // Browser tự set Content-Type
});
```

### ❌ Mistake 2: Set Content-Type thủ công
```javascript
// ❌ SAI
fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'multipart/form-data' },  // ← SAI, tốn boundary
  body: formData
});
// Kết quả: boundary undefined → server không parse

// ✅ ĐÚNG
fetch('/api/upload', {
  method: 'POST',
  // KHÔNG set Content-Type, browser tự set với boundary chính xác
  body: formData
});
```

### ❌ Mistake 3: Middleware thứ tự sai
```javascript
// ❌ SAI
app.use('/api', routes);  // ← Trước CORS
app.use(cors());          // ← Sau routes, OPTIONS preflight bị block

// ✅ ĐÚNG
app.use(cors());          // ← TRƯỚC routes
app.use('/api', routes);  // ← SAU CORS
```

### ❌ Mistake 4: Field name không match
```javascript
// Frontend
formData.append('files', file);  // field name: "files"

// Backend (❌ SAI)
router.post('/', upload.array('file', 10), ...)  // ← expect "file", nhận "files"

// Backend (✅ ĐÚNG)
router.post('/', upload.array('files', 10), ...)  // ← match "files"
```

### ❌ Mistake 5: express.json() block FormData
```javascript
// ❌ SAI
app.use(express.json());  // Parse tất cả request body như JSON
app.use('/api', routes);
// FormData multipart request bị express.json() reject

// ✅ ĐÚNG
app.use(express.json({ limit: '1mb' }));  // Chỉ parse Content-Type: application/json
app.use(express.urlencoded());
// FormData request tự động pass qua multer middleware
```

---

## IV. CHECKLIST DEBUG THỰC TẾ

### 🔵 Step 1: Backend Chạy Được?
```bash
# Terminal
cd backend
npm install
npm start  # Nên thấy: ✅ Server running at http://localhost:3001

# Hoặc test direct
curl -X GET http://localhost:3001/api/health
# Kỳ vọng: {"success":true,"message":"Server đang chạy..."}
```

### 🔵 Step 2: DevTools Network (Frontend)
```
1. F12 → Network tab
2. Submit form
3. Tìm request "upload" hoặc "api"
4. Kiểm tra:
   - Request URL: http://localhost:3001/api/upload ✓
   - Method: POST ✓
   - Status: 200 ✓ (hoặc 422 validate error)
   - Request Headers:
     * Content-Type: multipart/form-data; boundary=... ✓
     * (KHÔNG phải application/json)
   - Request Payload → Form Data:
     * studentName: ... ✓
     * studentEmail: ... ✓
     * files: (binary) ... ✓
```

### 🔵 Step 3: Console Logs
```javascript
// Frontend (useUpload.js)
console.log('Submitting:', { name, email, files });
console.log('FormData entries:', [...formData.entries()]);

// Backend (routes/upload.js)
console.log('Received body:', req.body);
console.log('Received files:', req.files);
```

### 🔵 Step 4: CORS Preflight
```
DevTools Network:
1. Nếu thấy 2 requests (OPTIONS → POST):
   - OPTIONS preflight ✓ (thường 204 No Content)
   - POST thực ✓ (thường 200)

2. Nếu chỉ thấy OPTIONS, POST không gửi:
   - CORS preflight bị reject
   - Kiểm tra backend cors() config
   
3. Nếu chỉ thấy POST, không thấy OPTIONS:
   - Same-origin request (do proxy Vite)
   - Bình thường ✓
```

### 🔵 Step 5: Postman Test
```
POST http://localhost:3001/api/upload
Body → form-data:
  - studentName: text → "Nguyễn Văn A"
  - studentEmail: text → "vana@example.com"
  - files: file → (chọn file CSS)

Send → Kỳ vọng: 200 success ✓
```

### 🔵 Step 6: Curl Test
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "studentName=Nguyễn Văn A" \
  -F "studentEmail=vana@example.com" \
  -F "files=@./homework.css" \
  -v

# -v show headers (có thể thấy Content-Type multipart)
# Kỳ vọng status: 200
```

---

## V. RESPONSE EXAMPLES

### ✅ Success (200)
```json
{
  "success": true,
  "message": "Nộp bài thành công!",
  "data": {
    "studentName": "Nguyễn Văn A",
    "studentEmail": "vana@example.com",
    "studentNote": "",
    "files": [
      {
        "originalName": "homework.css",
        "savedAs": "1684829123456_a1b2c3d4e5_homework.css",
        "size": 2048,
        "mimeType": "text/css",
        "url": "/uploads/1684829123456_a1b2c3d4e5_homework.css"
      }
    ],
    "submittedAt": "2026-05-23T10:30:45.123Z"
  }
}
```

### ❌ Validation Error (422)
```json
{
  "success": false,
  "errors": [
    "Họ và tên không được để trống.",
    "Email không đúng định dạng."
  ]
}
```

### ❌ No Files (400)
```json
{
  "success": false,
  "message": "Phải đính kèm ít nhất 1 file."
}
```

### ❌ File Too Large (413)
```json
{
  "success": false,
  "message": "File quá lớn. Tối đa 10MB mỗi file."
}
```

### ❌ Invalid MIME Type (400)
```json
{
  "success": false,
  "message": "Loại file không hợp lệ: application/exe"
}
```

### ❌ Method Not Allowed (405)
```json
{
  "success": false,
  "message": "Method \"GET\" không được hỗ trợ. Sử dụng POST."
}
```

---

## VI. BEST PRACTICES

✅ **DO:**
- [ ] FormData cho file upload
- [ ] Để browser set Content-Type
- [ ] CORS trước routes
- [ ] Validate file size + mime type frontend + backend
- [ ] Sanitize filename (tránh path traversal)
- [ ] Rate limit upload endpoint
- [ ] Test OPTIONS preflight
- [ ] Test với Postman/Curl

❌ **DON'T:**
- [ ] JSON + base64 cho file
- [ ] Set Content-Type thủ común cho FormData
- [ ] Multer sau body parser
- [ ] Trust client-side validation (always validate backend)
- [ ] Lưu file vào public/ trực tiếp
- [ ] Không limit file size/count
- [ ] Store user-uploaded filename as-is

---

## VII. SECURITY NOTES

```javascript
// Filename sanitization
const safeBase = filename
  .replace(/[^a-zA-Z0-9_\-\.]/g, '_')  // Chỉ alphanumeric + _ - .
  .slice(0, 60);                       // Max 60 ký tự

// MIME type validation (backend always!)
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'text/css',
  'text/javascript',
  // ... whitelist known types
]);

// File size limits
const MAX_SIZE = 10 * 1024 * 1024;  // 10 MB
const MAX_FILES = 10;

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 20                      // 20 requests/window/IP
}));
```

---

## VIII. PRODUCTION DEPLOYMENT

```bash
# Frontend build (Vite)
npm run build
# → dist/ folder
# Deploy to Vercel/Netlify/GitHub Pages

# Backend deploy
# Heroku/Railway/Render:
# env var: API_URL, ALLOWED_ORIGINS (comma-separated)
npm start

# Docker
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

---

## IX. TROUBLESHOOTING TREE

```
Frontend báo lỗi?
├─ Toast "Thất bại - 405"?
│  ├─ Backend chạy chưa? → npm start backend/
│  ├─ Method POST? ✓ useUpload.js
│  ├─ CORS header có? → DevTools Network
│  └─ Options preflight pass? → Kiểm tra cors config
│
├─ Toast "Connection refused"?
│  ├─ Backend port 3001 open? → lsof -i :3001 (Mac/Linux)
│  ├─ URL đúng? → API_URL env var
│  └─ Firewall block? → Check antivirus
│
├─ Toast "Invalid file"?
│  ├─ MIME type allowed? → Kiểm tra ALLOWED_MIMES backend
│  └─ File size < 10MB? → Check file
│
└─ Network status 200 nhưng toast fail?
   ├─ Response JSON valid? → DevTools Network → Response tab
   └─ res.ok check? → Line useUpload.js #91

Backend log lỗi?
├─ TypeError: Cannot read property 'files' of undefined
│  └─ Multer middleware không chạy → Check field name
│
├─ File filter error
│  └─ MIME type blocked → Whitelist file type
│
└─ LIMIT_FILE_SIZE
   └─ File > 10MB → User upload smaller file
```

---

**Created:** 2026-05-23  
**Last Updated:** 2026-05-23
