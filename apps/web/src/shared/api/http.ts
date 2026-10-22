const AUTH_TOKEN_KEY = 'hh_access_token';
const USER_KEY = 'hh_user';
const CURRENT_ORG_KEY = 'hh_current_organization_id';

function applyAuthHeaders(headers?: HeadersInit) {
  const token = getAuthToken();
  const organizationId = getCurrentOrganizationId();
  const nextHeaders = new Headers(headers);

  if (token && !nextHeaders.has('Authorization')) nextHeaders.set('Authorization', `Bearer ${token}`);
  if (organizationId && !nextHeaders.has('x-organization-id')) nextHeaders.set('x-organization-id', organizationId);

  return nextHeaders;
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || undefined;
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function setCurrentOrganizationId(organizationId: string) {
  localStorage.setItem(CURRENT_ORG_KEY, organizationId);
}

export function clearCurrentOrganizationId() {
  localStorage.removeItem(CURRENT_ORG_KEY);
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearCurrentOrganizationId();
}

/** Evento global que App escucha para volver al login cuando el token vencio o fue rechazado. */
export const SESSION_EXPIRED_EVENT = 'hh:session-expired';

/** La API dice que ya no eres miembro activo de la organizacion activa: App vuelve a sincronizar la sesion. */
export const ORGANIZATION_ACCESS_LOST_EVENT = 'hh:organization-access-lost';
const ACCESS_LOST_MESSAGE = 'No tienes acceso a esta organizacion';

function notifyIfAccessLost(status: number, message?: string) {
  if (status === 403 && message === ACCESS_LOST_MESSAGE && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ORGANIZATION_ACCESS_LOST_EVENT));
  }
}

function expireAuthSession() {
  clearAuthSession();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function getCurrentOrganizationId() {
  const storedOrganizationId = localStorage.getItem(CURRENT_ORG_KEY);
  if (storedOrganizationId) return storedOrganizationId;

  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) return undefined;

  try {
    const user = JSON.parse(rawUser) as { currentOrganizationId?: string };
    return user.currentOrganizationId || undefined;
  } catch {
    return undefined;
  }
}

/** Sin conexion la app es de solo lectura: nada se encola para enviar despues. */
export const OFFLINE_WRITE_MESSAGE = 'Sin conexión: este cambio no se guardó. Inténtalo cuando vuelvas a estar en línea.';
export const OFFLINE_READ_MESSAGE = 'Sin conexión: esto todavía no está guardado en este dispositivo.';

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function offlineError(message: string) {
  return Object.assign(new Error(message), { status: 0, offline: true });
}

/** Lanza el error de "sin conexion" si no hay red (lo usan las subidas, que no pasan por http()). */
export function assertOnlineForChanges() {
  if (isOffline()) throw offlineError(OFFLINE_WRITE_MESSAGE);
}

/** Rutas de sesion: un 401 aqui es la respuesta en si (clave incorrecta, refresh vencido), no se intenta renovar. */
const SESSION_ROUTES = ['/api/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'];

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Pide un access token nuevo con la cookie httpOnly del refresh token. Si varias peticiones reciben 401 a la vez,
 * todas esperan la misma renovacion (una sola llamada), porque el refresh token rota y solo sirve una vez.
 */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(async (response) => {
      if (!response.ok) return false;
      const data = (await response.json().catch(() => null)) as { accessToken?: string } | null;
      if (!data?.accessToken) return false;
      setAuthToken(data.accessToken);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function tokenExpiresWithin(seconds: number) {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return !payload.exp || payload.exp - Date.now() / 1000 < seconds;
  } catch {
    return true;
  }
}

/** Para subidas largas con XMLHttpRequest (no pasan por http()): renueva antes si el token esta por vencer. */
export async function ensureFreshAccessToken() {
  if (tokenExpiresWithin(60) && !(await refreshSession())) expireAuthSession();
}

/** fetch con los headers de sesion; ante un 401 renueva la sesion una vez y reintenta, o vuelve al login. */
async function authorizedFetch(url: string, init: RequestInit | undefined, buildHeaders: () => Headers) {
  const method = (init?.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') assertOnlineForChanges();
  const send = () =>
    fetch(url, { ...init, headers: buildHeaders(), credentials: 'include' }).catch((error: unknown) => {
      // Sin conexion y sin copia guardada: un mensaje claro en vez de "Failed to fetch".
      if (isOffline()) throw offlineError(OFFLINE_READ_MESSAGE);
      throw error;
    });
  let response = await send();
  if (response.status === 401 && !SESSION_ROUTES.includes(url)) {
    response = (await refreshSession()) ? await send() : response;
    if (response.status === 401) expireAuthSession();
  }
  return response;
}

export async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const buildHeaders = () => {
    const headers = applyAuthHeaders(init?.headers);
    if (!isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return headers;
  };

  const response = await authorizedFetch(url, init, buildHeaders);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    notifyIfAccessLost(response.status, data?.message);
    const error = new Error(data?.message || (response.status === 403 ? 'No tienes permisos para esta acción' : 'No se pudo completar la solicitud'));
    // `body`: la respuesta completa (ej. el 409 del modo en vivo trae quien dirige).
    Object.assign(error, { status: response.status, body: data });
    throw error;
  }

  return data;
}

export async function requestBlob(url: string, init?: RequestInit) {
  const response = await authorizedFetch(url, init, () => applyAuthHeaders(init?.headers));
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(data?.message || 'No se pudo completar la solicitud');
    Object.assign(error, { status: response.status });
    throw error;
  }
  return response.blob();
}

/**
 * Abre un stream (Server-Sent Events) con los headers de sesion: el token va en el header Authorization, nunca
 * en la URL (por eso no se usa EventSource). Renueva la sesion ante un 401 igual que http().
 */
export function openAuthorizedStream(url: string, signal: AbortSignal) {
  return authorizedFetch(url, { signal, cache: 'no-store' }, () => applyAuthHeaders({ Accept: 'text/event-stream' }));
}

export function buildAuthHeaders(headers?: HeadersInit) {
  return applyAuthHeaders(headers);
}
