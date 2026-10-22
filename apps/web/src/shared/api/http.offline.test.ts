import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertOnlineForChanges, http, OFFLINE_READ_MESSAGE, OFFLINE_WRITE_MESSAGE } from './http';

let online = true;
Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => online });

describe('http sin conexion: solo lectura, nada se encola', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    online = true;
    vi.unstubAllGlobals();
  });

  it('un cambio (POST/PATCH/DELETE) sin conexion falla al momento con un mensaje claro y no se envia', async () => {
    online = false;
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      await expect(http('/api/songs/s1', { method, body: '{}' }), method).rejects.toThrow(OFFLINE_WRITE_MESSAGE);
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect(() => assertOnlineForChanges()).toThrow(OFFLINE_WRITE_MESSAGE);
  });

  it('una lectura sin conexion igual se intenta (el service worker puede tener copia); si no hay, mensaje claro', async () => {
    online = false;
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(http('/api/songs/s1')).rejects.toThrow(OFFLINE_READ_MESSAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 's1' }), { status: 200 }));
    await expect(http('/api/songs/s1')).resolves.toEqual({ id: 's1' });
  });

  it('con conexion todo sigue igual (un error de red se informa como antes)', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(http('/api/songs/s1', { method: 'PATCH', body: '{}' })).rejects.toThrow('Failed to fetch');
    expect(() => assertOnlineForChanges()).not.toThrow();
  });
});
