import { defineConfig } from 'vitest/config';
import { loadLocalEnv } from './src/env.ts';

loadLocalEnv();

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Перед запуском применяет миграции к тестовой базе
    globalSetup: ['./test/global-setup.ts'],
    // Все тесты работают с одной базой — запускаем файлы последовательно
    fileParallelism: false,
  },
});
