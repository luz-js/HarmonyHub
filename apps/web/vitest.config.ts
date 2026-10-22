import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: appRoot,
  plugins: [react()],
  resolve: {
    // Los contratos compartidos se usan desde el codigo fuente (la API usa su version compilada en dist).
    alias: {
      '@harmonyhub/contracts': resolve(appRoot, '../../packages/contracts/src/index.ts'),
      // En las pruebas no hay plugin PWA: el registro del service worker se reemplaza por uno vacio.
      'virtual:pwa-register': resolve(appRoot, 'src/pwa/testing/pwa-register.stub.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: false,
  },
});
