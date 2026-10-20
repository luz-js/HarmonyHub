import { formatRole } from '../shared/utils/format';
import type { AppOrganization, AppUser } from './types';

const USER_KEY = 'hh_user';

export function readStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function storeUser(user: AppUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Deja a la organizacion como activa del usuario: el rol guardado pasa a ser el de esa membresia. */
export function withOrganization(user: AppUser, organization: AppOrganization): AppUser {
  const organizations = user.organizations || [];
  const known = organizations.some((item) => item.id === organization.id);
  return {
    ...user,
    role: organization.role,
    currentOrganizationId: organization.id,
    currentOrganizationSlug: organization.slug,
    organizations: known ? organizations.map((item) => (item.id === organization.id ? { ...item, ...organization } : item)) : [...organizations, organization],
  };
}

export function getRoleLabel(role?: string) {
  return formatRole(role);
}
