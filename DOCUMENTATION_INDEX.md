# 📚 Documentation Index

Đây là danh sách tất cả tài liệu trong dự án. Chọn file phù hợp với nhu cầu.

---

## 🚀 START HERE

### 1. **[QUICKSTART.md](./QUICKSTART.md)** — ⚡ 5 Phút Khởi Động
**Nên đọc nếu:**
- Lần đầu chạy dự án
- Muốn nhanh chóng test upload
- Lỗi 405 cần fix ngay

**Nội dung:**
- Cài đặt backend + frontend (2 terminal)
- Test direct với cURL
- Debug checklist nhanh
- Các lỗi phổ biến & fix

---

## 🔍 UNDERSTANDING ERRORS

### 2. **[HTTP_405_ANALYSIS.md](./HTTP_405_ANALYSIS.md)** — 📋 Phân Tích Lỗi Chi Tiết
**Nên đọc nếu:**
- Không hiểu HTTP 405 là gì
- Muốn hiểu flow request upload
- Muốn học best practices

**Nội dung:**
- 8 nguyên nhân HTTP 405 phổ biến
- Flow request chuẩn (browser → backend)
- 5 mistakes & fixes chi tiết
- Response examples (success/error)
- Security notes
- Troubleshooting tree

**Nên đọc ngay:** Phần "COMMON MISTAKES & FIXES"

---

## 🧪 TESTING & DEBUGGING

### 3. **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** — 🧪 Hướng Dẫn Testing Đầy Đủ
**Nên đọc nếu:**
- Muốn test backend trực tiếp (không dùng frontend)
- Muốn tìm hiểu DevTools Network tab
- Cần test CORS preflight
- Muốn viết test script

**Nội dung:**
- cURL commands (15+ examples)
- Postman GUI guide step-by-step
- DevTools Network tab analysis
- CORS preflight testing
- Test scenarios (backend running, not running, CORS blocked, v.v.)
- Troubleshooting tree
- Automated test script (.sh)

**Nên dùng:** cURL hoặc Postman trước khi test frontend

---

## 🚀 DEPLOYMENT

### 4. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** — 🚀 Production Guide
**Nên đọc nếu:**
- Muốn deploy lên production
- Muốn dùng cloud services (Vercel, Railway, AWS)
- Cần setup Docker
- Muốn dùng CDN, S3, Cloudinary

**Nội dung:**
- Backend deployment options (Vercel, Railway, VPS, Docker)
- Frontend deployment (Vercel, Netlify, GitHub Pages, S3)
- Environment variables setup
- File storage (local, S3, Cloudinary)
- Security checklist (HTTPS, rate limit, CORS, logging)
- Performance optimization
- Monitoring & alerting setup
- Maintenance tasks

**Nên làm:** Chạy qua checklist trước deploy

---

### 5. **[PRODUCTION_READINESS_CHECKLIST.md](./PRODUCTION_READINESS_CHECKLIST.md)** — ✅ Pre-Deployment Checklist
**Nên đọc nếu:**
- Sắp deploy production
- Muốn đảm bảo quality
- Cần team sign-off

**Nội dung:**
- Code quality checks
- Frontend/backend checklist
- Environment configuration
- Deployment infrastructure
- Monitoring & logging
- Security
- Backup & disaster recovery
- Load testing
- Documentation
- Post-deployment tests
- Rollback plan

---

## 📖 REFERENCE

### 6. **[README.md](./README.md)** — 📄 Project Overview
**Nên đọc nếu:**
- Muốn overview dự án
- Muốn xem features
- Muốn xem tech stack
- Muốn xem API endpoints

**Nội dung:**
- Project structure
- Quick start (3 steps)
- Error 405 fix summary
- API documentation
- Features list
- Security features
- File types allowed

---

## 🗺️ Navigation Guide

### Scenario 1: "Upload không được, lỗi 405"
```
1. Start: QUICKSTART.md (Debug section)
2. If not fixed: HTTP_405_ANALYSIS.md (Common mistakes)
3. Deep dive: TESTING_GUIDE.md (Test with cURL/Postman)
```

