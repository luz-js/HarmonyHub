import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../shared/api/query-client';
import type { OrganizationMember } from '../../../shared/types';
import { MusiciansPage } from './MusiciansPage';

vi.mock('../api/memberships.client', () => ({
  getMemberships: vi.fn(),
  updateMembership: vi.fn(),
}));

vi.mock('../../invitations/api/invitations.client', () => ({
  acceptInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  createInvitation: vi.fn(),
  getInvitations: vi.fn(),
}));

import { getMemberships, updateMembership } from '../api/memberships.client';
import { getInvitations } from '../../invitations/api/invitations.client';

function member(id: string, name: string, overrides: Partial<OrganizationMember> = {}, instruments: OrganizationMember['user']['instruments'] = []): OrganizationMember {
  return {
    id,
    userId: `u-${id}`,
    organizationId: 'org1',
    role: 'MUSICIAN',
    status: 'ACTIVE',
    joinedAt: '2026-10-05T12:00:00.000Z',
    user: { id: `u-${id}`, name, email: `${id}@x.com`, phone: id === 'carlos' ? '555 1234' : null, avatarUrl: null, active: true, createdAt: '2026-01-01T00:00:00.000Z', instruments },
    ...overrides,
  };
}

const team = [
  member('luz', 'Luz Mariel', { role: 'OWNER' }, [{ instrument: 'LEAD_VOCAL', isPrimary: true }]),
  member('carlos', 'Carlos Rodríguez', {}, [
    { instrument: 'ELECTRIC_GUITAR', isPrimary: true },
    { instrument: 'BASS', isPrimary: false },
  ]),
  member('ana', 'Ana Martínez', { role: 'GUEST' }),
  member('pedro', 'Pedro Gómez', { status: 'INACTIVE' }, [{ instrument: 'DRUMS', isPrimary: true }]),
];

function renderPage(props: { currentRole?: string; currentUserId?: string } = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  render(<MusiciansPage organizationId="org1" currentUserId={props.currentUserId ?? 'u-luz'} currentRole={props.currentRole ?? 'OWNER'} />, { wrapper });
}

function rows() {
  return within(screen.getByRole('region', { name: 'Lista de músicos' })).getAllByRole('button');
}

