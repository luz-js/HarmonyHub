import { describe, expect, it } from 'vitest';
import { getRoleLabel, withOrganization } from './session';

describe('session helpers', () => {
  const user = {
    id: 'u1',
    name: 'Luz',
    email: 'luz@mail.com',
    role: 'MUSICIAN',
    currentOrganizationId: 'o1',
    currentOrganizationSlug: 'banda',
    organizations: [
      { id: 'o1', slug: 'banda', name: 'Banda', role: 'MUSICIAN' },
      { id: 'o2', slug: 'coro', name: 'Coro', role: 'LEADER' },
    ],
  };

  it('cambia la organizacion activa y adopta el rol de esa membresia', () => {
    const next = withOrganization(user, { id: 'o2', slug: 'coro', name: 'Coro', role: 'LEADER' });
    expect(next).toMatchObject({ currentOrganizationId: 'o2', currentOrganizationSlug: 'coro', role: 'LEADER' });
    expect(next.organizations).toHaveLength(2);
  });

  it('agrega una organizacion nueva creada en el onboarding', () => {
    const next = withOrganization({ id: 'u1', name: 'Luz', email: 'luz@mail.com' }, { id: 'o3', slug: 'nueva', name: 'Nueva', role: 'OWNER' });
    expect(next.role).toBe('OWNER');
    expect(next.organizations).toEqual([{ id: 'o3', slug: 'nueva', name: 'Nueva', role: 'OWNER' }]);
  });

  it('traduce los roles', () => {
    expect(getRoleLabel('LEADER')).toBe('Líder');
    expect(getRoleLabel(undefined)).toBe('');
  });
});
