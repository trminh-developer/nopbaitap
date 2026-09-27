import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useUpload } from '../hooks/useUpload';

/* ── Helpers ── */
const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
};

const EXT_MAP = {
  pdf:  { label: 'PDF',  color: '#ef4444', icon: '📄' },
  doc:  { label: 'DOC',  color: '#3b82f6', icon: '📝' },
  docx: { label: 'DOCX', color: '#3b82f6', icon: '📝' },
  xls:  { label: 'XLS',  color: '#22c55e', icon: '📊' },
  xlsx: { label: 'XLSX', color: '#22c55e', icon: '📊' },
  ppt:  { label: 'PPT',  color: '#f97316', icon: '📊' },
  pptx: { label: 'PPTX', color: '#f97316', icon: '📊' },
  jpg:  { label: 'JPG',  color: '#a855f7', icon: '🖼️' },
  jpeg: { label: 'JPEG', color: '#a855f7', icon: '🖼️' },
  png:  { label: 'PNG',  color: '#a855f7', icon: '🖼️' },
  gif:  { label: 'GIF',  color: '#a855f7', icon: '🖼️' },
  zip:  { label: 'ZIP',  color: '#eab308', icon: '📦' },
  rar:  { label: 'RAR',  color: '#eab308', icon: '📦' },
  js:   { label: 'JS',   color: '#eab308', icon: '⚡' },
  py:   { label: 'PY',   color: '#3b82f6', icon: '🐍' },
  cpp:  { label: 'C++',  color: '#06b6d4', icon: '⚙️' },
  c:    { label: 'C',    color: '#06b6d4', icon: '⚙️' },
  java: { label: 'JAVA', color: '#f97316', icon: '☕' },
  txt:  { label: 'TXT',  color: '#6b7280', icon: '📃' },
};

const getExtInfo = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  return EXT_MAP[ext] || { label: ext.toUpperCase().slice(0, 4), color: '#6b7280', icon: '📎' };
};

/* ── Icons (inline SVGs) ── */
const IconUploadCloud = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242" />
    <path d="M12 12v9" />
    <path d="M8 17l4-4 4 4" />
  </svg>
);

const IconX = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const IconSend = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

