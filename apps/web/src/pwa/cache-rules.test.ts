import { describe, expect, it } from 'vitest';
import { cacheKeyFor, classifyRequest, FILES_CACHE_MAX_BYTES, isCacheableResponse } from './cache-rules';

const ORIGIN = 'https://app.harmonyhub.test';
const rule = (path: string, method = 'GET', origin = ORIGIN) => classifyRequest(method, new URL(path, origin), ORIGIN);

describe('classifyRequest: que se guarda para usar sin conexion', () => {
  it('lecturas de canciones, setlists y eventos: red primero con respaldo', () => {
    for (const path of [
      '/api/songs',
      '/api/songs?search=gracia',
      '/api/songs/s1',
      '/api/songs/s1/versions',
      '/api/songs/s1/versions/v1',
      '/api/songs/s1/tracks?versionId=v1',
      '/api/songs/s1/files',
      '/api/songs/s1/links',
      '/api/setlists',
      '/api/setlists/l1',
      '/api/setlists/l1/items',
      '/api/setlists/l1/team',
      '/api/setlists/l1/cues/production',
      '/api/events',
      '/api/events/e1',
    ]) {
      expect(rule(path), path).toBe('api-read');
    }
  });

  it('archivos y pistas ya descargados: cache primero', () => {
    expect(rule('/api/songs/s1/tracks/t1/stream')).toBe('files');
    expect(rule('/api/songs/s1/tracks/t1/download')).toBe('files');
    expect(rule('/api/songs/s1/files/f1/stream')).toBe('files');
    expect(rule('/api/songs/s1/files/f1/download')).toBe('files');
  });

  it('nunca: sesion, escrituras, datos privados o de otros, ni nada fuera de la API', () => {
    for (const path of ['/api/auth/me', '/api/auth/refresh', '/api/login', '/api/me', '/api/me/unavailability']) expect(rule(path), path).toBeNull();
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) expect(rule('/api/songs/s1', method), method).toBeNull();
    // Notas, conversaciones e historial no entran (no son "letras/acordes"); la disponibilidad del equipo tampoco.
    for (const path of ['/api/songs/s1/notes', '/api/songs/s1/threads', '/api/songs/s1/activity', '/api/setlists/l1/availability', '/api/setlists/l1/live', '/api/setlists/l1/live/stream', '/api/events/e1/availability']) {
      expect(rule(path), path).toBeNull();
    }
    for (const path of ['/api/notifications', '/api/dashboard/summary', '/api/memberships', '/api/organizations', '/api/invitations']) expect(rule(path), path).toBeNull();
    expect(rule('/songs/s1')).toBeNull();
    expect(rule('/api/songs/s1', 'GET', 'https://otro-sitio.test')).toBeNull();
  });
});

describe('cacheKeyFor: cada organizacion guarda lo suyo', () => {
  it('la misma URL con distinta organizacion es otra entrada', () => {
    const a = cacheKeyFor(`${ORIGIN}/api/songs/s1`, 'org-a');
    const b = cacheKeyFor(`${ORIGIN}/api/songs/s1`, 'org-b');
    expect(a).not.toBe(b);
    expect(a).toBe(`${ORIGIN}/api/songs/s1?__hh_org=org-a`);
    expect(cacheKeyFor(`${ORIGIN}/api/songs?search=x`, null)).toBe(`${ORIGIN}/api/songs?search=x&__hh_org=none`);
  });
});

describe('isCacheableResponse: solo respuestas buenas y archivos de tamano razonable', () => {
  const response = (status: number, headers: Record<string, string> = {}, type: ResponseType = 'basic') => ({ status, headers: new Headers(headers), type });

  it('nunca guarda errores ni redirecciones', () => {
    for (const status of [204, 301, 304, 400, 401, 403, 404, 500]) expect(isCacheableResponse('api-read', response(status)), String(status)).toBe(false);
    expect(isCacheableResponse('api-read', response(200, {}, 'opaqueredirect'))).toBe(false);
    expect(isCacheableResponse('api-read', response(200))).toBe(true);
  });

  it('archivos: con tamano conocido y hasta el limite', () => {
    expect(isCacheableResponse('files', response(200, { 'content-length': '1048576' }))).toBe(true);
    expect(isCacheableResponse('files', response(200, { 'content-length': String(FILES_CACHE_MAX_BYTES + 1) }))).toBe(false);
    expect(isCacheableResponse('files', response(200))).toBe(false);
  });
});
