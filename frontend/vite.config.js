import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    /**
     * FIX CORS trong development:
     * Thay vì gọi thẳng http://localhost:3001, dùng proxy để
     * browser thấy cùng origin → không cần CORS header từ Express.
     */
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
});