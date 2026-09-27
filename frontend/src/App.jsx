import { Toaster } from 'sonner';
import UploadForm from './components/UploadForm.jsx';

export default function App() {
  return (
    <>
      {/* Toast provider */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(15, 15, 25, 0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            fontSize: '13px',
          },
          duration: 4000,
        }}
      />

      {/* Animated mesh gradient background */}
      <div className="mesh-gradient" />

      {/* Extra floating orb */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-purple-600/[0.06] blur-[100px]" />
      </div>

      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg">

          {/* ── Header ── */}
          <header className="mb-8 text-center">
            {/* Logo icon */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/[0.08] mb-5">
              <svg className="w-7 h-7 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 14l9-5-9-5-9 5 9 5z" strokeLinejoin="round"/>
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" strokeLinejoin="round"/>
                <path d="M12 14v7" strokeLinecap="round"/>
                <path d="M21 9v3" strokeLinecap="round"/>
              </svg>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Nộp Bài Tập
            </h1>
            <p className="mt-2 text-sm text-white/30">
              Điền thông tin · Đính kèm file · Gửi trực tiếp lên Google Drive
            </p>
          </header>

          {/* ── Card ── */}
          <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm"
            style={{ boxShadow: '0 0 80px rgba(99, 102, 241, 0.03), 0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            {/* Top border glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
            <UploadForm />
          </div>

          {/* ── Footer ── */}
          <footer className="mt-8 text-center text-xs text-white/20 space-y-1.5">
            <p>
              Liên hệ:{' '}
              <a href="mailto:trminhlaptrinhvien@gmail.com" className="text-white/30 hover:text-indigo-400/70 transition-colors duration-300">
                trminhlaptrinhvien@gmail.com
              </a>
            </p>
            <p className="flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              <a href="https://github.com/trminh-developer/nopbaitap" target="_blank" rel="noreferrer" className="text-white/30 hover:text-indigo-400/70 transition-colors duration-300">
                trminh-developer/nopbaitap
              </a>
            </p>
            <p className="pt-1 text-white/15">© {new Date().getFullYear()} TrMinh</p>
          </footer>
        </div>
      </main>
    </>
  );
}