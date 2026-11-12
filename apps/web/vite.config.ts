import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Локально, как и в продакшене, фронтенд и API на одном адресе: cookie сессии работают без CORS
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