describe('MusiciansPage', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(getMemberships).mockReset().mockResolvedValue(team);
    vi.mocked(updateMembership).mockReset().mockResolvedValue({ id: 'carlos', role: 'LEADER', status: 'ACTIVE' });
    vi.mocked(getInvitations).mockReset().mockResolvedValue([]);
  });

  it('lista los activos con su rol, "Tú" y lo que tocan según su perfil', async () => {
    renderPage();
    await screen.findByText('Carlos Rodríguez');
    expect(rows()).toHaveLength(3);
    expect(screen.getByRole('tab', { name: /Activos 3/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Inactivos 1/ })).toBeInTheDocument();

    const luzRow = screen.getByRole('button', { name: 'Ver ficha de Luz Mariel' });
    expect(within(luzRow).getByText('Tú')).toBeInTheDocument();
    expect(within(luzRow).getByText('Propietario')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: 'Ver ficha de Ana Martínez' })).getAllByText('Sin instrumentos').length).toBeGreaterThan(0);
    expect(screen.queryByText(/datos de ejemplo/)).not.toBeInTheDocument();
  });

  it('filtra por rol, por búsqueda de instrumento y muestra los inactivos', async () => {
    renderPage();
    await screen.findByText('Carlos Rodríguez');

    fireEvent.click(screen.getByRole('button', { name: /Invitados 1/ }));
    expect(rows().map((row) => row.getAttribute('aria-label'))).toEqual(['Ver ficha de Ana Martínez']);

    fireEvent.click(screen.getByRole('button', { name: /Todos/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar músico' }), { target: { value: 'bajo' } });
    expect(rows().map((row) => row.getAttribute('aria-label'))).toEqual(['Ver ficha de Carlos Rodríguez']);

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar músico' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('tab', { name: /Inactivos/ }));
    expect(rows().map((row) => row.getAttribute('aria-label'))).toEqual(['Ver ficha de Pedro Gómez']);
  });

  it('abre la ficha con contacto e instrumentos y un propietario cambia el rol', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Ver ficha de Carlos Rodríguez' }));

    const drawer = screen.getByRole('dialog', { name: 'Carlos Rodríguez' });
    expect(within(drawer).getByText('carlos@x.com')).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:5551234');
    expect(within(drawer).getByText('Los elige Carlos en su perfil.')).toBeInTheDocument();

    const roleSelect = within(drawer).getByRole('combobox', { name: 'Rol' });
    expect(within(roleSelect).getByRole('option', { name: 'Propietario' })).toBeInTheDocument();
    fireEvent.change(roleSelect, { target: { value: 'LEADER' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(updateMembership).toHaveBeenCalledWith('carlos', { role: 'LEADER' }));
  });

  it('un admin no puede nombrar propietarios ni editar al propietario', async () => {
    renderPage({ currentRole: 'ADMIN', currentUserId: 'u-ana' });
    fireEvent.click(await screen.findByRole('button', { name: 'Ver ficha de Carlos Rodríguez' }));
    let drawer = screen.getByRole('dialog', { name: 'Carlos Rodríguez' });
    expect(within(within(drawer).getByRole('combobox', { name: 'Rol' })).queryByRole('option', { name: 'Propietario' })).not.toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Cerrar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Ver ficha de Luz Mariel' }));
    drawer = screen.getByRole('dialog', { name: 'Luz Mariel' });
    expect(within(drawer).queryByRole('combobox', { name: 'Rol' })).not.toBeInTheDocument();
    expect(within(drawer).getByText('Solo un propietario puede editar a otro propietario.')).toBeInTheDocument();
  });

  it('un músico o invitado ve el contacto pero no la sección Editar', async () => {
    renderPage({ currentRole: 'GUEST', currentUserId: 'u-ana' });
    fireEvent.click(await screen.findByRole('button', { name: 'Ver ficha de Carlos Rodríguez' }));
    const drawer = screen.getByRole('dialog', { name: 'Carlos Rodríguez' });
    expect(within(drawer).getByText('carlos@x.com')).toBeInTheDocument();
    expect(within(drawer).getByText('555 1234')).toBeInTheDocument();
    expect(within(drawer).queryByText('Editar')).not.toBeInTheDocument();
  });

  it('muestra el error de la API al guardar', async () => {
    vi.mocked(updateMembership).mockRejectedValueOnce(new Error('No se puede quitar el ultimo OWNER'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Ver ficha de Luz Mariel' }));
    const drawer = screen.getByRole('dialog', { name: 'Luz Mariel' });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Inactivo' }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Guardar' }));
    expect(await within(drawer).findByRole('alert')).toHaveTextContent('No se puede quitar el ultimo OWNER');
  });

  it('cuando solo estás tú muestra el estado vacío; un propietario ve el botón para invitar', async () => {
    vi.mocked(getMemberships).mockResolvedValue([team[0]]);
    renderPage();
    expect(await screen.findByText('Por ahora solo estás tú')).toBeInTheDocument();
    expect(screen.getByText('Cuando invites a tu equipo, aparecerán aquí con lo que tocan.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Invitar a tu equipo/ })).toBeInTheDocument();
  });

  it('un músico o líder no ve los botones de invitar ni las invitaciones pendientes', async () => {
    renderPage({ currentRole: 'LEADER', currentUserId: 'u-carlos' });
    await screen.findByText('Carlos Rodríguez');
    expect(screen.queryByRole('button', { name: /Invitar/ })).not.toBeInTheDocument();
    expect(getInvitations).not.toHaveBeenCalled();
  });
});
