import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Локально, как и в продакшене, фронтенд и API на одном адресе: cookie сессии работают без CORS
    // API_PROXY_TARGET переопределяют e2e-тесты: у них свой API на отдельной базе и порту
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3001',
    },
  },
});
