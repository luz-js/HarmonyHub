import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: appRoot,
  plugins: [react()],
  resolve: {
    // Los contratos compartidos se usan desde el codigo fuente (la API usa su version compilada en dist).
    alias: { '@harmonyhub/contracts': resolve(appRoot, '../../packages/contracts/src/index.ts') },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: resolve(appRoot, '../../dist/web'),
    emptyOutDir: true,
  },
});
