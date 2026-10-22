import { markUpdateReady } from './pwa-state';

/**
 * Registra el service worker, solo en el build de produccion: con `npm run dev` no hay service worker, asi el
 * servidor de desarrollo se comporta igual que siempre (sin caches que confundan al probar).
 * Cuando hay una version nueva no se recarga sola: se muestra el aviso y la persona decide (ver PwaBanners).
 */
export async function registerServiceWorker() {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const { registerSW } = await import('virtual:pwa-register');
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      markUpdateReady(() => void updateServiceWorker(true));
    },
  });
}
