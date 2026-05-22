'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/* ── Upload directory ── */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ── Allowed MIME types ── */
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/css',
  'text/javascript',
  'application/json',
]);

/* ── Storage engine: disk ── */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),

  filename: (_req, file, cb) => {
    // Sanitize tên file gốc, thêm timestamp + random để tránh trùng
    const safeBase = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .slice(0, 60);
    const ext = path.extname(file.originalname).toLowerCase();
    const uid = crypto.randomBytes(6).toString('hex');
    cb(null, `${Date.now()}_${uid}_${safeBase}${ext}`);
  }
});

/* ── File filter ── */
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error(`Loại file không hợp lệ: ${file.mimetype}`), { code: 'INVALID_MIME' }), false);
  }
};

/* ── Multer instance ── */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 10,                   // tối đa 10 files
    fields: 10,                  // tối đa 10 text fields
  }
});

module.exports = upload;