# 🚀 Nộp Bài Tập — Upload Portal

Production-ready file upload system với React + Express + Multer.

## 📂 Cấu trúc Dự Án

```
nopbaidrive/
├── backend/
│   ├── middleware/
│   │   └── multerConfig.js      ← Cấu hình multer + whitelist MIME
│   ├── routes/
│   │   └── upload.js            ← POST /api/upload handler
│   ├── uploads/                 ← Thư mục lưu file (auto-created)
│   ├── server.js                ← Express app + CORS + rate-limit
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── UploadForm.jsx   ← Form UI component
│   │   ├── hooks/
│   │   │   └── useUpload.js     ← Upload logic + FormData + fetch
│   │   ├── App.jsx              ← Root component
│   │   └── main.jsx
│   ├── vite.config.js           ← Vite config + /api proxy
│   ├── index.html
│   └── package.json
│
├── HTTP_405_ANALYSIS.md         ← 📋 Chi tiết phân tích lỗi 405
├── TESTING_GUIDE.md             ← 🧪 Hướng dẫn testing (curl/Postman)
├── DEPLOYMENT_CHECKLIST.md      ← 🚀 Deployment guide + production configs
├── .env.example                 ← Mẫu environment variables
└── README.md                    ← File này
```

---

## ⚡ Quick Start

### 1️⃣ Cài đặt Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (tab terminal khác)
cd frontend
npm install
```

### 2️⃣ Chạy Development

```bash
# Terminal 1: Backend
cd backend
npm run dev
# ✅ Output: ✅ Server running at http://localhost:3001

# Terminal 2: Frontend
cd frontend
npm run dev
# ✅ Output: ✅ Local: http://localhost:5173
```

### 3️⃣ Test Upload

1. Mở browser: `http://localhost:5173`
2. Điền form:
   - Họ tên: "TrMinh"
   - Email: "trminhcsc@gmail.com"
   - Ghi chú: "Lớp IT"
   - File: Chọn file .css
3. Click "Nộp bài"
4. ✅ Toast success: "Nộp bài thành công! 🎉"

---

## 🔧 Cấu Hình Environment

### Backend (.env)

```bash
NODE_ENV=development
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (.env.local)

```bash
VITE_API_URL=http://localhost:3001
```

---

### DevTools Network Tab
1. F12 → Network tab → Submit form
2. Tìm request "upload"
3. Kiểm tra:
   - ✅ Method: POST
   - ✅ Status: 200
   - ✅ Content-Type: multipart/form-data; boundary=...
   - ✅ Response: JSON success

### Postman Test
```
POST http://localhost:3001/api/upload
Body → form-data:
  ├─ studentName: text → "TrMinh"
  ├─ studentEmail: text → "trminhcsc@gmail.com"
  └─ files: file → [chọn file .css]

Expected: 200 OK + JSON response
```

### cURL Test
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "studentName=TrMinh" \
  -F "studentEmail=trminhcsc@gmail.com" \
  -F "files=@./test.css" \
  -v
```

Xem hướng dẫn đầy đủ: **[TESTING_GUIDE.md](./TESTING_GUIDE.md)**

---

## 📝 API Endpoints

### POST /api/upload

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `studentName` (text, required)
  - `studentEmail` (text, required)
  - `studentNote` (text, optional)
  - `files` (file[], required, max 10 files, 10MB each)

**Response Success (200):**
```json
{
  "success": true,
  "message": "Nộp bài thành công!",
  "data": {
    "studentName": "TrMinh",
    "studentEmail": "trminhcsc@gmail.com",
    "studentNote": "Lớp CNTT-01",
    "files": [
      {
        "originalName": "homework.css",
        "savedAs": "1684829123456_a1b2c3_homework.css",
        "size": 2048,
        "mimeType": "text/css",
        "url": "/uploads/1684829123456_a1b2c3_homework.css"
      }
    ],
    "submittedAt": "2026-05-23T10:30:45.000Z"
  }
}
```

**Response Error (422):**
```json
{
  "success": false,
  "errors": [
    "Họ và tên không được để trống.",
    "Email không đúng định dạng."
  ]
}
```

### GET /api/health

Health check endpoint.

**Response (200):**
```json
{
  "success": true,
  "message": "Server đang chạy.",
  "timestamp": "2026-05-23T10:30:45.000Z"
}
```

---

## 📋 Features

✅ **Frontend:**
- Dark modern UI (TailwindCSS)
- Drag & drop upload
- Multiple file selection
- File validation (size, type)
- Real-time progress bar
- Toast notifications (Sonner)
- Responsive design
- Form validation

