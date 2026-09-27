import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useUpload } from '../hooks/useUpload';

/* ── Helpers ── */
const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
};

const getExtInfo = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    pdf: { label: 'PDF', color: '#f87171' },
    doc: { label: 'DOC', color: '#60a5fa' }, docx: { label: 'DOCX', color: '#60a5fa' },
    xls: { label: 'XLS', color: '#34d399' }, xlsx: { label: 'XLSX', color: '#34d399' },
    jpg: { label: 'JPG', color: '#a78bfa' }, jpeg: { label: 'JPG', color: '#a78bfa' },
    png: { label: 'PNG', color: '#a78bfa' }, gif: { label: 'GIF', color: '#a78bfa' },
    zip: { label: 'ZIP', color: '#fb923c' }, rar: { label: 'RAR', color: '#fb923c' },
    js:  { label: 'JS',  color: '#facc15' }, ts:  { label: 'TS',  color: '#38bdf8' },
    css: { label: 'CSS', color: '#818cf8' }, html:{ label: 'HTML',color: '#f472b6' },
  };
  return map[ext] || { label: ext.toUpperCase().slice(0, 4), color: '#94a3b8' };
};

/* ── Sub-components ── */
const FieldError = ({ msg }) =>
  msg ? <p className="mt-1 text-xs text-red-400">{msg}</p> : null;

const FileItem = ({ file, index, onRemove, disabled }) => {
  const ext = getExtInfo(file.name);
  return (
    <li className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-white/5 border border-white/10 group">
      <span
        className="shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-[10px] font-bold tracking-wider"
        style={{ backgroundColor: ext.color + '22', color: ext.color, border: `1px solid ${ext.color}44` }}
      >
        {ext.label}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/90 truncate font-medium">{file.name}</p>
        <p className="text-xs text-white/40">{formatSize(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={disabled}
        className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-30"
        aria-label="Xóa file"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
          <path d="M3 3l10 10M13 3L3 13"/>
        </svg>
      </button>
    </li>
  );
};

/* ── Progress Bar ── */
const ProgressBar = ({ progress, label }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs text-white/50">
      <span>{label}</span>
      <span>{Math.round(progress)}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

/* ── Main Component ── */
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
    if (oversized.length) toast.error(`${oversized.length} file vượt giới hạn 10MB.`);
  };

  const handleFileChange = (e) => {
    const oversized = addFiles(e.target.files);
    if (oversized.length) toast.error(`${oversized.length} file vượt giới hạn 10MB.`);
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

  const progressLabel = progress < 40 ? 'Đang chuẩn bị...' :
                        progress < 90 ? 'Đang tải lên server...' : 'Hoàn tất!';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">

      {/* ── Name + Email ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">
            Họ và tên <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nguyễn Văn A"
            disabled={isLoading}
            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/25
              outline-none transition-all focus:bg-white/8 focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/40
              disabled:opacity-50 ${errors.name ? 'border-red-500/60' : 'border-white/10'}`}
          />
          <FieldError msg={errors.name} />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="vana@example.com"
            disabled={isLoading}
            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/25
              outline-none transition-all focus:bg-white/8 focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/40
              disabled:opacity-50 ${errors.email ? 'border-red-500/60' : 'border-white/10'}`}
          />
          <FieldError msg={errors.email} />
        </div>
      </div>

      {/* ── Class + Course ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Lớp</label>
          <select
            value={studentClass}
            onChange={e => setStudentClass(e.target.value)}
            disabled={isLoading}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:bg-white/8 focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-50 appearance-none"
          >
            <option value="" className="bg-[#1e1e2e]">Chọn lớp...</option>
            <option value="CNTT-01" className="bg-[#1e1e2e]">CNTT-01</option>
            <option value="CNTT-02" className="bg-[#1e1e2e]">CNTT-02</option>
            <option value="KHMT-01" className="bg-[#1e1e2e]">KHMT-01</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Học phần</label>
          <select
            value={course}
            onChange={e => setCourse(e.target.value)}
            disabled={isLoading}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:bg-white/8 focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-50 appearance-none"
          >
            <option value="" className="bg-[#1e1e2e]">Chọn học phần...</option>
            <option value="Lập trình Web" className="bg-[#1e1e2e]">Lập trình Web</option>
            <option value="Cấu trúc dữ liệu" className="bg-[#1e1e2e]">Cấu trúc dữ liệu</option>
            <option value="Cơ sở dữ liệu" className="bg-[#1e1e2e]">Cơ sở dữ liệu</option>
          </select>
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
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all select-none
            ${isDragging
              ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
              : 'border-white/15 bg-white/3 hover:border-white/30 hover:bg-white/5'}
            ${isLoading ? 'pointer-events-none opacity-50' : ''}
            ${errors.files ? 'border-red-500/50' : ''}`}
        >
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all
              ${isDragging ? 'bg-indigo-500/20' : 'bg-white/8'}`}>
              <svg className={`w-6 h-6 transition-colors ${isDragging ? 'text-indigo-400' : 'text-white/40'}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 16V8M12 8l-3 3M12 8l3 3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 20c0 1.1.9 2 2 2h10a2 2 0 002-2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className={`text-sm font-medium transition-colors ${isDragging ? 'text-indigo-300' : 'text-white/60'}`}>
              {isDragging ? '✦ Thả file vào đây' : 'Kéo & thả file vào đây'}
            </p>
            <p className="text-xs text-white/35">
              hoặc <span className="text-indigo-400 underline underline-offset-2">nhấp để chọn file</span>
            </p>
            <p className="text-[11px] text-white/25 mt-1">Tối đa 10 MB · Nhiều file cùng lúc</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileChange} />
        <FieldError msg={errors.files} />
      </div>

      {/* ── File list ── */}
      {files.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
              {files.length} file đã chọn
            </span>
            <button type="button" onClick={clearFiles} disabled={isLoading}
              className="text-xs text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-30">
              Xóa tất cả
            </button>
          </div>
          <ul className="space-y-2">
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
      <button
        type="submit"
        disabled={isLoading}
        className="w-full relative overflow-hidden rounded-2xl py-3.5 px-6 font-semibold text-sm text-white
          bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
          disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200
          shadow-lg shadow-indigo-900/30 active:scale-[0.99]"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="30"/>
            </svg>
            Đang xử lý...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10 3v10M10 3l-3 3M10 3l3 3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 14v1a2 2 0 002 2h8a2 2 0 002-2v-1" strokeLinecap="round"/>
            </svg>
            Nộp bài
          </span>
        )}
      </button>

    </form>
  );
}