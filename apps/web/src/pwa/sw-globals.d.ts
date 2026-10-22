/** Lista de archivos de la app que vite-plugin-pwa inyecta en el service worker al compilar. */
interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: Array<import('workbox-precaching').PrecacheEntry | string>;
}
