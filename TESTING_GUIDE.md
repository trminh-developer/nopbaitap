# 🧪 TESTING GUIDE: HTTP 405 & Upload Flow

## Part 1: Test Backend Directly (No Frontend)

### Option A: cURL (Terminal)

```bash
# Test 1: Health check
curl -X GET http://localhost:3001/api/health -v
# Expected: 200, response: {"success":true,"message":"Server đang chạy..."}

# Test 2: POST (Wrong method for health, should get 405)
curl -X POST http://localhost:3001/api/health -v
# Expected: 405 Method Not Allowed (not supported yet, but good test)

# Test 3: Upload single file
curl -X POST http://localhost:3001/api/upload \
  -F "studentName=Nguyễn Văn A" \
  -F "studentEmail=vana@example.com" \
  -F "studentNote=Lớp B1" \
  -F "files=@./test.css" \
  -v

# Response success (200):
# {
#   "success": true,
#   "message": "Nộp bài thành công!",
#   "data": {
#     "studentName": "Nguyễn Văn A",
#     "studentEmail": "vana@example.com",
#     "files": [
#       {
#         "originalName": "test.css",
#         "savedAs": "1684829123456_a1b2c3_test.css",
#         "size": 512,
#         "mimeType": "text/css",
#         "url": "/uploads/1684829123456_a1b2c3_test.css"
#       }
#     ]
#   }
# }

# Test 4: Upload multiple files
curl -X POST http://localhost:3001/api/upload \
  -F "studentName=Nguyễn Văn A" \
  -F "studentEmail=vana@example.com" \
  -F "files=@./file1.css" \
  -F "files=@./file2.pdf" \
  -F "files=@./file3.txt" \
  -v

# Test 5: Invalid MIME type (should fail)
curl -X POST http://localhost:3001/api/upload \
  -F "studentName=Nguyễn Văn A" \
  -F "studentEmail=vana@example.com" \
  -F "files=@./malware.exe" \
  -v
# Expected: 400 "Loại file không hợp lệ: application/x-msdownload"

# Test 6: Missing required field (should fail validation)
curl -X POST http://localhost:3001/api/upload \
  -F "studentEmail=vana@example.com" \
  -F "files=@./test.css" \
  -v
# Expected: 422 Unprocessable Entity
# {"success": false, "errors": ["Họ và tên không được để trống."]}

# Test 7: No files (should fail)
curl -X POST http://localhost:3001/api/upload \
  -F "studentName=Nguyễn Văn A" \
  -F "studentEmail=vana@example.com" \
  -v
# Expected: 400 "Phải đính kèm ít nhất 1 file."

# Test 8: Test CORS preflight
curl -X OPTIONS http://localhost:3001/api/upload \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v
# Expected: 200 OK with Access-Control-* headers
```

**Flags explained:**
- `-X METHOD`: HTTP method (GET, POST, OPTIONS, etc.)
- `-F "field=value"`: Form data (like HTML form)
- `-F "file=@path"`: File upload
- `-H "Header: value"`: Custom header
- `-v`: Verbose (show request & response headers)
- `-i`: Include response headers in output

---

### Option B: Postman GUI

**Step 1: Create New Request**
- Method: `POST`
- URL: `http://localhost:3001/api/upload`

**Step 2: Configure Body (form-data)**
- Tab "Body" → Radio "form-data"
- Add fields:
  ```
  KEY                  TYPE    VALUE
  studentName          text    Nguyễn Văn A
  studentEmail         text    vana@example.com
  studentNote          text    Lớp B1
  files                file    /path/to/file.css
  ```

**Step 3: Send & Check**
- Green "200 OK" → Success ✓
- Red "4xx" or "5xx" → Error ❌
  - Click "Response" → View JSON
  - Check "error" field for reason

**Step 4: Test CORS Preflight**
- Create new request
- Method: `OPTIONS`
- URL: `http://localhost:3001/api/upload`
- Headers:
  ```
  Origin                              http://localhost:5173
  Access-Control-Request-Method       POST
  Access-Control-Request-Headers      content-type
  ```
- Expected: 200 OK with response headers:
  ```
  Access-Control-Allow-Origin         http://localhost:5173
  Access-Control-Allow-Methods        GET, POST, OPTIONS
  Access-Control-Allow-Headers        Content-Type, Authorization
  ```

---

## Part 2: Test Frontend + Backend Integration

### Scenario 1: Both Running Correctly

