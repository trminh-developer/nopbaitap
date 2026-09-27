'use strict';

/* ── DOM References ── */
const DOM = {
  form: document.getElementById('uploadForm'),
  name: document.getElementById('studentName'),
  email: document.getElementById('studentEmail'),
  note: document.getElementById('studentNote'),
  errName: document.getElementById('nameError'),
  errEmail: document.getElementById('emailError'),
  errFile: document.getElementById('fileError'),
  fileInput: document.getElementById('fileInput'),
  dropzone: document.getElementById('dropzone'),
  dropClick: document.getElementById('dropClickLink'),
  fileList: document.getElementById('fileList'),
  fileItems: document.getElementById('fileItems'),
  clearAll: document.getElementById('clearAllBtn'),
  progressWrap: document.getElementById('progressWrap'),
  progressBar: document.getElementById('progressBar'),
  progressLabel: document.getElementById('progressLabel'),
  progressPct: document.getElementById('progressPct'),
  submitBtn: document.getElementById('submitBtn'),
  submitText: document.getElementById('submitBtnText'),
  toastContainer: document.getElementById('toastContainer')
};

/* ── App State ── */
const State = {
  files: [],
  isUploading: false,
  MAX_SIZE: 10 * 1024 * 1024, // 10 MB
  // ⚠️ THAY ĐỔI: URL của Google Apps Script deployment
  WEBHOOK_URL: 'https://script.googleapis.com/macros/d/YOUR_DEPLOYMENT_ID/usercodeappname',
};

/* ── Utilities ── */
const Utils = {
  escapeHtml: (str) => String(str).replace(/[&<>"']/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[match]),

  formatSize: (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  },

  getExtCls: (name) => {
    const ext = name.split('.').pop().toLowerCase();
    const map = {
      pdf: 'ext-pdf', doc: 'ext-doc', docx: 'ext-doc', xls: 'ext-xls', xlsx: 'ext-xls',
      jpg: 'ext-img', jpeg: 'ext-img', png: 'ext-img', zip: 'ext-zip', rar: 'ext-zip'
    };
    return { label: ext.toUpperCase().slice(0, 4), cls: map[ext] || 'ext-other' };
  },

  fileToBase64: (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error(`Không thể đọc file: ${file.name}`));
    reader.readAsDataURL(file);
  })
};

