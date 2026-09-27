'use strict';

/**
 * POST /api/upload
 *
 * Expects multipart/form-data with:
 *   - studentName  (string, required)
 *   - studentEmail (string, required)
 *   - studentNote  (string, optional)
 *   - files[]      (File[], required, ≥1)
 *
 * FIX #1: Route phải là POST. GET/PUT → 405.
 * FIX #4: multer phải được dùng như middleware, không phải chạy thủ công.
 */

const express = require('express');
const router = express.Router();
const upload = require('../middleware/multerConfig');
const path = require('path');
const { uploadFileToDrive } = require('../services/driveService');

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1fDd3ajTrj-DZvHM6_hCBXDLzhICMuZq3';

/* ── Validator ── */
const validatePayload = (body) => {
  const errors = [];
  const name = (body.studentName || '').trim();
  const email = (body.studentEmail || '').trim();

  if (!name) errors.push('Họ và tên không được để trống.');
  if (name.length > 100) errors.push('Họ và tên tối đa 100 ký tự.');

  if (!email) errors.push('Email không được để trống.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email không đúng định dạng.');

  return errors;
};

/* ── Route: POST /api/upload ── */
router.post(
  '/',
  // multer parses multipart/form-data, extracts text fields + files
  upload.array('files', 10), // field name PHẢI khớp với frontend FormData.append('files', ...)

  async (req, res, next) => {
    try {
      /* 1. Validate text fields */
      const validationErrors = validatePayload(req.body);
      if (validationErrors.length) {
        return res.status(422).json({ success: false, errors: validationErrors });
      }

      /* 2. Validate files */
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'Phải đính kèm ít nhất 1 file.' });
      }

      /* 3. Build response payload */
      const uploadedFiles = req.files.map(f => ({
        originalName: f.originalname,
        size: f.size,
        mimeType: f.mimetype
      }));

      console.log(`[Upload] ${req.body.studentName} (${req.body.studentEmail}) — ${req.files.length} file(s)`);

      /* 4. Upload từng file lên Google Drive */
      const driveUploadPromises = req.files.map(async (f) => {
        try {
          // Xây dựng tên file trên Drive: [Lớp]-[Học phần] TênSinhViên_TênFileGốc
          const className = req.body.studentClass || 'NoClass';
          const courseName = req.body.course || 'NoCourse';
          const driveFileName = `[${className}]-[${courseName}] ${req.body.studentName}_${f.originalname}`;

          const driveData = await uploadFileToDrive(
            f.buffer, // Dùng buffer trên RAM
            driveFileName,
            f.mimetype,
            DRIVE_FOLDER_ID
          );

          return {
            originalName: f.originalname,
            driveId: driveData.id,
            webViewLink: driveData.webViewLink,
            status: 'success'
          };
        } catch (error) {
          return {
            originalName: f.originalname,
            status: 'failed',
            error: error.message
          };
        }
      });

      const driveResults = await Promise.all(driveUploadPromises);

      return res.status(200).json({
        success: true,
        message: 'Nộp bài thành công!',
        data: {
          studentName: req.body.studentName.trim(),
          studentEmail: req.body.studentEmail.trim(),
          studentClass: req.body.studentClass || '',
          course: req.body.course || '',
          localFiles: uploadedFiles,
          driveUploads: driveResults,
          submittedAt: new Date().toISOString(),
        }
      });

    } catch (err) {
      next(err); // chuyển lên global error handler
    }
  }
);

/* ── FIX: Handle wrong methods on this route ── */
router.all('/', (req, res) => {
  res.set('Allow', 'POST').status(405).json({
    success: false,
    message: `Method "${req.method}" không được hỗ trợ. Sử dụng POST.`
  });
});

module.exports = router;