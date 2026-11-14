(function (root) {
  "use strict";
  const MAX_FILES = 10;
  const MAX_SIZE = 1024 * 1024 * 1024;
  const CHUNK_SIZE = 8 * 1024 * 1024;
  const PROTOCOL = "resumable-v3";

  function normalizeClass(value) {
    return typeof value === "string" ? value.trim().toUpperCase() : "";
  }

  function mergeFiles(current, incoming) {
    const files = current.slice();
    const warnings = [];
    for (const file of Array.from(incoming)) {
      if (file.size > MAX_SIZE) {
        warnings.push(file.name + ": vượt quá 1 GB.");
        continue;
      }
      if (
        files.some((item) => item.name === file.name && item.size === file.size)
      )
        continue;
      if (files.length >= MAX_FILES) {
        warnings.push("Chỉ chọn tối đa 10 file.");
        break;
      }
      files.push(file);
    }
    return { files, warnings };
  }

  function confirmedFiles(files) {
    if (!Array.isArray(files)) return [];
    const seen = new Set();
    return files.filter((file) => {
      if (
        !file ||
        typeof file.name !== "string" ||
        !file.name.trim() ||
        typeof file.url !== "string"
      )
        return false;
      try {
        const url = new URL(file.url);
        if (url.protocol !== "https:" || url.username || url.password)
          return false;
        let id;
        if (url.hostname === "drive.google.com") {
          const match = url.pathname.match(
            /^\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/,
          );
          id = match
            ? match[1]
            : url.pathname === "/open"
              ? url.searchParams.get("id")
              : null;
        } else if (url.hostname === "docs.google.com") {
          const match = url.pathname.match(
            /^\/(?:document|spreadsheets|presentation|drawings|forms)\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/,
          );
          id = match && match[1];
        }
        if (!id || seen.has(id) || (file.id && file.id !== id)) return false;
        seen.add(id);
        return true;
      } catch (_) {
        return false;
      }
    });
  }

  function validateResponse(data, count) {
    if (!data || data.success !== true)
      throw new Error(
        data && typeof data.message === "string"
          ? data.message
          : "Google Drive chưa xác nhận nộp bài.",
      );
    const receipts = confirmedFiles(data.files);
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      !Array.isArray(data.files) ||
      data.files.length !== count ||
      receipts.length !== count
    ) {
      throw new Error(
        "Chưa xác nhận được đủ file trên Google Drive. Vui lòng kiểm tra Drive trước khi gửi lại.",
      );
    }
    return receipts;
  }

  function readChunk(blob) {
    return new Promise((resolve, reject) => {
      const reader = new root.FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string" || !reader.result.includes(",")) {
          reject(new Error("Không đọc được nội dung file."));
          return;
        }
        resolve(reader.result.substring(reader.result.indexOf(",") + 1));
      };
      reader.onerror = () =>
        reject(new Error("Không đọc được file. Vui lòng chọn lại file."));
      reader.onabort = () => reject(new Error("Đã dừng đọc file."));
      reader.readAsDataURL(blob);
    });
  }

  async function post(apiUrl, payload) {
    if (!root.axios || typeof root.axios.post !== "function") {
      const error = new Error("Chưa tải được thư viện kết nối API. Vui lòng tải lại trang.");
      error.code = "AXIOS_NOT_LOADED";
      throw error;
    }
    let response;
    try {
      response = await root.axios.post(apiUrl, JSON.stringify(payload), {
        headers: { "Content-Type": "text/plain;charset=utf-8", Accept: "application/json" },
        responseType: "text",
        transformRequest: [value => value],
        transformResponse: [value => value],
        timeout: 360000,
        withCredentials: false,
        withXSRFToken: false,
        validateStatus: () => true,
      });
    } catch (cause) {
      if (cause && cause.response) {
        response = cause.response;
      } else {
        const timedOut = cause && (cause.code === "ECONNABORTED" || cause.code === "ETIMEDOUT");
        const message = timedOut
          ? "Máy chủ nộp bài phản hồi quá lâu. Vui lòng kiểm tra Drive trước khi gửi lại."
          : payload.action === "start"
            ? "Không gọi được API nộp bài. Địa chỉ API hoặc quyền truy cập có thể chưa đúng. Vui lòng liên hệ người quản lý."
            : "Kết nối đến máy chủ nộp bài bị gián đoạn. Vui lòng kiểm tra Drive trước khi gửi lại.";
        const error = new Error(message);
        error.code = timedOut ? "API_TIMEOUT" : "API_UNREACHABLE";
        error.retryable = payload.action !== "start" && (!cause || cause.code !== "ERR_CANCELED");
        throw error;
      }
    }
    if (response.status < 200 || response.status >= 300) {
      let message = "Không gửi được bài (HTTP " + response.status + ").";
      if (response.status === 404) message = "Không tìm thấy API nộp bài (HTTP 404). Vui lòng liên hệ người quản lý cập nhật địa chỉ nộp bài.";
      if (response.status === 401 || response.status === 403) message = "API nộp bài chưa cho phép truy cập (HTTP " + response.status + "). Vui lòng liên hệ người quản lý.";
      const error = new Error(message);
      error.code = "HTTP_" + response.status;
      error.retryable = response.status === 429 || response.status >= 500;
      throw error;
    }
    let data;
    try {
      data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
    } catch (_) {
      const error = new Error(
        "Không đọc được xác nhận từ máy chủ. Vui lòng kiểm tra Drive trước khi gửi lại.",
      );
      error.code = "API_INVALID_RESPONSE";
      error.retryable = payload.action !== "start";
      throw error;
    }
    if (!data || data.protocol !== PROTOCOL)
      throw new Error(
        "Máy chủ nộp bài chưa được cập nhật. Vui lòng liên hệ người quản lý.",
      );
    if (data.success !== true) {
      const error = new Error(
        typeof data.message === "string"
          ? data.message
          : "Google Drive chưa xác nhận nộp bài.",
      );
      error.retryable = data.retryable === true;
      throw error;
    }
    return data;
  }

  async function sendChunk(apiUrl, ticket, offset, base64) {
    let recovering = false;
    for (let attempt = 0; ; attempt++) {
      try {
        return await post(
          apiUrl,
          recovering
            ? { action: "status", ticket }
            : { action: "chunk", ticket, offset, base64 },
        );
      } catch (error) {
        if (!error.retryable || attempt >= 3) throw error;
        recovering = true;
        await new Promise((resolve) =>
          root.setTimeout(resolve, 500 * Math.pow(2, attempt)),
        );
      }
    }
  }

  async function sendSubmission(
    apiUrl,
    student,
    files,
    onProgress = function () {},
  ) {
    if (
      !files.length ||
      files.length > MAX_FILES ||
      files.some(
        (file) =>
          !Number.isInteger(file.size) || file.size < 0 || file.size > MAX_SIZE,
      )
    )
      throw new Error("Vui lòng chọn từ 1 đến 10 file, tối đa 1 GB mỗi file.");
    const saved = [];
    try {
      const studentClass = normalizeClass(student.studentClass);
      if (
        !studentClass ||
        studentClass.length > 64 ||
        /[\r\n\t]/.test(studentClass)
      )
        throw new Error("Vui lòng nhập lớp hợp lệ (tối đa 64 ký tự).");
      onProgress(1, "Đang chuẩn bị nộp bài…");
      const ready = await post(apiUrl, {
        studentName: student.studentName,
        studentId: student.studentId,
        studentClass,
        course: typeof student.course === "string" ? student.course.trim() : "",
        action: "start",
        files: files.map((file) => ({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        })),
      });
      if (
        ready.stage !== "ready" ||
        !Array.isArray(ready.uploads) ||
        ready.uploads.length !== files.length ||
        ready.uploads.some(
          (upload, index) =>
            !upload ||
            typeof upload.ticket !== "string" ||
            !upload.ticket ||
            upload.size !== files[index].size,
        )
      ) {
        throw new Error(
          "Máy chủ chưa xác nhận đủ phiên tải file. Chưa có bài nào được gửi.",
        );
      }
      const total = files.reduce(
        (sum, file) => sum + Math.max(1, file.size),
        0,
      );
      let finishedBytes = 0;
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const ticket = ready.uploads[index].ticket;
        let offset = 0;
        let stalled = 0;
        while (true) {
          const end = Math.min(offset + CHUNK_SIZE, file.size);
          const base64 = await readChunk(file.slice(offset, end));
          const result = await sendChunk(apiUrl, ticket, offset, base64);
          if (result.complete === true) {
            const receipt = validateResponse(result, 1)[0];
            if (Number(receipt.size) !== file.size)
              throw new Error(
                "Dung lượng file trên Drive chưa khớp. Vui lòng kiểm tra trước khi gửi lại.",
              );
            saved.push(Object.assign({}, receipt, { sourceIndex: index }));
            finishedBytes += Math.max(1, file.size);
            break;
          }
          const next = result.uploadedBytes;
          if (
            !Number.isInteger(next) ||
            next < offset ||
            next > end ||
            (next === offset && ++stalled > 3)
          )
            throw new Error(
              "Không xác nhận được tiến trình tải file. Vui lòng kiểm tra Drive trước khi gửi lại.",
            );
          if (next > offset) stalled = 0;
          offset = next;
          const percent = Math.min(
            99,
            Math.floor(1 + (98 * (finishedBytes + offset)) / total),
          );
          onProgress(
            percent,
            "Đang gửi file " +
              (index + 1) +
              "/" +
              files.length +
              ": " +
              file.name +
              " (" +
              percent +
              "%)",
          );
        }
      }
      const receipts = validateResponse(
        { success: true, files: saved },
        files.length,
      );
      onProgress(100, "Đã nhận đủ file.");
      return receipts;
    } catch (error) {
      error.uploadedFiles = saved;
      throw error;
    }
  }

  root.UploadCore = Object.freeze({
    MAX_SIZE,
    CHUNK_SIZE,
    normalizeClass,
    mergeFiles,
    confirmedFiles,
    validateResponse,
    sendSubmission,
  });
})(globalThis);
