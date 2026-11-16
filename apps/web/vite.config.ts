import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Библиотеки — отдельными файлами: они меняются реже нашего кода и остаются в кэше браузера между релизами
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'dnd-kit', test: /node_modules[\\/]@dnd-kit[\\/]/, priority: 20 },
            // zod и hono нужны только трекеру — остаются в его ленивом чанке, а не в общем
            { name: 'vendor', test: /node_modules[\\/](?!zod[\\/]|hono[\\/])/, priority: 10 },
          ],
        },
      },
    },
  },
  server: {
    // Локально, как и в продакшене, фронтенд и API на одном адресе: cookie сессии работают без CORS
    // API_PROXY_TARGET переопределяют e2e-тесты: у них свой API на отдельной базе и порту
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3001',
    },
  },
});
