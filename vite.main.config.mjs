// vite.main.config.mjs
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: '.vite/build',
    lib: {
      entry: path.resolve(__dirname, 'src/main.js'),
      formats: ['es'],
      fileName: 'main',
    },
    rollupOptions: {
      // Native / non-bundleable packages — leave these as real
      // require()/import calls resolved from node_modules at runtime
      // instead of trying to inline them into main.mjs. sqlite3 has a
      // compiled .node binary that can't be bundled; ws's optional
      // accelerators (bufferutil, utf-8-validate) don't need to be
      // bundled either. socket.io pulls in ws transitively, so it's
      // externalized too to avoid the same problem.
      external: [
        'sqlite3',
        'bufferutil',
        'utf-8-validate',
        'socket.io',
        'ws',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
