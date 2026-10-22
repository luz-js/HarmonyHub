import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthToken, http, ORGANIZATION_ACCESS_LOST_EVENT, SESSION_EXPIRED_EVENT, setAuthToken } from './http';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** fetch falso: /api/auth/refresh responde segun `refreshResult`; el resto, 401 con el token viejo y 200 con el nuevo. */
function mockFetch(refreshResult: 'ok' | 'fail') {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/auth/refresh') {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return refreshResult === 'ok' ? json(200, { ok: true, accessToken: 'token-nuevo' }) : json(401, { message: 'Sesion expirada' });
    }
    if (url === '/api/login') return json(401, { message: 'Credenciales invalidas' });
    const auth = new Headers(init?.headers).get('Authorization');
    return auth === 'Bearer token-nuevo' ? json(200, { url }) : json(401, { message: 'Token expirado' });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const refreshCalls = (fetchMock: ReturnType<typeof mockFetch>) => fetchMock.mock.calls.filter(([url]) => String(url) === '/api/auth/refresh').length;

describe('http: renovacion de sesion ante un 401', () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthToken('token-viejo');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renueva una vez, guarda el token nuevo y reintenta la peticion', async () => {
    const fetchMock = mockFetch('ok');
    await expect(http('/api/events')).resolves.toEqual({ url: '/api/events' });
    expect(getAuthToken()).toBe('token-nuevo');
    expect(refreshCalls(fetchMock)).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.find(([url]) => url === '/api/auth/refresh')?.[1]).toMatchObject({ method: 'POST', credentials: 'include' });
  });

  it('si varias peticiones reciben 401 a la vez, hay una sola renovacion', async () => {
    const fetchMock = mockFetch('ok');
    const results = await Promise.all([http('/api/events'), http('/api/songs'), http('/api/setlists')]);
    expect(results).toHaveLength(3);
    expect(refreshCalls(fetchMock)).toBe(1);
  });

  it('si la renovacion falla, cierra la sesion local y avisa a la app (vuelve al login)', async () => {
    mockFetch('fail');
    const onExpired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    await expect(http('/api/events')).rejects.toMatchObject({ status: 401 });
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(getAuthToken()).toBeUndefined();
  });

  it('un 403 de "ya no eres miembro" avisa a la app para que vuelva a sincronizar la sesion', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(403, { message: 'No tienes acceso a esta organizacion' })));
    const onLost = vi.fn();
    window.addEventListener(ORGANIZATION_ACCESS_LOST_EVENT, onLost);
    await expect(http('/api/events')).rejects.toMatchObject({ status: 403 });
    vi.stubGlobal('fetch', vi.fn(async () => json(403, { message: 'No tienes permiso para hacer esto' })));
    await expect(http('/api/events')).rejects.toMatchObject({ status: 403 });
    window.removeEventListener(ORGANIZATION_ACCESS_LOST_EVENT, onLost);
    expect(onLost).toHaveBeenCalledTimes(1);
  });

  it('un 401 del login (clave incorrecta) no intenta renovar', async () => {
    const fetchMock = mockFetch('ok');
    await expect(http('/api/login', { method: 'POST', body: '{}' })).rejects.toThrow('Credenciales invalidas');
    expect(refreshCalls(fetchMock)).toBe(0);
  });
});
