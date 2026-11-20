import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: { DB_PREFIX: 't_', NODE_ENV: 'test' },
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    sequence: { sequencer: (await import('./test/sequencer.js')).default },
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
