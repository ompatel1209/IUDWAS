import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Forward the browser's real IP in X-Forwarded-For so the backend
        // rate-limits each client individually instead of every device
        // sharing the proxy's own 127.0.0.1 bucket.
        xfwd: true,
      },
    },
  },
});
