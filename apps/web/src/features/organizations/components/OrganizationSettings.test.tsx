import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppOrganization } from '../../../app/types';
import { queryClient } from '../../../shared/api/query-client';
import { ArchivedOrganizationBanner } from './ArchivedOrganizationBanner';
import { OrganizationSettings } from './OrganizationSettings';

vi.mock('../api/organizations.client', () => ({
  archiveOrganization: vi.fn(),
  createOrganization: vi.fn(),
  getOrganizations: vi.fn(),
  leaveOrganization: vi.fn(),
  restoreOrganization: vi.fn(),
  transferOrganization: vi.fn(),
}));
vi.mock('../../musicians/api/memberships.client', () => ({ getMemberships: vi.fn(), updateMembership: vi.fn() }));

import { getMemberships } from '../../musicians/api/memberships.client';
import { archiveOrganization, leaveOrganization, restoreOrganization, transferOrganization } from '../api/organizations.client';

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
const org = (overrides: Partial<AppOrganization> = {}): AppOrganization => ({ id: 'org1', slug: 'renacer', name: 'Renacer', role: 'OWNER', archivedAt: null, ...overrides });

function member(id: string, name: string, role = 'MUSICIAN', status = 'ACTIVE') {
  return {
    id,
    userId: `u-${id}`,
    organizationId: 'org1',
    role,
    status,
    joinedAt: '2026-01-01T00:00:00.000Z',
    user: { id: `u-${id}`, name, email: `${id}@x.com`, phone: null, avatarUrl: null, active: true, createdAt: '2026-01-01T00:00:00.000Z', instruments: [] },
  };
}

function renderSettings(organization: AppOrganization) {
  const onChanged = vi.fn();
  render(<OrganizationSettings organization={organization} currentUserId="u-luz" onChanged={onChanged} />, { wrapper });
  return { onChanged };
}

describe('OrganizationSettings', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(leaveOrganization).mockReset().mockResolvedValue({ ok: true });
    vi.mocked(transferOrganization).mockReset().mockResolvedValue({ ok: true });
    vi.mocked(archiveOrganization).mockReset().mockResolvedValue({ id: 'org1', slug: 'renacer', name: 'Renacer' });
    vi.mocked(restoreOrganization).mockReset().mockResolvedValue({ id: 'org1', slug: 'renacer', name: 'Renacer' });
    vi.mocked(getMemberships).mockReset().mockResolvedValue([
      member('luz', 'Luz Mariel', 'OWNER'),
      member('ana', 'Ana', 'ADMIN'),
      member('pedro', 'Pedro', 'MUSICIAN', 'INACTIVE'),
    ] as never);
  });

  it('un músico solo ve Salir; un propietario además Transferir y Archivar', () => {
    const { unmount } = render(<OrganizationSettings organization={org({ role: 'MUSICIAN' })} currentUserId="u-x" onChanged={vi.fn()} />, { wrapper });
    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transferir' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archivar' })).not.toBeInTheDocument();
    unmount();
    renderSettings(org());
    expect(screen.getByRole('button', { name: 'Transferir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archivar' })).toBeInTheDocument();
  });

  it('salir pide confirmación y luego sincroniza la sesión', async () => {
    const { onChanged } = renderSettings(org({ role: 'MUSICIAN' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(leaveOrganization).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, salir de Renacer' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(leaveOrganization).toHaveBeenCalledWith('org1');
  });

  it('si es la única propietaria, muestra el motivo y no sale', async () => {
    vi.mocked(leaveOrganization).mockRejectedValue(new Error('Eres la unica persona propietaria: transfiere la propiedad o nombra a otra persona propietaria antes de salir'));
    const { onChanged } = renderSettings(org());
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, salir de Renacer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('unica persona propietaria');
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('transferir: elige entre los miembros activos (sin ella misma) y por defecto deja de ser propietaria', async () => {
    const { onChanged } = renderSettings(org());
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
    const select = await screen.findByRole('combobox', { name: 'Nueva persona propietaria' });
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(2));
    expect(within(select).queryByRole('option', { name: /Luz Mariel/ })).not.toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: /Pedro/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();

    fireEvent.change(select, { target: { value: 'ana' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Transferir' }).at(-1)!);
    await waitFor(() => expect(transferOrganization).toHaveBeenCalledWith('org1', { id: 'org1', membershipId: 'ana', stepDown: true }));
    expect(onChanged).toHaveBeenCalled();
  });

  it('archivar exige escribir el nombre de la organización', async () => {
    const { onChanged } = renderSettings(org());
    fireEvent.click(screen.getByRole('button', { name: 'Archivar' }));
    const dialogButton = () => screen.getAllByRole('button', { name: 'Archivar' }).at(-1)!;
    expect(dialogButton()).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: /para confirmar/ }), { target: { value: 'renacer ' } });
    expect(dialogButton()).toBeEnabled();
    fireEvent.click(dialogButton());
    await waitFor(() => expect(archiveOrganization).toHaveBeenCalledWith('org1', 'renacer '));
    expect(onChanged).toHaveBeenCalled();
  });

  it('archivada: el propietario ve Restaurar en lugar de Transferir/Archivar', async () => {
    const { onChanged } = renderSettings(org({ archivedAt: '2026-10-22T00:00:00.000Z' }));
    expect(screen.queryByRole('button', { name: 'Transferir' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(restoreOrganization).toHaveBeenCalledWith('org1');
  });
});

describe('ArchivedOrganizationBanner', () => {
  it('avisa que es de solo lectura; solo el propietario puede restaurar', async () => {
    vi.mocked(restoreOrganization).mockReset().mockResolvedValue({ id: 'org1', slug: 'renacer', name: 'Renacer' });
    const onRestored = vi.fn();
    const { unmount } = render(<ArchivedOrganizationBanner organization={org({ role: 'MUSICIAN', archivedAt: 'x' })} onRestored={onRestored} />, { wrapper });
    expect(screen.getByRole('status')).toHaveTextContent('Renacer está archivada.');
    expect(screen.queryByRole('button', { name: 'Restaurar' })).not.toBeInTheDocument();
    unmount();
    render(<ArchivedOrganizationBanner organization={org({ archivedAt: 'x' })} onRestored={onRestored} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    await waitFor(() => expect(onRestored).toHaveBeenCalled());
  });
});
