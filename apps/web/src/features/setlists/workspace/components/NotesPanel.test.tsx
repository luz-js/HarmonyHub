import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotesPanel } from './NotesPanel';

vi.mock('../../../../shared/api/api-client', () => ({
  getSongNotes: vi.fn(),
}));

import { getSongNotes } from '../../../../shared/api/api-client';

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('NotesPanel', () => {
  it('solo muestra notas de la version pedida + generales, no de otras versiones', async () => {
    vi.mocked(getSongNotes).mockResolvedValue([
      { id: 'n1', songId: 's1', versionId: 'v1', title: null, content: 'Nota de v1', visibility: 'ORGANIZATION', isPinned: false, isArchived: false, createdAt: '', updatedAt: '' },
      { id: 'n2', songId: 's1', versionId: null, title: null, content: 'Nota general', visibility: 'ORGANIZATION', isPinned: false, isArchived: false, createdAt: '', updatedAt: '' },
      { id: 'n3', songId: 's1', versionId: 'v2', title: null, content: 'Nota de v2 (no deberia verse)', visibility: 'ORGANIZATION', isPinned: false, isArchived: false, createdAt: '', updatedAt: '' },
    ] as any);

    renderWithClient(<NotesPanel organizationId="org1" songId="s1" versionId="v1" />);

    expect(await screen.findByText('Nota de v1')).toBeInTheDocument();
    expect(screen.getByText('Nota general')).toBeInTheDocument();
    expect(screen.queryByText('Nota de v2 (no deberia verse)')).not.toBeInTheDocument();

    expect(getSongNotes).toHaveBeenCalledWith('s1', { versionId: 'v1' });
  });

  it('muestra un mensaje cuando no hay notas', async () => {
    vi.mocked(getSongNotes).mockResolvedValue([]);
    renderWithClient(<NotesPanel organizationId="org1" songId="s1" versionId="v1" />);
    expect(await screen.findByText('Esta canción no tiene notas todavía.')).toBeInTheDocument();
  });
});
