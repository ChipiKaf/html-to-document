import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const useLocal = fs.existsSync(path.resolve(__dirname, 'src/_index.ts'));

export default defineConfig({
  root: path.resolve(__dirname),
  resolve: {
    alias: {
      './_index-or-default': useLocal
        ? path.resolve(__dirname, 'src/_index.ts')
        : path.resolve(__dirname, 'src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
  },
});
