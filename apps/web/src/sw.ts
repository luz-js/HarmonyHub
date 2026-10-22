/// <reference lib="webworker" />
/**
 * Service worker de HarmonyHub (solo en el build de produccion; en `npm run dev` no se registra).
 * Guarda la app para abrirla sin conexion y, en modo solo lectura, lo que la persona ya abrio. Las reglas de que
 * se guarda viven en pwa/cache-rules.ts (con pruebas).
 */
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import type { WorkboxPlugin } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import {
  API_CACHE,
  API_CACHE_MAX_ENTRIES,
  CACHE_MAX_AGE_SECONDS,
  cacheKeyFor,
  classifyRequest,
  FILES_CACHE,
  FILES_CACHE_MAX_ENTRIES,
  isCacheableResponse,
  type CacheRule,
} from './pwa/cache-rules';

declare const self: ServiceWorkerGlobalScope;

// La "cascara" de la app (HTML, JS, CSS, iconos): queda guardada en cada version.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
// Cualquier pantalla (/songs/123, /setlists/...) abre la misma app; las rutas /api nunca.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }));

/** La organizacion activa entra en la clave: dos organizaciones nunca comparten lo guardado. */
const keyByOrganization: WorkboxPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => cacheKeyFor(request.url, request.headers.get('x-organization-id')),
};
const onlyCacheable = (rule: CacheRule): WorkboxPlugin => ({
  cacheWillUpdate: async ({ response }) => (isCacheableResponse(rule, response) ? response : null),
});
const matches = (rule: CacheRule) => ({ request, url }: { request: Request; url: URL }) => classifyRequest(request.method, url, self.location.origin) === rule;

registerRoute(
  matches('api-read'),
  new NetworkFirst({
    cacheName: API_CACHE,
    plugins: [
      keyByOrganization,
      new CacheableResponsePlugin({ statuses: [200] }),
      onlyCacheable('api-read'),
      new ExpirationPlugin({ maxEntries: API_CACHE_MAX_ENTRIES, maxAgeSeconds: CACHE_MAX_AGE_SECONDS, purgeOnQuotaError: true }),
    ],
  }),
);

registerRoute(
  matches('files'),
  new CacheFirst({
    cacheName: FILES_CACHE,
    plugins: [
      keyByOrganization,
      new CacheableResponsePlugin({ statuses: [200] }),
      onlyCacheable('files'),
      new ExpirationPlugin({ maxEntries: FILES_CACHE_MAX_ENTRIES, maxAgeSeconds: CACHE_MAX_AGE_SECONDS, purgeOnQuotaError: true }),
    ],
  }),
);

// "Nueva version disponible": la app pide activarla solo cuando la persona toca "Recargar".
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});
