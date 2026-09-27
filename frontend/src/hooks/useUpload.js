import { useState, useCallback } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://script.google.com/macros/s/AKfycbxmKh5N0aQ8YFcKFZYE1z6_nYhQnjvNqTfdm5lC3rJWefzgN9BqHWDd1-TJZS8OP-U9/exec";
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
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState({ name: "", email: "", files: "" });

  /* ── Thêm file, dedup + validate kích thước ── */
  const addFiles = useCallback((incoming) => {
    const newFiles = Array.from(incoming);
    const oversized = [];
    const valid = [];

    newFiles.forEach((f) => {
      if (f.size > MAX_SIZE) oversized.push(f.name);
      else valid.push(f);
    });

    setFiles((prev) => {
      const combined = [...prev];
      valid.forEach((f) => {
        const isDup = combined.some(
          (e) => e.name === f.name && e.size === f.size,
        );
        if (!isDup && combined.length < MAX_FILES) combined.push(f);
      });
      return combined;
    });

    setErrors((prev) => ({ ...prev, files: "" }));
    return oversized; // trả về để caller hiển thị toast nếu cần
  }, []);

  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => setFiles([]), []);

  /* ── Validate ── */
  const validate = (name, email) => {
    const e = { name: "", email: "", files: "" };
    if (!name.trim()) e.name = "⚠ Nhập họ và tên.";
    if (!email.trim()) e.email = "⚠ Nhập email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "⚠ Email không hợp lệ.";
    if (files.length === 0) e.files = "⚠ Chọn ít nhất 1 file.";
    setErrors(e);
    return !e.name && !e.email && !e.files;
  };

  /* ── Submit ── */
  const submit = useCallback(
    async ({ name, email, studentClass, course }) => {
      if (!validate(name, email)) return { success: false };

      setStatus("loading");
      setProgress(10);

      try {
        // 1. Convert files to Base64
        const base64Files = await Promise.all(
          files.map(async (f) => {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  name: f.name,
                  mimeType: f.type,
                  base64: reader.result,
                });
              reader.onerror = (error) => reject(error);
              reader.readAsDataURL(f);
            });
          }),
        );

        setProgress(40);

        // 2. Build payload
        const payload = {
          studentName: name.trim(),
          studentEmail: email.trim(),
          studentClass: studentClass || "",
          course: course || "",
          files: base64Files,
        };

        // 3. Gửi lên Google Apps Script Webhook
        const response = await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify(payload),
          // Chú ý: fetch tới Apps Script không dùng headers Content-Type để tránh CORS preflight lằng nhằng
        });

        setProgress(90);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || `Lỗi từ Google Drive!`);
        }

        setProgress(100);
        setStatus("success");
        setFiles([]);
        return { success: true, data };
      } catch (err) {
        console.error(err);
        setStatus("error");
        return { success: false, message: err.message || "Lỗi kết nối mạng!" };
      } finally {
        setTimeout(() => {
          setProgress(0);
          setStatus("idle");
        }, 2000);
      }
    },
    [files],
  );

  return {
    files,
    errors,
    status,
    progress,
    addFiles,
    removeFile,
    clearFiles,
    submit,
    setErrors,
  };
}
