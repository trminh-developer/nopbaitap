'use strict';

/**
 * Upload Portal - Express Backend
 * Production-ready file upload server
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const uploadRouter = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

/* ── Security Middleware ── */
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

/* ── CORS ──────────────────────────────────────────────────────────────────
   FIX #3: CORS phải khai báo TRƯỚC tất cả routes.
   Thiếu cấu hình này → OPTIONS preflight bị block → browser nhận 405.
   ────────────────────────────────────────────────────────────────────────── */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin "${origin}" không được phép.`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

/* ── Rate Limiting ── */
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20,                   // tối đa 20 request/window/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều request. Thử lại sau 15 phút.' }
}));

/* ── Body Parser ──────────────────────────────────────────────────────────
   FIX #2: Không dùng express.json() cho multipart/form-data.
   multer sẽ tự parse FormData. express.json() chỉ cho JSON body thông thường.
   ────────────────────────────────────────────────────────────────────────── */
app.use(express.json({ limit: '1mb' })); // chỉ cho JSON routes khác
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ── Removed Static files (uploads) ── */

/* ── Routes ── */
app.use('/api/upload', uploadRouter);

/* ── Health check ── */
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server đang chạy.', timestamp: new Date().toISOString() });
});

/* ── 404 Handler ── */
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route không tồn tại.' });
});

/* ── Global Error Handler ── */
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File quá lớn. Tối đa 10MB mỗi file.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ success: false, message: 'Quá nhiều file. Tối đa 10 file mỗi lần.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ success: false, message: `Field không hợp lệ: ${err.field}` });
  }

  // CORS errors
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Lỗi server nội bộ.'
      : err.message
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`   Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

module.exports = app;