const IconSpinner = ({ className }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-80" d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/* ── Sub-components ── */
const FieldError = ({ msg }) =>
  msg ? (
    <p className="mt-1.5 text-xs text-red-400/90 flex items-center gap-1">
      <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
      {msg}
    </p>
  ) : null;

const InputLabel = ({ children, required }) => (
  <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
    {children}
    {required && <span className="text-indigo-400/70 ml-0.5">*</span>}
  </label>
);

const FileItem = ({ file, index, onRemove, disabled }) => {
  const ext = getExtInfo(file.name);
  return (
    <li className="file-item flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] group">
      <span
        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold tracking-wider"
        style={{
          backgroundColor: ext.color + '12',
          color: ext.color,
          border: `1px solid ${ext.color}25`,
        }}
      >
        {ext.label}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-white/80 truncate font-medium">{file.name}</p>
        <p className="text-[11px] text-white/25 mt-0.5">{formatSize(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={disabled}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/20
          hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 disabled:opacity-20"
        aria-label="Xóa file"
      >
        <IconX className="w-3.5 h-3.5" />
      </button>
    </li>
  );
};

const ProgressBar = ({ progress, label }) => (
  <div className="space-y-2 step-enter">
    <div className="flex justify-between text-[11px] text-white/40">
      <span>{label}</span>
      <span className="tabular-nums font-medium text-indigo-400/80">{Math.round(progress)}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #6366f1, #a855f7)',
          boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
        }}
      />
    </div>
  </div>
);

/* ──────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────────────── */
export default function UploadForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [course, setCourse] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const { files, errors, status, progress, addFiles, removeFile, clearFiles, submit } = useUpload();
  const isLoading = status === 'loading';

  /* ── Drag handlers ── */
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const oversized = addFiles(e.dataTransfer.files);
    if (oversized.length) toast.error(`${oversized.length} file vượt quá 10 MB`);
  };

  const handleFileChange = (e) => {
    const oversized = addFiles(e.target.files);
    if (oversized.length) toast.error(`${oversized.length} file vượt quá 10 MB`);
    e.target.value = '';
  };

  /* ── Submit handler ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await submit({ name, email, studentClass, course });
    if (result.success) {
      toast.success('Nộp bài thành công! 🎉');
      setName(''); setEmail(''); setStudentClass(''); setCourse('');
    } else if (result.message) {
      toast.error(result.message);
    }
  };

  const progressLabel =
    progress < 40 ? 'Đang mã hóa file...' :
    progress < 90 ? 'Đang tải lên Google Drive...' : 'Hoàn tất!';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* ── Row 1: Name + Email ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <InputLabel required>Họ và tên</InputLabel>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nguyễn Văn A"
            disabled={isLoading}
            className={`glass-input ${errors.name ? 'has-error' : ''}`}
          />
          <FieldError msg={errors.name} />
        </div>
        <div>
          <InputLabel required>Email</InputLabel>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@example.com"
            disabled={isLoading}
            className={`glass-input ${errors.email ? 'has-error' : ''}`}
          />
          <FieldError msg={errors.email} />
        </div>
      </div>

      {/* ── Row 2: Class + Course ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <InputLabel>Lớp</InputLabel>
          <select
            value={studentClass}
            onChange={e => setStudentClass(e.target.value)}
            disabled={isLoading}
            className="glass-select"
          >
            <option value="">Chọn lớp...</option>
            <option value="CNTT-01">CNTT-01</option>
            <option value="CNTT-02">CNTT-02</option>
            <option value="KHMT-01">KHMT-01</option>
          </select>
        </div>
        <div>
          <InputLabel>Học phần</InputLabel>
          <select
            value={course}
            onChange={e => setCourse(e.target.value)}
            disabled={isLoading}
            className="glass-select"
          >
            <option value="">Chọn học phần...</option>
            <option value="Lập trình Web">Lập trình Web</option>
            <option value="Cấu trúc dữ liệu">Cấu trúc dữ liệu</option>
            <option value="Cơ sở dữ liệu">Cơ sở dữ liệu</option>
          </select>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.05]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#08080f] px-3 text-[10px] uppercase tracking-[0.2em] text-white/20">
            Đính kèm file
          </span>
        </div>
      </div>

      {/* ── Dropzone ── */}
      <div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && !isLoading && fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
            transition-all duration-300 select-none
            ${isDragging
              ? 'border-indigo-400/60 bg-indigo-500/[0.08] scale-[1.01] dropzone-active'
              : 'border-white/[0.08] bg-white/[0.015] hover:border-white/[0.15] hover:bg-white/[0.03]'}
            ${isLoading ? 'pointer-events-none opacity-40' : ''}
            ${errors.files ? 'border-red-500/40' : ''}`}
        >
          <div className="flex flex-col items-center gap-3 pointer-events-none">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
              ${isDragging ? 'bg-indigo-500/15 scale-110' : 'bg-white/[0.04]'}`}>
              <IconUploadCloud className={`w-6 h-6 transition-colors duration-300
                ${isDragging ? 'text-indigo-400' : 'text-white/25'}`} />
            </div>
            <div>
              <p className={`text-sm font-medium transition-colors duration-300
                ${isDragging ? 'text-indigo-300' : 'text-white/50'}`}>
                {isDragging ? 'Thả file vào đây' : 'Kéo & thả file vào đây'}
              </p>
              <p className="text-xs text-white/25 mt-1">
                hoặc{' '}
                <span className="text-indigo-400/70 hover:text-indigo-400 transition-colors cursor-pointer">
                  nhấp để chọn file
                </span>
              </p>
            </div>
            <p className="text-[10px] text-white/15 mt-0.5">Tối đa 10 MB mỗi file · Gửi nhiều file cùng lúc</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileChange} />
        <FieldError msg={errors.files} />
      </div>

      {/* ── File list ── */}
      {files.length > 0 && (
        <div className="step-enter">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-medium text-white/30 uppercase tracking-widest flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-indigo-500/15 text-indigo-400 text-[10px] font-bold">
                {files.length}
              </span>
              file đã chọn
            </span>
            <button
              type="button"
              onClick={clearFiles}
              disabled={isLoading}
              className="text-[11px] text-white/20 hover:text-red-400/80 transition-colors duration-200 disabled:opacity-30"
            >
              Xóa tất cả
            </button>
          </div>
          <ul className="space-y-1.5">
            {files.map((f, i) => (
              <FileItem key={`${f.name}-${f.size}`} file={f} index={i} onRemove={removeFile} disabled={isLoading} />
            ))}
          </ul>
        </div>
      )}

      {/* ── Progress ── */}
      {isLoading && progress > 0 && (
        <ProgressBar progress={progress} label={progressLabel} />
      )}

      {/* ── Submit ── */}
      <button type="submit" disabled={isLoading} className="btn-submit">
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <IconSpinner className="w-4 h-4" />
            Đang xử lý...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <IconSend className="w-4 h-4" />
            Nộp bài
          </span>
        )}
      </button>

    </form>
  );
}