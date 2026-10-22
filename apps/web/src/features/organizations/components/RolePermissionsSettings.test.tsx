import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../shared/api/query-client';
import type { RolePermissionsMatrix } from '../../../shared/types';

vi.mock('../../../shared/api/api-client', () => ({ getRolePermissions: vi.fn(), updateRolePermissions: vi.fn(), resetRolePermissions: vi.fn() }));

import { getRolePermissions, resetRolePermissions, updateRolePermissions } from '../../../shared/api/api-client';
import { RolePermissionsSettings } from './RolePermissionsSettings';

const defaults = { ADMIN: ['songs.manage', 'events.manage'], LEADER: ['songs.manage', 'events.manage'], MUSICIAN: [], GUEST: [] };
const matrix: RolePermissionsMatrix = {
  configurable: ['songs.manage', 'events.manage'],
  ownerOnly: ['organization.transfer', 'organization.archive', 'roles.manage'],
  alwaysGranted: ['read', 'organization.leave'],
  roles: ['ADMIN', 'LEADER', 'MUSICIAN', 'GUEST'],
  defaults,
  effective: defaults,
  customized: false,
};

async function renderSettings() {
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RolePermissionsSettings organizationId="o1" />
      </QueryClientProvider>,
    );
  });
}

beforeEach(() => {
  queryClient.clear();
  vi.mocked(getRolePermissions).mockResolvedValue(matrix);
});
afterEach(() => vi.clearAllMocks());

describe('RolePermissionsSettings', () => {
  it('muestra la matriz con los permisos de cada rol y lo fijo explicado', async () => {
    await renderSettings();
    expect(await screen.findByRole('checkbox', { name: 'Líder: Crear y editar eventos y equipos' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Músico: Crear y editar canciones' })).not.toBeChecked();
    expect(screen.queryByRole('checkbox', { name: /Cambiar roles y permisos/ })).not.toBeInTheDocument();
    expect(screen.getByText(/solo el propietario puede transferir la propiedad/)).toBeInTheDocument();
  });

  it('guardar manda los permisos de cada rol', async () => {
    vi.mocked(updateRolePermissions).mockResolvedValue({ ...matrix, customized: true });
    await renderSettings();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Músico: Crear y editar canciones' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Líder: Crear y editar eventos y equipos' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Guardar permisos/ })));
    expect(updateRolePermissions).toHaveBeenCalledWith({ roles: { ...defaults, MUSICIAN: ['songs.manage'], LEADER: ['songs.manage'] } });
    expect(await screen.findByText('Permisos guardados.')).toBeInTheDocument();
  });

  it('restablecer pide confirmacion y vuelve a los valores por defecto', async () => {
    vi.mocked(resetRolePermissions).mockResolvedValue(matrix);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await renderSettings();
    const button = await screen.findByRole('button', { name: /Restablecer valores por defecto/ });
    await act(async () => fireEvent.click(button));
    expect(resetRolePermissions).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(button));
    expect(resetRolePermissions).toHaveBeenCalled();
    expect(await screen.findByText('Se restablecieron los valores por defecto.')).toBeInTheDocument();
  });
});