**Terminal 1 (Backend):**
```bash
cd backend
npm start
# ✅ Output: ✅ Server running at http://localhost:3001
#    Allowed origins: http://localhost:5173
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
# ✅ Output: ✅ Local: http://localhost:5173
```

**Browser:**
1. Open `http://localhost:5173`
2. Fill form:
   - Họ tên: "Nguyễn Văn A"
   - Email: "vana@example.com"
   - Note: "Lớp B1"
   - File: Choose any .css file
3. Click "Nộp bài"
4. Expected: Green toast "Nộp bài thành công! 🎉"

**DevTools Network Check:**
- F12 → Network tab
- Look for request "upload"
- Status: 200 ✓
- Request method: POST ✓
- Request headers:
  ```
  Content-Type: multipart/form-data; boundary=----...
  ```
- Response JSON:
  ```json
  {
    "success": true,
    "message": "Nộp bài thành công!",
    "data": { ... }
  }
  ```

---

### Scenario 2: Backend Not Running

**Terminal 1:** No backend running

**Frontend:**
1. Try submit form
2. Expected: Red toast "Thất bại - Connection refused" or "Network error"

**DevTools:**
- Network tab → request "upload"
- Status: Shows error icon (no status code)
- Response: Empty (no response from server)

**Fix:**
```bash
cd backend
npm start
```

---

### Scenario 3: Wrong HTTP Method

**If frontend sends GET instead of POST:**
```javascript
// ❌ WRONG in useUpload.js
const res = await fetch(`${API_URL}/api/upload`, {
  method: 'GET',  // ← Wrong
  body: formData,
});
```

**DevTools:**
- Request method: GET ❌
- Status: 405 Method Not Allowed

**Backend log:**
```
Method "GET" không được hỗ trợ. Sử dụng POST.
```

**Fix:** Change to `method: 'POST'`

---

### Scenario 4: CORS Preflight Blocked

**If backend CORS config wrong:**
```javascript
// ❌ WRONG: methods missing OPTIONS
app.use(cors({
  methods: ['GET', 'POST'],  // ← Missing OPTIONS
  // ...
}));
```

**DevTools Network:**
- Two requests visible:
  1. OPTIONS request → 405 or 403 ❌
  2. POST request → Never sent (browser blocked due to preflight failure)

**Browser Console:**
```
Access to XMLHttpRequest at 'http://localhost:3001/api/upload'
from origin 'http://localhost:5173' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Fix:** Add `'OPTIONS'` to CORS methods
```javascript
app.use(cors({
  methods: ['GET', 'POST', 'OPTIONS'],  // ← Include OPTIONS
  // ...
}));
```

---

### Scenario 5: FormData Field Name Mismatch

**If frontend sends wrong field name:**
```javascript
// ❌ WRONG in UploadForm.js
formData.append('file', file);  // ← Field name is 'file'

// Backend expects 'files'
upload.array('files', 10);  // ← Expects 'files'
```

**Result:**
- `req.files` will be `undefined` or `[]`
- Backend returns 400: "Phải đính kèm ít nhất 1 file."

**DevTools:**
- Request Payload shows:
  ```
  file: (binary)  ← Wrong field name
  ```

**Fix:** Both must match:
```javascript
formData.append('files', file);  // Frontend
upload.array('files', 10);       // Backend
```

---

### Scenario 6: File Size Limit Exceeded

**If user uploads file > 10MB:**

**Result:**
- Status: 413 Payload Too Large
- Response:
  ```json
  {
    "success": false,
    "message": "File quá lớn. Tối đa 10MB mỗi file."
  }
```

**Frontend Toast:**
```
Thất bại - File quá lớn. Tối đa 10MB mỗi file.
```

**DevTools:**
- Request shows file being sent
- Response status: 413

**Fix:** User chooses smaller file or admin increases limit

---

## Part 3: Advanced Debugging

### A. Log Request/Response Details

**Frontend (useUpload.js):**
```javascript
console.log('📤 Submitting:', {
  name, email, files: files.map(f => ({ name: f.name, size: f.size }))
});

console.log('📋 FormData entries:');
[...formData.entries()].forEach(([key, value]) => {
  if (value instanceof File) {
    console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
  } else {
    console.log(`  ${key}: ${value}`);
  }
});

const res = await fetch(...);
const data = await res.json();

console.log('📥 Response:', { status: res.status, ok: res.ok, data });
```

**Backend (routes/upload.js):**
```javascript
console.log('[Upload] Request headers:', {
  'content-type': req.get('content-type'),
  'content-length': req.get('content-length'),
});

