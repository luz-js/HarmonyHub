import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeSetlistItem } from '../test-utils/makeSetlistItem';
import { SetlistEditor } from './SetlistEditor';

vi.mock('../../../../shared/api/api-client', () => ({
  getSetlistItems: vi.fn(),
  getSetlist: vi.fn(),
  getSetlists: vi.fn(),
  createSetlist: vi.fn(),
  createSetlistItem: vi.fn(),
  updateSetlist: vi.fn(),
  updateSetlistItem: vi.fn(),
  deleteSetlist: vi.fn(),
  deleteSetlistItem: vi.fn(),
  duplicateSetlistItem: vi.fn(),
  reorderSetlistItems: vi.fn(),
  archiveSetlist: vi.fn(),
  publishSetlist: vi.fn(),
  getSongVersions: vi.fn(),
  getSongs: vi.fn(),
}));

import { getSetlistItems } from '../../../../shared/api/api-client';

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('SetlistEditor', () => {
  it('muestra el empty state cuando no hay items', async () => {
    vi.mocked(getSetlistItems).mockResolvedValue([]);

    renderWithClient(
      <SetlistEditor
        organizationId="org1"
        setlistId="setlist1"
        name="Domingo"
        status="DRAFT"
        canManage
        canPublish
        publishing={false}
        onPublish={() => {}}
      />,
    );

    expect(await screen.findByText('Este setlist esta vacio')).toBeInTheDocument();
  });

  it('renderiza las cards y el DndContext sin errores cuando hay items', async () => {
    vi.mocked(getSetlistItems).mockResolvedValue([
      makeSetlistItem({ id: 'a', type: 'SONG', title: 'Grande eres Dios', effective: { key: 'C', bpm: 72, durationSec: 260, capo: null } }),
      makeSetlistItem({ id: 'b', type: 'PRAYER', title: 'Oracion', effective: { key: null, bpm: null, durationSec: 120, capo: null } }),
    ]);

    renderWithClient(
      <SetlistEditor
        organizationId="org1"
        setlistId="setlist1"
        name="Domingo"
        status="DRAFT"
        canManage
        canPublish
        publishing={false}
        onPublish={() => {}}
      />,
    );

    expect(await screen.findByText('Grande eres Dios')).toBeInTheDocument();
    expect(screen.getByText('Oracion')).toBeInTheDocument();
  });
});
