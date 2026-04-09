import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'html-to-document-core': resolve(__dirname, '../../core/src/index.ts'),
    },
  },
});