console.log('[Upload] Body fields:', req.body);
console.log('[Upload] Files:', req.files?.map(f => ({
  fieldname: f.fieldname,
  originalname: f.originalname,
  size: f.size,
  mimetype: f.mimetype,
})));

console.log('[Upload] Response:', { success: true, data });
```

**Browser Console Output:**
```
📤 Submitting: {
  name: "Nguyễn Văn A",
  email: "vana@example.com",
  files: [
    { name: "homework.css", size: 2048 }
  ]
}
📋 FormData entries:
  studentName: Nguyễn Văn A
  studentEmail: vana@example.com
  files: File(homework.css, 2048 bytes)
📥 Response: {
  status: 200,
  ok: true,
  data: { success: true, message: "Nộp bài thành công!", ... }
}
```

### B. Monitor Network Traffic (Wireshark)

For ultra-detailed inspection:
```bash
# Mac/Linux
sudo tcpdump -i lo -A 'tcp port 3001'

# Windows: Use Wireshark GUI
# Capture on "Loopback" interface, filter: tcp.port == 3001
```

### C. Browser DevTools Tips

**Tab: Network**
- Filter: "upload" to see only that request
- Right-click request → Copy as cURL (paste into terminal)
- Timing tab: Shows DNS/TCP/TLS/request/wait/download times
- Size column: Shows compressed vs uncompressed size

**Tab: Console**
- Check for JavaScript errors (red icons)
- Look for CORS errors (would show blocked request)
- Any `fetch()` errors logged?

**Tab: Application → Cookies**
- Check if credentials: true is set on fetch
- CORS may require credentials to work

---

## Part 4: Quick Troubleshooting Checklist

| Issue | Check | Command/Action | Expected |
|-------|-------|-----------------|----------|
| **Server won't start** | File exists | `ls backend/server.js` | File found ✓ |
| | Dependencies | `cd backend && npm install` | No errors |
| | Port conflict | `lsof -i :3001` (Mac/Linux) | Either empty or expected process |
| | | `netstat -ano \| findstr :3001` (Windows) | Port free |
| **405 Method Not Allowed** | URL correct | DevTools Network tab | `/api/upload` shown |
| | Method correct | DevTools → Method column | `POST` shown |
| | CORS headers | DevTools → Response headers | `Access-Control-*` present |
| | | curl test | OPTIONS returns 200 |
| **No files received** | Field name match | Backend logs | `req.files` not undefined |
| | FormData append | Frontend logs | `"files": File(...)` shown |
| | Middleware order | Check server.js | CORS before routes |
| | express.json() | Check server.js | Limit set, not consuming FormData |
| **CORS blocked** | Origin allowed | DevTools Console | No CORS error |
| | Preflight pass | Network tab OPTIONS | Status 200 |
| | Methods include POST/OPTIONS | Server logs or browser test | Allowed |
| **File rejected** | MIME type | Backend logs | Log `ALLOWED_MIMES` check |
| | Allowed types | multerConfig.js | .css in ALLOWED_MIMES |
| | Size within limit | File properties | < 10MB |

---

## Part 5: Automated Test Script

**test-upload.sh** (run after backend starts):
```bash
#!/bin/bash
set -e

API_URL="http://localhost:3001"

echo "🧪 Testing Upload API"
echo "====================="

# Test 1: Health check
echo -e "\n1️⃣ Testing health endpoint..."
RESPONSE=$(curl -s -X GET "$API_URL/api/health")
echo "Response: $RESPONSE"
[[ $RESPONSE == *'"success":true'* ]] && echo "✅ PASS" || echo "❌ FAIL"

# Test 2: Create dummy file
echo -e "\n2️⃣ Creating test file..."
echo "body { color: red; }" > test_upload.css
ls -lh test_upload.css
echo "✅ File created"

# Test 3: Upload test
echo -e "\n3️⃣ Testing file upload..."
RESPONSE=$(curl -s -X POST "$API_URL/api/upload" \
  -F "studentName=Test User" \
  -F "studentEmail=test@example.com" \
  -F "files=@test_upload.css")
echo "Response: $RESPONSE"
[[ $RESPONSE == *'"success":true'* ]] && echo "✅ PASS" || echo "❌ FAIL"

# Test 4: Cleanup
echo -e "\n4️⃣ Cleaning up..."
rm test_upload.css
echo "✅ Test file removed"

echo -e "\n✅ All tests completed!"
```

**Run:**
```bash
chmod +x test-upload.sh
./test-upload.sh
```

---

**Last Updated:** 2026-05-23
