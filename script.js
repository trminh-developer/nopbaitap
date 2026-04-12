/* UPLOAD PORTAL — script.js
   Vanilla JS ES6+ · Google Drive MCP (thật)= */

'use strict';

/* ── DOM References ── */
const form          = document.getElementById('uploadForm');
const nameInput     = document.getElementById('studentName');
const emailInput    = document.getElementById('studentEmail');
const noteInput     = document.getElementById('studentNote');
const nameError     = document.getElementById('nameError');
const emailError    = document.getElementById('emailError');
const fileError     = document.getElementById('fileError');
const fileInput     = document.getElementById('fileInput');
const dropzone      = document.getElementById('dropzone');
const dropClickLink = document.getElementById('dropClickLink');
const fileList      = document.getElementById('fileList');
const fileItems     = document.getElementById('fileItems');
const clearAllBtn   = document.getElementById('clearAllBtn');
const progressWrap  = document.getElementById('progressWrap');
const progressBar   = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const progressPct   = document.getElementById('progressPct');
const submitBtn     = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');
const toastContainer = document.getElementById('toastContainer');

/* App State */
let selectedFiles = [];

/* SECTION 1 — File Type Helpers */

const FILE_EXT_MAP = {
  pdf:  { label: 'PDF', cls: 'ext-pdf'  },
  doc:  { label: 'DOC', cls: 'ext-doc'  },
  docx: { label: 'DOC', cls: 'ext-doc'  },
  xls:  { label: 'XLS', cls: 'ext-xls'  },
  xlsx: { label: 'XLS', cls: 'ext-xls'  },
  jpg:  { label: 'IMG', cls: 'ext-img'  },
  jpeg: { label: 'IMG', cls: 'ext-img'  },
  png:  { label: 'IMG', cls: 'ext-img'  },
  gif:  { label: 'IMG', cls: 'ext-img'  },
  webp: { label: 'IMG', cls: 'ext-img'  },
  svg:  { label: 'SVG', cls: 'ext-img'  },
  zip:  { label: 'ZIP', cls: 'ext-zip'  },
  rar:  { label: 'RAR', cls: 'ext-zip'  },
  '7z': { label: '7Z',  cls: 'ext-zip'  },
  txt:  { label: 'TXT', cls: 'ext-txt'  },
  md:   { label: 'MD',  cls: 'ext-txt'  },
};

const getExtInfo = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  return FILE_EXT_MAP[ext] || { label: ext.toUpperCase().slice(0, 4) || '···', cls: 'ext-other' };
};

const formatSize = (bytes) => {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/* SECTION 2 — File List Management */

const addFiles = (incoming) => {
  let blocked = 0, dupes = 0;
  Array.from(incoming).forEach((file) => {
    if (file.size > MAX_FILE_SIZE) { blocked++; return; }
    const isDupe = selectedFiles.some(f => f.name === file.name && f.size === file.size);
    if (isDupe) { dupes++; return; }
    selectedFiles.push(file);
  });
  if (blocked > 0) showToast('error', 'Vượt giới hạn', `${blocked} file bị loại vì vượt 10 MB.`);
  if (dupes > 0)   showToast('error', 'File trùng', `${dupes} file đã tồn tại trong danh sách.`);
  renderFileList();
  clearError(fileError);
};

const removeFile = (index) => { selectedFiles.splice(index, 1); renderFileList(); };

const renderFileList = () => {
  if (selectedFiles.length === 0) { fileList.hidden = true; fileItems.innerHTML = ''; return; }
  fileList.hidden = false;
  fileItems.innerHTML = '';
  selectedFiles.forEach((file, i) => {
    const { label, cls } = getExtInfo(file.name);
    const li = document.createElement('li');
    li.className = 'file-item';
    li.innerHTML = `
      <div class="file-ext-badge ${cls}">${label}</div>
      <div class="file-info">
        <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
        <div class="file-size">${formatSize(file.size)}</div>
      </div>
      <button type="button" class="btn-remove-file" aria-label="Xóa">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M3 3l10 10M13 3L3 13"/>
        </svg>
      </button>`;
    li.querySelector('.btn-remove-file').addEventListener('click', () => removeFile(i));
    fileItems.appendChild(li);
  });
};

/* SECTION 3 — Drag & Drop */

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt =>
  document.addEventListener(evt, e => e.preventDefault(), false)
);
dropzone.addEventListener('dragenter', () => dropzone.classList.add('drag-over'));
dropzone.addEventListener('dragover',  () => dropzone.classList.add('drag-over'));
dropzone.addEventListener('dragleave', (e) => {
  if (!dropzone.contains(e.relatedTarget)) dropzone.classList.remove('drag-over');
});
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  if (e.dataTransfer?.files.length > 0) addFiles(e.dataTransfer.files);
});
dropzone.addEventListener('click', (e) => { if (e.target !== dropClickLink) fileInput.click(); });
dropClickLink.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) { addFiles(fileInput.files); fileInput.value = ''; }
});
clearAllBtn.addEventListener('click', () => { selectedFiles = []; renderFileList(); });

