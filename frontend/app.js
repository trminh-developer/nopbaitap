(function () {
  "use strict";
  // Cập nhật URL /exec tại đây khi triển khai Google Apps Script khác.
  const API_URL =
    "https://script.google.com/macros/s/AKfycbziQz-8yUlOpZWHpGeGs7ZToc3SW1EZ4--O_KhitZVvN0A9a-SpPe2Vg7UOdEl1yzqnXQ/exec";
  const $ = (id) => document.getElementById(id);
  const form = $("uploadForm");
  let files = [];
  let busy = false;
  let reviewed = null;
  function failStartup(message) {
    $("appError").textContent = message;
    $("appError").hidden = false;
    $("formFields").disabled = true;
  }
  if (!window.UploadCore) {
    failStartup(
      "Chưa tải được chức năng nộp bài. Vui lòng nhấn Ctrl+F5 để tải lại trang.",
    );
    return;
  }
  if (!window.axios || typeof window.axios.post !== "function") {
    failStartup(
      "Chưa tải được thư viện kết nối API. Vui lòng nhấn Ctrl+F5 để tải lại trang.",
    );
    return;
  }
  if (!window.bootstrap) {
    failStartup(
      "Chưa tải được thành phần giao diện. Vui lòng kiểm tra kết nối mạng và tải lại trang.",
    );
    return;
  }
  if (
    ["studentName", "studentId", "studentClass", "course"].some((id) => !$(id))
  ) {
    failStartup(
      "Giao diện đang dùng phiên bản cũ. Vui lòng nhấn Ctrl+F5 để tải lại trang.",
    );
    return;
  }
  const confirmModal = new bootstrap.Modal($("confirmModal"));
  const resultModal = new bootstrap.Modal($("resultModal"));

  $("studentClass").addEventListener("blur", () => {
    $("studentClass").value = UploadCore.normalizeClass(
      $("studentClass").value,
    );
  });

  function renderFiles() {
    $("fileList").replaceChildren();
    $("fileSection").hidden = !files.length;
    $("fileCount").textContent = files.length + " file đã chọn";
    files.forEach((file, index) => {
      const item = document.createElement("li");
      item.className = "file-item";
      const badge = document.createElement("span");
      badge.className = "file-badge";
      badge.textContent = (
        file.name.includes(".") ? file.name.split(".").pop() : "FILE"
      )
        .slice(0, 4)
        .toUpperCase();
      const info = document.createElement("div");
      info.className = "file-info";
      const name = document.createElement("div");
      name.className = "file-name";
      name.textContent = file.name;
      name.title = file.name;
      const size = document.createElement("div");
      size.className = "file-size";
      size.textContent =
        file.size >= 1073741824
          ? (file.size / 1073741824).toFixed(1) + " GB"
          : file.size >= 1048576
            ? (file.size / 1048576).toFixed(1) + " MB"
            : Math.ceil(file.size / 1024) + " KB";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-file";
      remove.dataset.fileIndex = index;
      remove.setAttribute("aria-label", "Xóa " + file.name);
      remove.textContent = "×";
      info.append(name, size);
      item.append(badge, info, remove);
      $("fileList").append(item);
    });
  }
  function addFiles(incoming) {
    if (busy) return;
    const result = UploadCore.mergeFiles(files, incoming);
    files = result.files;
    $("selectionFeedback").textContent = result.warnings.join(" ");
    $("selectionFeedback").hidden = !result.warnings.length;
    $("filesError").hidden = true;
    $("dropzone").classList.remove("is-invalid");
    $("dropzone").removeAttribute("aria-invalid");
    renderFiles();
  }
  $("dropzone").addEventListener("click", () => {
    if (!busy) $("fileInput").click();
  });
  $("fileInput").addEventListener("change", (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  });
  for (const type of ["dragenter", "dragover"])
    $("dropzone").addEventListener(type, (event) => {
      event.preventDefault();
      if (!busy) $("dropzone").classList.add("dragging");
    });
  for (const type of ["dragleave", "drop"])
    $("dropzone").addEventListener(type, (event) => {
      event.preventDefault();
      $("dropzone").classList.remove("dragging");
      if (type === "drop") addFiles(event.dataTransfer.files);
    });
  $("fileList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-file-index]");
    if (button && !busy) {
      files.splice(Number(button.dataset.fileIndex), 1);
      renderFiles();
    }
  });
  $("clearFiles").addEventListener("click", () => {
    if (!busy) {
      files = [];
      renderFiles();
    }
  });
  for (const id of ["studentName", "studentId", "studentClass"])
    $(id).addEventListener("input", () => {
      $(id).classList.remove("is-invalid");
      $(id).removeAttribute("aria-invalid");
    });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (busy) return;
    const student = {
      studentName: $("studentName").value.trim(),
      studentId: $("studentId").value.trim(),
      studentClass: UploadCore.normalizeClass($("studentClass").value),
      course: $("course").value.trim(),
    };
    const nameInvalid = !student.studentName;
    const studentIdInvalid =
      !student.studentId || student.studentId.length > 64;
    const validations = [
      ["studentName", nameInvalid],
      ["studentId", studentIdInvalid],
      [
        "studentClass",
        !student.studentClass || student.studentClass.length > 64,
      ],
    ];
    for (const [id, invalid] of validations) {
      $(id).classList.toggle("is-invalid", invalid);
      $(id).setAttribute("aria-invalid", String(invalid));
    }
    $("filesError").hidden = !!files.length;
    $("dropzone").classList.toggle("is-invalid", !files.length);
    $("dropzone").setAttribute("aria-invalid", String(!files.length));
    const invalidField = validations.find(([_id, invalid]) => invalid);
    if (invalidField || !files.length) {
      $(invalidField ? invalidField[0] : "dropzone").focus();
      return;
    }
    $("studentClass").value = student.studentClass;
    reviewed = { student, files: files.slice() };
    $("confirmDetails").replaceChildren();
    for (const [label, value] of [
      ["Họ tên", student.studentName],
      ["Student ID", student.studentId],
      ["Lớp", student.studentClass],
      ["Học phần", student.course || "Chưa nhập"],
      ["Bài tập", files.map((file) => file.name).join(", ")],
    ]) {
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = label;
      detail.textContent = value;
      $("confirmDetails").append(term, detail);
    }
    $("confirmSubmit").disabled = true;
    $("confirmModal").addEventListener(
      "shown.bs.modal",
      () => {
        if (!busy) $("confirmSubmit").disabled = false;
      },
      { once: true },
    );
    confirmModal.show();
  });

  function setBusy(value) {
    busy = value;
    $("formFields").disabled = value;
    $("confirmSubmit").disabled = value;
    form.setAttribute("aria-busy", String(value));
    $("submitSpinner").hidden = !value;
    $("submitLabel").textContent = value ? "Đang gửi bài…" : "Gửi bài tập";
    $("progressSection").hidden = !value;
  }
  function showResult(success, message, receipts) {
    $("resultTitle").textContent = success
      ? "Nộp bài thành công!"
      : "Chưa hoàn tất nộp bài";
    $("resultTitle").classList.toggle("text-success", success);
    $("resultTitle").classList.toggle("text-warning", !success);
    $("resultMessage").textContent = message;
    $("resultFiles").replaceChildren();
    for (const file of UploadCore.confirmedFiles(receipts)) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = file.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = file.name + " ↗";
      item.append(link);
      $("resultFiles").append(item);
    }
    resultModal.show();
  }
  $("confirmSubmit").addEventListener("click", async () => {
    if (busy || !reviewed) return;
    const submission = reviewed;
    reviewed = null;
    setBusy(true);
    const hidden = new Promise((resolve) =>
      $("confirmModal").addEventListener("hidden.bs.modal", resolve, {
        once: true,
      }),
    );
    confirmModal.hide();
    await hidden;
    try {
      const receipts = await UploadCore.sendSubmission(
        API_URL,
        submission.student,
        submission.files,
        (value, label) => {
          $("progressBar").style.width = value + "%";
          $("progressTrack").setAttribute("aria-valuenow", String(value));
          $("progressLabel").textContent = label;
        },
      );
      files = [];
      form.reset();
      renderFiles();
      $("selectionFeedback").hidden = true;
      showResult(
        true,
        "Đã lưu đủ " +
          receipts.length +
          " file. Mở liên kết bên dưới để kiểm tra bài trên Google Drive.",
        receipts,
      );
    } catch (error) {
      const partial = error.uploadedFiles || [];
      if (partial.length) {
        const completed = new Set(partial.map((file) => file.sourceIndex));
        files = submission.files.filter(
          (_file, index) => !completed.has(index),
        );
        renderFiles();
      }
      const message = partial.length
        ? "Đã lưu " +
          partial.length +
          " file dưới đây. Chỉ các file chưa hoàn tất được giữ lại. " +
          error.message
        : error.message ||
          "Không kết nối được Google Drive. Vui lòng kiểm tra Drive trước khi gửi lại.";
      showResult(false, message, partial);
    } finally {
      setBusy(false);
      $("progressBar").style.width = "0%";
      $("progressTrack").setAttribute("aria-valuenow", "0");
    }
  });
})();
