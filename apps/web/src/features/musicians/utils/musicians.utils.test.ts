import { describe, expect, it } from 'vitest';
import type { OrganizationMember } from '../../../shared/types';
import { assignableRoles, canEditMember, countByRole, countByStatus, filterMembers, formatMemberSince } from './musicians.utils';

function member(id: string, overrides: Partial<OrganizationMember> = {}, instruments: OrganizationMember['user']['instruments'] = []): OrganizationMember {
  return {
    id,
    userId: `u-${id}`,
    organizationId: 'org1',
    role: 'MUSICIAN',
    status: 'ACTIVE',
    joinedAt: '2026-10-05T12:00:00.000Z',
    user: { id: `u-${id}`, name: `Persona ${id}`, email: `${id}@x.com`, phone: null, avatarUrl: null, active: true, createdAt: '2026-01-01T00:00:00.000Z', instruments },
    ...overrides,
  };
}

const team = [
  member('a', { role: 'OWNER', user: { ...member('a').user, name: 'Ana Martínez' } }, [{ instrument: 'KEYS', isPrimary: true }]),
  member('b', { role: 'LEADER' }, [{ instrument: 'ELECTRIC_GUITAR', isPrimary: true }]),
  member('c', { role: 'MUSICIAN' }, [{ instrument: 'BASS', isPrimary: true }]),
  member('d', { role: 'GUEST' }),
  member('e', { role: 'MUSICIAN', status: 'INACTIVE' }, [{ instrument: 'DRUMS', isPrimary: true }]),
];

describe('musicians.utils', () => {
  it('cuenta activos/inactivos y los roles dentro de la pestaña elegida', () => {
    expect(countByStatus(team)).toEqual({ active: 4, inactive: 1 });
    expect(countByRole(team, 'active')).toEqual({ all: 4, leaders: 2, musicians: 1, guests: 1 });
    expect(countByRole(team, 'inactive')).toEqual({ all: 1, leaders: 0, musicians: 1, guests: 0 });
  });

  it('busca por nombre o instrumento sin importar acentos ni mayúsculas', () => {
    expect(filterMembers(team, { tab: 'active', role: 'all', search: 'martinez' }).map((m) => m.id)).toEqual(['a']);
    expect(filterMembers(team, { tab: 'active', role: 'all', search: 'ELECTRICA' }).map((m) => m.id)).toEqual(['b']);
    expect(filterMembers(team, { tab: 'inactive', role: 'all', search: 'batería' }).map((m) => m.id)).toEqual(['e']);
    expect(filterMembers(team, { tab: 'active', role: 'leaders', search: '' }).map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('formatea "Desde mes año"', () => {
    expect(formatMemberSince('2026-10-05T12:00:00.000Z')).toBe('Desde oct 2026');
  });

  it('solo un propietario puede asignar Propietario; un admin no edita a un propietario', () => {
    expect(assignableRoles('OWNER')).toContain('OWNER');
    expect(assignableRoles('ADMIN')).not.toContain('OWNER');
    expect(canEditMember('ADMIN', team[0])).toBe(false);
    expect(canEditMember('ADMIN', team[2])).toBe(true);
    expect(canEditMember('OWNER', team[0])).toBe(true);
    expect(canEditMember('LEADER', team[2])).toBe(false);
    expect(canEditMember('GUEST', team[2])).toBe(false);
  });
});
