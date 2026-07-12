const AUTH_TOKEN_KEY = 'hh_access_token';
const USER_KEY = 'hh_user';
const CURRENT_ORG_KEY = 'hh_current_organization_id';

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
  const token = getAuthToken();
  const organizationId = getCurrentOrganizationId();
  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  if (organizationId && !headers.has('x-organization-id')) headers.set('x-organization-id', organizationId);

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
