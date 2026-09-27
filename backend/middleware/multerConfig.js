'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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

/* ── Storage engine: memory ── */
const storage = multer.memoryStorage();

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