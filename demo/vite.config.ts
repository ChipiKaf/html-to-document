import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const useLocal = fs.existsSync(path.resolve(__dirname, 'src/_index.ts'));

const isDev =
  process.env.NODE_ENV === 'development' || process.env.VITE_DEV === 'true';
const devAliases = isDev
  ? ({
      'html-to-document-adapter-docx': path.resolve(
        __dirname,
        '../packages/adapters/docx/src/index.ts'
      ),
      'html-to-document-adapter-pdf': path.resolve(
        __dirname,
        '../packages/adapters/pdf/src/index.ts'
      ),
      'html-to-document-core': path.resolve(
        __dirname,
        '../packages/core/src/index.ts'
      ),
      'html-to-document': path.resolve(
        __dirname,
        '../packages/html-to-document/src/index.ts'
      ),
    } as const)
  : undefined;

export default defineConfig({
  root: path.resolve(__dirname),
  server: {
    fs: isDev
      ? {
          allow: ['..'],
        }
      : undefined,
  },
  optimizeDeps: {
    exclude: isDev
      ? [
          'html-to-document',
          'html-to-document-core',
          'html-to-document-adapter-docx',
        ]
      : [],
  },
  resolve: {
    alias: {
      ...devAliases,
      './_index-or-default': useLocal
        ? path.resolve(__dirname, 'src/_index.ts')
        : path.resolve(__dirname, 'src/index.ts'),
    },
  },
  define: {
    global: 'globalThis',
  },
  build: {
    outDir: 'dist',
  },
});
