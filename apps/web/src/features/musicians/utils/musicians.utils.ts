import type { MembershipRole, OrganizationMember } from '../../../shared/types';
import { getRoleLabel } from '../../setlists/assignments/utils/assignmentLabels';

export type StatusTab = 'active' | 'inactive';
export type RoleFilter = 'all' | 'leaders' | 'musicians' | 'guests';

export const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'leaders', label: 'Líderes' },
  { value: 'musicians', label: 'Músicos' },
  { value: 'guests', label: 'Invitados' },
];

const ROLE_GROUP: Record<MembershipRole, Exclude<RoleFilter, 'all'>> = {
  OWNER: 'leaders',
  ADMIN: 'leaders',
  LEADER: 'leaders',
  MUSICIAN: 'musicians',
  GUEST: 'guests',
};

export function isActiveMember(member: OrganizationMember) {
  return member.status === 'ACTIVE';
}

export function matchesStatusTab(member: OrganizationMember, tab: StatusTab) {
  return tab === 'active' ? isActiveMember(member) : !isActiveMember(member);
}

export function matchesRoleFilter(member: OrganizationMember, filter: RoleFilter) {
  return filter === 'all' || ROLE_GROUP[member.role] === filter;
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Busca por nombre o por cualquiera de los instrumentos de su perfil, sin importar acentos ni mayusculas. */
export function matchesSearch(member: OrganizationMember, search: string) {
  const term = normalize(search);
  if (!term) return true;
  const haystack = [member.user.name, ...member.user.instruments.map((item) => getRoleLabel(item.instrument))];
  return haystack.some((value) => normalize(value).includes(term));
}

export function countByStatus(members: OrganizationMember[]): Record<StatusTab, number> {
  const active = members.filter(isActiveMember).length;
  return { active, inactive: members.length - active };
}

/** Conteos de los filtros de rol dentro de la pestaña de estado elegida. */
export function countByRole(members: OrganizationMember[], tab: StatusTab): Record<RoleFilter, number> {
  const inTab = members.filter((member) => matchesStatusTab(member, tab));
  const counts: Record<RoleFilter, number> = { all: inTab.length, leaders: 0, musicians: 0, guests: 0 };
  for (const member of inTab) counts[ROLE_GROUP[member.role]] += 1;
  return counts;
}

export function filterMembers(members: OrganizationMember[], filters: { tab: StatusTab; role: RoleFilter; search: string }) {
  return members.filter(
    (member) => matchesStatusTab(member, filters.tab) && matchesRoleFilter(member, filters.role) && matchesSearch(member, filters.search),
  );
}

/** "Desde oct 2026". */
export function formatMemberSince(joinedAt: string) {
  const date = new Date(joinedAt);
  const month = date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  return `Desde ${month} ${date.getFullYear()}`;
}

/** Roles que puede asignar quien edita: solo un propietario puede nombrar propietarios. */
export function assignableRoles(actorRole: string | undefined): MembershipRole[] {
  const roles: MembershipRole[] = ['ADMIN', 'LEADER', 'MUSICIAN', 'GUEST'];
  return actorRole === 'OWNER' ? ['OWNER', ...roles] : roles;
}

export function canManageMembers(actorRole: string | undefined) {
  return actorRole === 'OWNER' || actorRole === 'ADMIN';
}

/** Un ADMIN no puede modificar a un propietario (lo mismo valida la API). */
export function canEditMember(actorRole: string | undefined, member: OrganizationMember) {
  if (!canManageMembers(actorRole)) return false;
  return !(actorRole === 'ADMIN' && member.role === 'OWNER');
}