/* ── UI Logic ── */
const UI = {
  showError: (el, msg) => { el.textContent = msg; },
  clearError: (el) => { el.textContent = ''; },

  updateProgress: (label, pct) => {
    DOM.progressLabel.textContent = label;
    DOM.progressPct.textContent = `${Math.round(pct)}%`;
    DOM.progressBar.style.width = `${pct}%`;
  },

  setLoading: (loading) => {
    State.isUploading = loading;
    DOM.submitBtn.disabled = loading;
    DOM.submitText.innerHTML = loading
      ? `<svg class="btn-icon spin" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" stroke-dasharray="44" stroke-dashoffset="22"/></svg>Đang xử lý…`
      : `<svg class="btn-icon" viewBox="0 0 20 20" fill="none"><path d="M10 3v10M10 3l-3 3M10 3l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 14v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>Nộp bài`;
  },

  showToast: (type, title, message) => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${type === 'success' ? '✅' : '❌'}</div>
      <div class="toast-body">
        <div class="toast-title">${Utils.escapeHtml(title)}</div>
        <div class="toast-msg">${Utils.escapeHtml(message)}</div>
      </div>
      <button class="toast-close">✕</button>`;
    
    const dismiss = () => {
      toast.classList.add('out');
      toast.addEventListener('animationend', () => toast.remove());
    };
    
    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    DOM.toastContainer.appendChild(toast);
    setTimeout(dismiss, 5000);
  },

  renderFiles: () => {
    if (State.files.length === 0) {
      DOM.fileList.hidden = true;
      DOM.fileItems.innerHTML = '';
      return;
    }
    DOM.fileList.hidden = false;
    DOM.fileItems.innerHTML = State.files.map((file, i) => {
      const ext = Utils.getExtCls(file.name);
      return `
        <li class="file-item">
          <div class="file-ext-badge ${ext.cls}">${ext.label}</div>
          <div class="file-info">
            <div class="file-name" title="${Utils.escapeHtml(file.name)}">${Utils.escapeHtml(file.name)}</div>
            <div class="file-size">${Utils.formatSize(file.size)}</div>
          </div>
          <button type="button" class="btn-remove-file" data-index="${i}">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </li>`;
    }).join('');
  },

  resetForm: () => {
    DOM.form.reset();
    State.files = [];
    UI.renderFiles();
    DOM.progressWrap.hidden = true;
    [DOM.errName, DOM.errEmail, DOM.errFile].forEach(UI.clearError);
  }
};

/* ── File Management ── */
const FileHandler = {
  add: (newFiles) => {
    if (State.isUploading) return;
    let blocked = 0;
    Array.from(newFiles).forEach(file => {
      if (file.size > State.MAX_SIZE) blocked++;
      else if (!State.files.some(f => f.name === file.name && f.size === file.size)) {
        State.files.push(file);
      }
    });
    if (blocked) UI.showToast('error', 'Cảnh báo', `${blocked} file vượt giới hạn 10MB.`);
    UI.renderFiles();
    UI.clearError(DOM.errFile);
  },
  
  remove: (index) => {
    if (State.isUploading) return;
    State.files.splice(index, 1);
    UI.renderFiles();
  }
};

/* ── Validation & API ── */
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const validate = () => {
  let valid = true;
  if (!DOM.name.value.trim()) { UI.showError(DOM.errName, '⚠ Nhập họ và tên.'); valid = false; }
  else UI.clearError(DOM.errName);

  if (!DOM.email.value.trim()) { UI.showError(DOM.errEmail, '⚠ Nhập email.'); valid = false; }
  else if (!isValidEmail(DOM.email.value)) { UI.showError(DOM.errEmail, '⚠ Email không hợp lệ.'); valid = false; }
  else UI.clearError(DOM.errEmail);

  if (State.files.length === 0) { UI.showError(DOM.errFile, '⚠ Chọn ít nhất 1 file.'); valid = false; }
  else UI.clearError(DOM.errFile);

  return valid;
};

const submitToServer = async () => {
  DOM.progressWrap.hidden = false;
  UI.updateProgress('Đang mã hóa file...', 10);

  try {
    const filesData = [];
    for (let i = 0; i < State.files.length; i++) {
      const base64 = await Utils.fileToBase64(State.files[i]);
      filesData.push({
        name: State.files[i].name,
        mimeType: State.files[i].type || 'application/octet-stream',
        data: base64
      });
      UI.updateProgress('Đang xử lý file...', 10 + ((i + 1) / State.files.length) * 40);
    }

    const payload = {
      name: DOM.name.value.trim(),
      email: DOM.email.value.trim(),
      note: DOM.note.value.trim(),
      files: filesData
    };

    UI.updateProgress('Đang tải lên Google Drive...', 60);

    // Gửi tới Google Apps Script
    const response = await fetch(State.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Server báo lỗi: ${response.status}`);
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || 'Lỗi không xác định');
    }
    
    UI.updateProgress('Hoàn tất!', 100);
    UI.showToast('success', 'Thành công', 'Bài tập đã được nộp và lưu vào Google Drive!');
    setTimeout(UI.resetForm, 1500);

  } catch (err) {
    console.error('[Upload Error]', err);
    UI.showToast('error', 'Thất bại', err.message || 'Có lỗi xảy ra khi nộp bài.');
    DOM.progressWrap.hidden = true;
  } finally {
    UI.setLoading(false);
  }
};

/* ── Event Listeners ── */
DOM.fileItems.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-remove-file');
  if (btn) FileHandler.remove(Number(btn.dataset.index));
});

DOM.clearAll.addEventListener('click', () => { if (!State.isUploading) { State.files = []; UI.renderFiles(); } });
DOM.dropzone.addEventListener('click', (e) => { if (e.target !== DOM.dropClick) DOM.fileInput.click(); });
DOM.dropClick.addEventListener('click', (e) => { e.stopPropagation(); DOM.fileInput.click(); });

DOM.fileInput.addEventListener('change', () => {
  if (DOM.fileInput.files.length) { FileHandler.add(DOM.fileInput.files); DOM.fileInput.value = ''; }
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => document.addEventListener(evt, e => e.preventDefault()));
DOM.dropzone.addEventListener('dragover', () => DOM.dropzone.classList.add('drag-over'));
DOM.dropzone.addEventListener('dragleave', (e) => { if (!DOM.dropzone.contains(e.relatedTarget)) DOM.dropzone.classList.remove('drag-over'); });
DOM.dropzone.addEventListener('drop', (e) => {
  DOM.dropzone.classList.remove('drag-over');
  if (e.dataTransfer?.files.length) FileHandler.add(e.dataTransfer.files);
});

DOM.name.addEventListener('input', () => { if (DOM.name.value.trim()) UI.clearError(DOM.errName); });
DOM.email.addEventListener('input', () => { if (isValidEmail(DOM.email.value)) UI.clearError(DOM.errEmail); });

DOM.form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (State.isUploading || !validate()) return;
  UI.setLoading(true);
  submitToServer();
});