✅ **Backend:**
- Express.js server
- Multer file upload middleware
- Filename sanitization
- MIME type whitelist
- File size limits (10MB per file, max 10 files)
- Rate limiting (20 req/15min per IP)
- CORS properly configured
- Global error handling
- Security headers (Helmet)

✅ **Production Ready:**
- Environment variables support
- Structured logging
- Error handling
- Docker support
- Deployment guides

---

## 🔒 Security Features

- ✅ Filename sanitization (prevent path traversal)
- ✅ MIME type validation (whitelist approach)
- ✅ File size limits
- ✅ Rate limiting per IP
- ✅ CORS validation
- ✅ Security headers (Helmet)
- ✅ Input validation (email format, name length)
- ✅ HTTPS ready

---

## 🎯 Allowed File Types

```javascript
// From: backend/middleware/multerConfig.js
'application/pdf'                                          // .pdf
'application/msword'                                       // .doc
'application/vnd.openxmlformats-officedocument...'        // .docx
'application/vnd.ms-excel'                                 // .xls
'application/vnd.openxmlformats-officedocument...'        // .xlsx
'image/jpeg', 'image/png', 'image/gif', 'image/webp'      // images
'text/plain', 'text/css', 'text/javascript'               // text
'application/json'                                         // .json
'application/zip', 'application/x-rar-compressed'         // archives
```

---

## 🚀 Deployment

### Production Checklist
- [ ] Backend deployed (Vercel/Railway/VPS)
- [ ] Frontend deployed (Vercel/Netlify)
- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] CORS updated with production domain
- [ ] File storage configured (local/S3/Cloudinary)
- [ ] Error tracking setup (Sentry)
- [ ] Monitoring setup

See: **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)**

---

## 🛠️ Development Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Frontend** | React | 18.3.1 |
| | Vite | 5.3.4 |
| | TailwindCSS | 3.4.6 |
| | Sonner (Toast) | 1.5.0 |
| **Backend** | Node.js | 18+ |
| | Express | 4.19.2 |
| | Multer | 1.4.5-lts.1 |
| | CORS | 2.8.5 |
| | Helmet | 7.1.0 |

---

## 📚 Documentation

1. **[HTTP_405_ANALYSIS.md](./HTTP_405_ANALYSIS.md)** — Deep dive into HTTP 405 errors
2. **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** — Testing with curl, Postman, DevTools
3. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** — Production deployment guide

---

## 🔧 Common Issues & Fixes

### Issue: 405 Method Not Allowed

**Causes:**
1. ❌ Backend file typo: `sever.js` vs `server.js` → **✅ Fixed**
2. ❌ Frontend sends GET → **✅ Check useUpload.js uses POST**
3. ❌ CORS blocks OPTIONS preflight → **✅ Add OPTIONS to cors methods**
4. ❌ express.json() blocks FormData → **✅ Multer handles FormData separately**

### Issue: Files Not Received

**Causes:**
1. ❌ Field name mismatch: `files` vs `file` → **✅ Both must use `files`**
2. ❌ JSON sent instead of FormData → **✅ Use FormData API**
3. ❌ Content-Type set manually → **✅ Let browser set it automatically**

### Issue: CORS Error

**Causes:**
1. ❌ CORS middleware after routes → **✅ CORS must be before routes**
2. ❌ Origin not in whitelist → **✅ Add to ALLOWED_ORIGINS**
3. ❌ Missing preflight response → **✅ Include OPTIONS in methods**

---

## 📞 Support & Contributing

- **Issues**: Report bugs via GitHub issues
- **Questions**: Check [HTTP_405_ANALYSIS.md](./HTTP_405_ANALYSIS.md)
- **Contributing**: PRs welcome!

---

## 📄 License

MIT — Feel free to use in your projects

---

## Phân tích lỗi 405 gốc (Chi Tiết)

### Nguyên nhân #1 — form action trỏ Google Drive
```html
<!-- ❌ SAI: Google Drive không nhận POST từ browser -->
<form action="https://drive.google.com/drive/folders/1oZD2...">
```
Google Drive folder URL chỉ là trang web, không phải API endpoint.
Kết quả: Google trả 405 Method Not Allowed.

### Nguyên nhân #2 — Webhook URL là placeholder
```js
// ❌ SAI: fetch('YOUR_WEBHOOK_URL_HERE', ...) → lỗi network / 405
State.WEBHOOK_URL = 'YOUR_WEBHOOK_URL_HERE';
```

