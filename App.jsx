import { Toaster } from 'sonner';
import UploadForm from './components/UploadForm';

export default function App() {
  return (
    <>
      {/* Global toast provider */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' },
          duration: 5000,
        }}
      />

      {/* Background orbs (reused từ design gốc) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-violet-600/15 blur-[100px]" />
        <div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-blue-600/10 blur-[80px]" />
      </div>

      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#0d0d14]">
        <div className="w-full max-w-xl">

          {/* Header */}
          <header className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/6 border border-white/10 text-sm text-white/60 mb-4">
              <span>🚀</span> Upload Portal
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Nộp Bài Tập</h1>
            <p className="mt-2 text-sm text-white/40">Điền thông tin và đính kèm file.</p>
          </header>

          {/* Card */}
          <div className="bg-white/4 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
            <UploadForm />
          </div>

          {/* Footer */}
          <footer className="mt-6 text-center text-xs text-white/25 space-y-1">
            <p>Liên hệ: <a href="mailto:trminhlaptrinhvien@gmail.com" className="hover:text-white/50 transition-colors">trminhlaptrinhvien@gmail.com</a></p>
            <p>Mã nguồn: <a href="https://github.com/trminh-developer/nopbaitap.git" target="_blank" rel="noreferrer" className="hover:text-white/50 transition-colors">GitHub</a></p>
            <p className="mt-2">© TrMinh</p>
          </footer>
        </div>
      </main>
    </>
  );
}