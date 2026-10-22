/**
 * Reglas de la cache sin conexion (las usa el service worker y se prueban aparte, sin navegador).
 *
 * - Solo lectura: se guardan respuestas GET exitosas (200) de canciones, setlists y eventos que la persona ya abrio,
 *   y los archivos/pistas que ya descargo. Nunca sesion (/api/auth, /api/login, /api/me), nunca escrituras, nunca errores.
 * - Cada entrada se guarda con la organizacion activa en la clave: dos organizaciones nunca comparten datos.
 * - Al cerrar sesion o cambiar de persona, la app borra estas caches (ver offline-data.ts).
 */

/** Respuestas de la API (letras, acordes, setlists, eventos): red primero, cache si no hay conexion. */
export const API_CACHE = 'hh-api-v1';
/** Archivos y pistas ya descargados: cache primero (no cambian; si cambian, tienen otro id). */
export const FILES_CACHE = 'hh-files-v1';
/** Las caches con datos de la persona: se borran al cerrar sesion o al cambiar de usuario. */
export const PERSONAL_DATA_CACHES = [API_CACHE, FILES_CACHE] as const;

export const API_CACHE_MAX_ENTRIES = 300;
export const FILES_CACHE_MAX_ENTRIES = 40;
/** Un archivo mas grande que esto no se guarda para usar sin conexion (pistas largas, videos). */
export const FILES_CACHE_MAX_BYTES = 25 * 1024 * 1024;
export const CACHE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type CacheRule = 'api-read' | 'files';

const ID = '[^/]+';
const NEVER = [/^\/api\/auth(\/|$)/, /^\/api\/login$/, /^\/api\/me(\/|$)/];
const FILES = [new RegExp(`^/api/songs/${ID}/(tracks|files)/${ID}/(stream|download)$`)];
const API_READS = [
  // Canciones: lista, detalle (letra y acordes), versiones, y las listas de pistas, archivos y enlaces.
  /^\/api\/songs$/,
  new RegExp(`^/api/songs/${ID}$`),
  new RegExp(`^/api/songs/${ID}/versions(/${ID})?$`),
  new RegExp(`^/api/songs/${ID}/(tracks|files|links)$`),
  // Setlists: lista, detalle y lo que usa el modo escenario (items, equipo, cues), sin la disponibilidad del equipo.
  /^\/api\/setlists$/,
  new RegExp(`^/api/setlists/${ID}(/(?!availability$)[^?]*)?$`),
  // Eventos: lista y detalle.
  /^\/api\/events$/,
  new RegExp(`^/api/events/${ID}$`),
];

/** Que hacer con una peticion: guardarla como lectura de la API, como archivo, o no tocarla (null). */
export function classifyRequest(method: string, url: URL, appOrigin: string): CacheRule | null {
  if (method !== 'GET' || url.origin !== appOrigin) return null;
  const path = url.pathname;
  if (!path.startsWith('/api/') || NEVER.some((rule) => rule.test(path))) return null;
  if (FILES.some((rule) => rule.test(path))) return 'files';
  if (API_READS.some((rule) => rule.test(path))) return 'api-read';
  return null;
}

/** Clave de la cache: la URL mas la organizacion activa (el header x-organization-id que manda la app). */
export function cacheKeyFor(url: string, organizationId: string | null | undefined) {
  const key = new URL(url);
  key.searchParams.set('__hh_org', organizationId || 'none');
  return key.toString();
}

/** Solo respuestas 200 completas; los archivos, ademas, con tamano conocido y no mayor al limite. */
export function isCacheableResponse(rule: CacheRule, response: Pick<Response, 'status' | 'headers' | 'type'>) {
  if (response.status !== 200 || response.type === 'opaqueredirect') return false;
  if (rule === 'files') {
    const size = Number(response.headers.get('content-length'));
    return Number.isFinite(size) && size > 0 && size <= FILES_CACHE_MAX_BYTES;
  }
  return true;
}