### Scenario 2: "Muốn test API backend"
```
1. Start: TESTING_GUIDE.md (Part 1: cURL/Postman)
2. Reference: HTTP_405_ANALYSIS.md (Response examples)
```

### Scenario 3: "Deploy lên production"
```
1. Start: DEPLOYMENT_CHECKLIST.md (Overview section)
2. Checklist: PRODUCTION_READINESS_CHECKLIST.md
3. Setup: DEPLOYMENT_CHECKLIST.md (specific option: Vercel/Railway/etc)
```

### Scenario 4: "Tìm hiểu cách hoạt động"
```
1. Start: README.md (Overview + Flow)
2. Deep dive: HTTP_405_ANALYSIS.md (Part II: Flow Request)
3. Implementation: TESTING_GUIDE.md (Part 1: Detailed examples)
```

### Scenario 5: "Lỗi CORS"
```
1. Start: HTTP_405_ANALYSIS.md (CORS section)
2. Debug: TESTING_GUIDE.md (Part 2, Scenario 4: CORS Preflight Blocked)
3. Fix: DEPLOYMENT_CHECKLIST.md (Security section)
```

---

## 📊 File Purposes

| File | Purpose | Length | Audience |
|------|---------|--------|----------|
| QUICKSTART.md | Get running in 5min | 2-3 pages | Everyone |
| HTTP_405_ANALYSIS.md | Deep error analysis | 5-7 pages | Developers |
| TESTING_GUIDE.md | Testing & debugging | 6-8 pages | QA/Developers |
| DEPLOYMENT_CHECKLIST.md | Deployment guide | 7-10 pages | DevOps/Backend |
| PRODUCTION_READINESS_CHECKLIST.md | Pre-deploy checklist | 3-5 pages | Team leads |
| README.md | Project overview | 4-5 pages | Everyone |

---

## 🎯 Reading Order

**For First-Time Users:**
1. README.md (quick overview)
2. QUICKSTART.md (get it running)
3. HTTP_405_ANALYSIS.md (understand errors)

**For Troubleshooting:**
1. QUICKSTART.md (debug section)
2. TESTING_GUIDE.md (systematic testing)
3. HTTP_405_ANALYSIS.md (deep dive if needed)

**For Production:**
1. DEPLOYMENT_CHECKLIST.md (deployment options)
2. PRODUCTION_READINESS_CHECKLIST.md (pre-deploy checks)
3. TESTING_GUIDE.md (final testing)

---

## 🔗 Cross-References

- HTTP_405_ANALYSIS.md → See also: TESTING_GUIDE.md, README.md
- TESTING_GUIDE.md → See also: HTTP_405_ANALYSIS.md, QUICKSTART.md
- DEPLOYMENT_CHECKLIST.md → See also: PRODUCTION_READINESS_CHECKLIST.md
- README.md → See also: QUICKSTART.md, HTTP_405_ANALYSIS.md

---

## ❓ Common Questions

**Q: Upload tidak được, toast "405 error". Đọc gì?**
A: QUICKSTART.md → HTTP_405_ANALYSIS.md → TESTING_GUIDE.md

**Q: Muốn setup production. Đọc gì?**
A: DEPLOYMENT_CHECKLIST.md → PRODUCTION_READINESS_CHECKLIST.md

**Q: Muốn hiểu flow request. Đọc gì?**
A: README.md → HTTP_405_ANALYSIS.md (Part II)

**Q: Muốn test API trực tiếp (no frontend). Đọc gì?**
A: TESTING_GUIDE.md (Part 1)

**Q: Muốn security hardening. Đọc gì?**
A: DEPLOYMENT_CHECKLIST.md (Security section) + PRODUCTION_READINESS_CHECKLIST.md (Security section)

---

## 📝 Updates

- **Last Updated:** 2026-05-23
- **Guides Created:** 5 main guides + this index
- **Total Pages:** ~40-50 pages of documentation
- **Examples:** 50+ curl/Postman/JavaScript examples

---

**Pro Tip:** Use Ctrl+F (Find) để tìm keywords nhanh trong các files MD này.

---

**Need more help?** Check the specific guide for your scenario above.