/* SECTION 4 — Validation */

const showError  = (el, msg) => { el.textContent = msg; };
const clearError = (el) => { el.textContent = ''; };
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const validateForm = () => {
  let valid = true;
  if (!nameInput.value.trim())              { showError(nameError,  '⚠ Vui lòng nhập họ và tên.'); valid = false; } else clearError(nameError);
  if (!emailInput.value.trim())             { showError(emailError, '⚠ Vui lòng nhập email.'); valid = false; }
  else if (!isValidEmail(emailInput.value)) { showError(emailError, '⚠ Email không hợp lệ.'); valid = false; }
  else clearError(emailError);
  if (selectedFiles.length === 0)           { showError(fileError,  '⚠ Vui lòng chọn ít nhất 1 file.'); valid = false; } else clearError(fileError);
  return valid;
};

nameInput.addEventListener('input',  () => { if (nameInput.value.trim()) clearError(nameError); });
emailInput.addEventListener('input', () => { if (isValidEmail(emailInput.value)) clearError(emailError); });

/* SECTION 5 — Base64 Conversion */

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload  = () => resolve(reader.result.split(',')[1]);
  reader.onerror = () => reject(new Error(`Không thể đọc: ${file.name}`));
  reader.readAsDataURL(file);
});

const convertAllToBase64 = async () => {
  const result = [];
  for (let i = 0; i < selectedFiles.length; i++) {
    updateProgress(`Đang đọc file ${i + 1}/${selectedFiles.length}…`, Math.round((i / selectedFiles.length) * 40));
    const base64 = await fileToBase64(selectedFiles[i]);
    result.push({
      name: selectedFiles[i].name,
      type: selectedFiles[i].type || 'application/octet-stream',
      size: selectedFiles[i].size,
      data: base64,
    });
  }
  return result;
};

/* SECTION 6 — Progress Bar */

const updateProgress = (label, pct) => {
  progressLabel.textContent = label;
  progressPct.textContent   = `${Math.round(pct)}%`;
  progressBar.style.width   = `${pct}%`;
};

const animateProgress = (from, to, ms, label) => new Promise(resolve => {
  const steps = Math.ceil(ms / 40);
  let step = 0;
  updateProgress(label, from);
  const id = setInterval(() => {
    step++;
    updateProgress(label, Math.min(from + (to - from) * (step / steps), to));
    if (step >= steps) { clearInterval(id); resolve(); }
  }, 40);
});

/* SECTION 7 — Upload thật lên Google Drive qua MCP */

