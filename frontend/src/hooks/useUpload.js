import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 10;

/**
 * useUpload — manages file state + submission
 *
 * FIX #5: Dùng FormData (multipart/form-data) thay vì JSON + base64.
 *   - fetch tự set Content-Type: multipart/form-data; boundary=...
 *   - KHÔNG set Content-Type thủ công khi dùng FormData
 */
export function useUpload() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState({ name: '', email: '', files: '' });

  /* ── Thêm file, dedup + validate kích thước ── */
  const addFiles = useCallback((incoming) => {
    const newFiles = Array.from(incoming);
    const oversized = [];
    const valid = [];

    newFiles.forEach(f => {
      if (f.size > MAX_SIZE) oversized.push(f.name);
      else valid.push(f);
    });

    setFiles(prev => {
      const combined = [...prev];
      valid.forEach(f => {
        const isDup = combined.some(e => e.name === f.name && e.size === f.size);
        if (!isDup && combined.length < MAX_FILES) combined.push(f);
      });
      return combined;
    });

    setErrors(prev => ({ ...prev, files: '' }));
    return oversized; // trả về để caller hiển thị toast nếu cần
  }, []);

  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => setFiles([]), []);

  /* ── Validate ── */
  const validate = (name, email) => {
    const e = { name: '', email: '', files: '' };
    if (!name.trim()) e.name = '⚠ Nhập họ và tên.';
    if (!email.trim()) e.email = '⚠ Nhập email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = '⚠ Email không hợp lệ.';
    if (files.length === 0) e.files = '⚠ Chọn ít nhất 1 file.';
    setErrors(e);
    return !e.name && !e.email && !e.files;
  };

  /* ── Submit ── */
  const submit = useCallback(async ({ name, email, note }) => {
    if (!validate(name, email)) return { success: false };

    setStatus('loading');
    setProgress(10);

    /* ── Build FormData ──────────────────────────────────────────────────────
       ĐÚNG: append từng file với field name 'files'
       SAI:  JSON.stringify({ files: [...base64] })
       SAI:  set 'Content-Type': 'multipart/form-data' thủ công (browser tự set boundary)
    ─────────────────────────────────────────────────────────────────────── */
    const formData = new FormData();
    formData.append('studentName', name.trim());
    formData.append('studentEmail', email.trim());
    formData.append('studentNote', note?.trim() || '');
    files.forEach(f => formData.append('files', f)); // field name khớp upload.array('files')

    setProgress(40);

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        // ⚠ KHÔNG set Content-Type header — browser tự thêm với boundary chính xác
        body: formData,
      });

      setProgress(90);
      const data = await res.json();

      if (!res.ok) {
        const msg = data.errors?.join(' ') || data.message || `Server lỗi ${res.status}`;
        throw new Error(msg);
      }

      setProgress(100);
      setStatus('success');
      setFiles([]);
      return { success: true, data };

    } catch (err) {
      setStatus('error');
      return { success: false, message: err.message };
    } finally {
      setTimeout(() => { setProgress(0); setStatus('idle'); }, 2000);
    }
  }, [files]);

  return { files, errors, status, progress, addFiles, removeFile, clearFiles, submit, setErrors };
}