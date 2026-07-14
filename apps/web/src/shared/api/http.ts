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

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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

export async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = applyAuthHeaders(init?.headers);
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(url, { ...init, headers });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) clearAuthSession();
    const error = new Error(data?.message || (response.status === 403 ? 'No tienes permisos para esta accion' : 'No se pudo completar la solicitud'));
    Object.assign(error, { status: response.status });
    throw error;
  }

  return data;
}

export async function requestBlob(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: applyAuthHeaders(init?.headers) });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    if (response.status === 401) clearAuthSession();
    const error = new Error(data?.message || 'No se pudo completar la solicitud');
    Object.assign(error, { status: response.status });
    throw error;
  }
  return response.blob();
}

export function buildAuthHeaders(headers?: HeadersInit) {
  return applyAuthHeaders(headers);
}
