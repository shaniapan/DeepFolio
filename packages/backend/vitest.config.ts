import { defineConfig } from 'vitest/config';

process.env.DB_PATH = ':memory:';

export default defineConfig({
  test: {
    env: { DB_PATH: ':memory:' },
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