const uploadViaGoogleDriveMCP = async (payload, onProgress) => {
  const today = new Date().toLocaleDateString('vi-VN');
  const folderName = `Bài Nộp — ${payload.name} — ${today}`;

  const filesSummary = payload.files
    .map((f, i) => `  [${i + 1}] "${f.name}" (${formatSize(f.size)})`)
    .join('\n');

  // Gửi thông tin + file dưới dạng document blocks
  const userContent = [
    {
      type: 'text',
      text: `Hãy thực hiện theo thứ tự:
1. Tạo thư mục mới trên Google Drive tên: "${folderName}"
2. Upload tất cả ${payload.files.length} file đính kèm vào thư mục đó, giữ nguyên tên file.
3. Trả lời bằng tiếng Việt, bao gồm: link thư mục Drive và tên từng file đã upload thành công.

Người nộp: ${payload.name} (${payload.email})
Ghi chú: ${payload.note || 'Không có'}
Danh sách file:\n${filesSummary}`,
    },
    // Đính kèm từng file dưới dạng document base64
    ...payload.files.map(f => ({
      type: 'document',
      source: { type: 'base64', media_type: f.type, data: f.data },
      title: f.name,
    })),
  ];

  onProgress('Đang kết nối Google Drive…', 45);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      mcp_servers: [
        { type: 'url', url: 'https://drive.mcp.claude.com/mcp', name: 'google-drive' }
      ],
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Lỗi API: ${response.status}`);
  }

  onProgress('Đang upload lên Drive…', 70);

  const data = await response.json();
  const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
  const resultText = textBlocks.join('\n').trim();

  if (!resultText) throw new Error('Không nhận được phản hồi từ Drive.');
  return resultText;
};

/* SECTION 8 — Submit Handler */

const setSubmitting = (loading) => {
  submitBtn.disabled = loading;
  submitBtnText.innerHTML = loading
    ? `<svg class="btn-icon spin" viewBox="0 0 20 20" fill="none">
         <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2"
           stroke-dasharray="44" stroke-dashoffset="22" stroke-linecap="round"/>
       </svg>Đang upload…`
    : `<svg class="btn-icon" viewBox="0 0 20 20" fill="none">
         <path d="M10 3v10M10 3l-3 3M10 3l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
         <path d="M4 14v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
       </svg>Nộp bài`;

  if (loading && !document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = `.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`;
    document.head.appendChild(s);
  }
};

const resetForm = () => {
  form.reset();
  selectedFiles = [];
  renderFileList();
  fileList.hidden     = true;
  progressWrap.hidden = true;
  updateProgress('', 0);
  [nameError, emailError, fileError].forEach(clearError);
};

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  setSubmitting(true);
  progressWrap.hidden = false;
  updateProgress('Đang đọc file…', 0);

  try {
    // Phase 1: Base64 (0 → 40%)
    const filesPayload = await convertAllToBase64();
    updateProgress('Chuẩn bị dữ liệu…', 42);

    const payload = {
      name:  nameInput.value.trim(),
      email: emailInput.value.trim(),
      note:  noteInput.value.trim(),
      files: filesPayload,
    };

    // Phase 2: Upload Drive (40 → 95%)
    const driveResult = await uploadViaGoogleDriveMCP(payload, updateProgress);

    // Phase 3: Done (95 → 100%)
    await animateProgress(95, 100, 400, 'Hoàn tất! ✓');

    // Log ra console
    console.group('%c✅ Upload lên Google Drive thành công', 'font-size:14px;font-weight:700;color:#22c55e;');
    console.log('Người nộp:', payload.name, `<${payload.email}>`);
    console.log('Số file:', payload.files.length);
    console.log('Kết quả:\n', driveResult);
    console.groupEnd();

    // Tìm link Drive trong response
    const linkMatch = driveResult.match(/https:\/\/drive\.google\.com\/[^\s)>\]"]+/);
    const driveLink = linkMatch ? linkMatch[0] : null;

    showToast(
      'success',
      'Upload lên Drive thành công! 🎉',
      driveLink ? 'Nhấp vào đây để mở thư mục Drive ↗' : driveResult.slice(0, 100),
      8000,
      driveLink,
    );

    setTimeout(() => { setSubmitting(false); resetForm(); }, 1500);

  } catch (err) {
    console.error('[Upload Portal] Lỗi:', err);
    showToast('error', 'Upload thất bại', err.message || 'Vui lòng thử lại.');
    setSubmitting(false);
    progressWrap.hidden = true;
  }
};

form.addEventListener('submit', handleSubmit);

/* SECTION 9 — Toast Notifications */

const showToast = (type, title, message, duration = 5000, link = null) => {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  if (link) toast.style.cursor = 'pointer';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="toast-icon">${type === 'success' ? '✅' : '❌'}</div>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-msg">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" aria-label="Đóng">✕</button>`;

  const dismiss = () => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  if (link) {
    toast.addEventListener('click', (e) => {
      if (!e.target.closest('.toast-close')) window.open(link, '_blank');
    });
  }
  toast.querySelector('.toast-close').addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
  toastContainer.appendChild(toast);
  if (duration > 0) setTimeout(dismiss, duration);
};

/* SECTION 10 — Utilities */

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');