import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeSetlistItem } from '../../editor/test-utils/makeSetlistItem';
import { makeSetlistCue } from '../test-utils/makeSetlistCue';
import { ItemCuesSection } from './ItemCuesSection';

vi.mock('../api/setlist-cues.client', () => ({
  getSetlistItemCues: vi.fn(),
  updateSetlistCueStatus: vi.fn(),
}));

vi.mock('../../assignments/api/setlist-assignments.client', () => ({
  getSetlistParticipants: vi.fn(),
}));

vi.mock('../../api/setlists.client', () => ({
  getSetlistItems: vi.fn(),
}));

import { getSetlistItemCues, updateSetlistCueStatus } from '../api/setlist-cues.client';
import { getSetlistParticipants } from '../../assignments/api/setlist-assignments.client';
import { getSetlistItems } from '../../api/setlists.client';

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

const item = makeSetlistItem({ id: 'item1', type: 'SONG' });

describe('ItemCuesSection: limite de permisos MUSICIAN', () => {
  it('un MUSICIAN no ve controles de gestion (agregar, mover, duplicar, eliminar, copiar)', async () => {
    vi.mocked(getSetlistItemCues).mockResolvedValue([makeSetlistCue({ id: 'c1', setlistItemId: 'item1', phase: 'BEFORE', title: 'Iniciar pad' })]);
    vi.mocked(getSetlistParticipants).mockResolvedValue([]);
    vi.mocked(getSetlistItems).mockResolvedValue([item]);

    renderWithClient(<ItemCuesSection organizationId="org1" setlistId="setlist1" item={item} canManage={false} currentUserId="other-user" />);

    await screen.findByText('Iniciar pad');

    expect(screen.queryByText('Agregar cue')).not.toBeInTheDocument();
    expect(screen.queryByText('Copiar cues de otra cancion')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Mover arriba')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Duplicar cue')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Eliminar cue')).not.toBeInTheDocument();
  });

  it('un MUSICIAN responsable puede cambiar su propio estado, pero no el de un cue ajeno', async () => {
    const ownCue = makeSetlistCue({
      id: 'own',
      setlistItemId: 'item1',
      phase: 'BEFORE',
      title: 'Mi cue',
      status: 'PENDING',
      responsibleParticipant: {
        id: 'p-own',
        status: 'CONFIRMED',
        membership: { id: 'm-own', user: { id: 'current-user', name: 'Yo Mismo', avatarUrl: null, instruments: [] } },
      },
    });
    const otherCue = makeSetlistCue({
      id: 'other',
      setlistItemId: 'item1',
      phase: 'BEFORE',
      title: 'Cue ajeno',
      status: 'PENDING',
      responsibleParticipant: {
        id: 'p-other',
        status: 'CONFIRMED',
        membership: { id: 'm-other', user: { id: 'other-user', name: 'Otro Musico', avatarUrl: null, instruments: [] } },
      },
    });

    vi.mocked(getSetlistItemCues).mockResolvedValue([ownCue, otherCue]);
    vi.mocked(getSetlistParticipants).mockResolvedValue([]);
    vi.mocked(getSetlistItems).mockResolvedValue([item]);
    vi.mocked(updateSetlistCueStatus).mockResolvedValue({ ...ownCue, status: 'READY' });

    renderWithClient(<ItemCuesSection organizationId="org1" setlistId="setlist1" item={item} canManage={false} currentUserId="current-user" />);

    await screen.findByText('Mi cue');
    await screen.findByText('Cue ajeno');

    const ownCard = screen.getByText('Mi cue').closest('.rounded-lg')!;
    const otherCard = screen.getByText('Cue ajeno').closest('.rounded-lg')!;
    const ownSelect = ownCard.querySelector('select') as HTMLSelectElement;
    const otherSelect = otherCard.querySelector('select') as HTMLSelectElement;

    expect(ownSelect.disabled).toBe(false);
    expect(otherSelect.disabled).toBe(true);

    fireEvent.change(ownSelect, { target: { value: 'READY' } });

    await waitFor(() => {
      expect(updateSetlistCueStatus).toHaveBeenCalledWith('setlist1', 'own', { status: 'READY' });
    });
  });
});