### Nguyên nhân #3 — Gửi JSON + base64 thay vì FormData
```js
// ❌ SAI: JSON body không tương thích với multer
body: JSON.stringify({ files: [{ data: base64String }] })

// ✅ ĐÚNG: FormData → multipart/form-data
const fd = new FormData();
files.forEach(f => fd.append('files', f));
body: fd  // KHÔNG set Content-Type!
```

### Nguyên nhân #4 — Thiếu CORS (OPTIONS bị block)
Browser gửi OPTIONS preflight trước POST. Nếu server không trả
`Access-Control-Allow-Methods: POST`, browser block và báo network error.

```js
// ✅ ĐÚNG: khai báo cors() TRƯỚC routes
app.use(cors({ methods: ['GET','POST','OPTIONS'] }));
app.use('/api/upload', uploadRouter);
```

### Nguyên nhân #5 — Route sai method
```js
// ❌ SAI: GET route nhận request POST → 404 hoặc 405
router.get('/', handler);

// ✅ ĐÚNG
router.post('/', upload.array('files', 10), handler);
```

---

## Checklist debug thực tế

```
□ 1. Mở DevTools → Network tab → click request thất bại
      → Xem: Request Method, Status Code, Response body

□ 2. Headers tab → Request Headers
      Content-Type phải là: multipart/form-data; boundary=----...
      KHÔNG được là: application/json (khi upload file)

□ 3. Headers tab → Response Headers
      Có Access-Control-Allow-Origin không?
      Nếu không → CORS chưa cấu hình đúng

□ 4. Payload tab → xem FormData fields
      studentName, studentEmail, studentNote, files[]

□ 5. Kiểm tra Express console
      Có log "POST /api/upload" không?
      Nếu không → route chưa đúng hoặc server chưa chạy
```

---

## Test bằng Postman

```
Method: POST
URL:    http://localhost:3001/api/upload
Body:   form-data (KHÔNG phải raw JSON)

Key             Type    Value
studentName     Text    TrMinh
studentEmail    Text    trminhcsc@gmail.com
studentNote     Text    Lớp CNTT-01
files           File    [chọn file từ máy]
files           File    [thêm file nữa nếu cần]
```

**Lưu ý Postman**: chọn "form-data" ở Body tab,
chuyển type của key `files` sang "File".

---

## Response chuẩn

### Thành công (200)
```json
{
  "success": true,
  "message": "Nộp bài thành công!",
  "data": {
    "studentName": "TrMinh",
    "studentEmail": "trminhcsc@gmail.com",
    "studentNote": "Lớp CNTT-01",
    "submittedAt": "2025-06-01T08:30:00.000Z",
    "files": [
      {
        "originalName": "baitap.pdf",
        "savedAs": "1717228200000_a3f8c2_baitap.pdf",
        "size": 204800,
        "mimeType": "application/pdf",
        "url": "/uploads/1717228200000_a3f8c2_baitap.pdf"
      }
    ]
  }
}
```

### Validation error (422)
```json
{
  "success": false,
  "errors": ["Họ và tên không được để trống.", "Email không đúng định dạng."]
}
```

### File quá lớn (413)
```json
{
  "success": false,
  "message": "File quá lớn. Tối đa 10MB mỗi file."
}
```

### Method sai (405)
```json
{
  "success": false,
  "message": "Method \"GET\" không được hỗ trợ. Sử dụng POST."
}
```

---

## Ví dụ FormData đúng (raw fetch)

```js
// ✅ Pattern chuẩn — copy dùng được ngay
async function uploadFiles({ name, email, note, files }) {
  const fd = new FormData();
  fd.append('studentName', name);
  fd.append('studentEmail', email);
  fd.append('studentNote', note || '');
  
  // Append từng file với CÙNG field name 'files'
  // (khớp với upload.array('files', 10) ở backend)
  for (const file of files) {
    fd.append('files', file);
  }

  const res = await fetch('/api/upload', {
    method: 'POST',
    // ⚠ KHÔNG set Content-Type — browser tự thêm boundary
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}
```

---

## Best practices upload file

1. **Validate 2 lớp**: frontend (UX) + backend (security)
2. **Rename file khi lưu**: tránh path traversal, tránh ghi đè
3. **Giới hạn MIME type**: whitelist, không blacklist
4. **Rate limiting**: tránh DDoS / spam upload
5. **Không lưu uploads/ trong Git**: thêm vào .gitignore
6. **Giới hạn tổng request size** ở reverse proxy (nginx):
   ```nginx
   client_max_body_size 50M;
   ```
7. **Scan virus** cho file người dùng upload trước khi serve

---

## .gitignore backend

```
node_modules/
uploads/*
!uploads/.gitkeep
.env
.env.local
```