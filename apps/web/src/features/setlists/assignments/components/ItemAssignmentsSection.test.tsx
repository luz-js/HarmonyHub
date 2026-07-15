import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeSetlistItem } from '../../editor/test-utils/makeSetlistItem';
import { makeSetlistAssignment } from '../test-utils/makeSetlistAssignment';
import { ItemAssignmentsSection } from './ItemAssignmentsSection';

vi.mock('../api/setlist-assignments.client', () => ({
  getSetlistItemAssignments: vi.fn(),
  getSetlistRoleRequirements: vi.fn(),
  updateSetlistAssignment: vi.fn(),
  deleteSetlistAssignment: vi.fn(),
  updateSetlistAssignmentPreparation: vi.fn(),
}));

vi.mock('../../api/setlists.client', () => ({
  getSetlistItems: vi.fn(),
}));

import { getSetlistItemAssignments, getSetlistRoleRequirements, updateSetlistAssignmentPreparation } from '../api/setlist-assignments.client';
import { getSetlistItems } from '../../api/setlists.client';

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

const item = makeSetlistItem({ id: 'item1', type: 'SONG' });

describe('ItemAssignmentsSection: limite de permisos MUSICIAN', () => {
  it('un MUSICIAN no ve controles de gestion (rol, principal, eliminar, requisitos, asignar musico)', async () => {
    vi.mocked(getSetlistItemAssignments).mockResolvedValue([
      makeSetlistAssignment({ id: 'a1', setlistItemId: 'item1', role: 'LEAD_VOCAL' }),
    ]);
    vi.mocked(getSetlistRoleRequirements).mockResolvedValue([]);
    vi.mocked(getSetlistItems).mockResolvedValue([item]);

    renderWithClient(<ItemAssignmentsSection organizationId="org1" setlistId="setlist1" item={item} canManage={false} currentUserId="other-user" />);

    await screen.findByText('Voz principal');

    expect(screen.queryByText('Asignar musico')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Marcar como principal')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Quitar asignacion')).not.toBeInTheDocument();
    expect(screen.queryByText('Requisitos de roles')).not.toBeInTheDocument();
  });

  it('un MUSICIAN puede cambiar su propio estado de preparacion pero no el de otro musico', async () => {
    const ownAssignment = makeSetlistAssignment({
      id: 'own',
      setlistItemId: 'item1',
      preparationStatus: 'PENDING',
      participant: {
        id: 'p-own',
        status: 'CONFIRMED',
        membership: { id: 'm-own', instrument: null, user: { id: 'current-user', name: 'Yo Mismo', avatarUrl: null } },
      },
    });
    const otherAssignment = makeSetlistAssignment({
      id: 'other',
      setlistItemId: 'item1',
      preparationStatus: 'PENDING',
      participant: {
        id: 'p-other',
        status: 'CONFIRMED',
        membership: { id: 'm-other', instrument: null, user: { id: 'other-user', name: 'Otro Musico', avatarUrl: null } },
      },
    });

    vi.mocked(getSetlistItemAssignments).mockResolvedValue([ownAssignment, otherAssignment]);
    vi.mocked(getSetlistRoleRequirements).mockResolvedValue([]);
    vi.mocked(getSetlistItems).mockResolvedValue([item]);
    vi.mocked(updateSetlistAssignmentPreparation).mockResolvedValue({ ...ownAssignment, preparationStatus: 'READY' });

    renderWithClient(<ItemAssignmentsSection organizationId="org1" setlistId="setlist1" item={item} canManage={false} currentUserId="current-user" />);

    await screen.findByText('Yo Mismo');

    const ownRow = screen.getByText('Yo Mismo').closest('.rounded-lg');
    const otherRow = screen.getByText('Otro Musico').closest('.rounded-lg');
    const ownSelect = ownRow?.querySelector('select') as HTMLSelectElement;
    const otherSelect = otherRow?.querySelector('select') as HTMLSelectElement;

    expect(ownSelect.disabled).toBe(false);
    expect(otherSelect.disabled).toBe(true);

    fireEvent.change(ownSelect, { target: { value: 'READY' } });

    await waitFor(() => {
      expect(updateSetlistAssignmentPreparation).toHaveBeenCalledWith('setlist1', 'item1', 'own', { preparationStatus: 'READY' });
    });
  });
});
