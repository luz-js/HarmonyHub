import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: appRoot,
  plugins: [
    react(),
    // App instalable y sin conexion (solo lectura). El service worker es src/sw.ts y solo existe en el build:
    // con `npm run dev` no se registra (devOptions desactivado), asi el servidor de desarrollo sigue igual.
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      devOptions: { enabled: false },
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon-180.png'],
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      manifest: {
        name: 'HarmonyHub',
        short_name: 'HarmonyHub',
        description: 'Canciones, setlists y eventos de tu banda o ministerio, tambien sin conexion.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#111214',
        theme_color: '#111214',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
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
