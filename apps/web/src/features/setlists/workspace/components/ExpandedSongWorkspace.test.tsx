import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeSetlistItem } from '../../editor/test-utils/makeSetlistItem';
import { AudioPlayerProvider } from '../../../songs/player/AudioPlayerProvider';
import { ExpandedSongWorkspace } from './ExpandedSongWorkspace';

vi.mock('../../../../shared/api/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../shared/api/http')>();
  return { ...actual, getCurrentOrganizationId: () => 'org1' };
});

vi.mock('../../../../shared/api/api-client', () => ({
  getSongVersion: vi.fn(),
  getSongTracks: vi.fn(),
  getSongFiles: vi.fn(),
  getSongLinks: vi.fn(),
  getSongNotes: vi.fn(),
  getSongActivity: vi.fn(),
  getSongThreads: vi.fn(),
}));

import { getSongTracks, getSongVersion } from '../../../../shared/api/api-client';

const liveVersion = {
  id: 'v1',
  songId: 's1',
  name: 'Original',
  key: 'D',
  bpm: 90,
  durationSec: 240,
  lyrics: 'la la la',
  chords: null,
  contentJson: null,
  structureJson: null,
  notes: null,
  isDefault: true,
} as any;

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AudioPlayerProvider>{children}</AudioPlayerProvider>
    </QueryClientProvider>,
  );
}

describe('ExpandedSongWorkspace', () => {
  it('solo monta el tab activo: no pide pistas mientras el tab activo es Letra', async () => {
    vi.mocked(getSongVersion).mockResolvedValue(liveVersion);
    vi.mocked(getSongTracks).mockResolvedValue([]);

    const item = makeSetlistItem({ songId: 's1', songVersionId: 'v1' });

    renderWithClient(<ExpandedSongWorkspace id="ws-1" item={item} activeTab="lyrics" onTabChange={() => {}} />);

    await screen.findByText('Item');
    expect(getSongTracks).not.toHaveBeenCalled();
  });

  it('monta el panel de Pistas (y pide sus datos) cuando esa es la tab activa', async () => {
    vi.mocked(getSongVersion).mockResolvedValue(liveVersion);
    vi.mocked(getSongTracks).mockResolvedValue([]);

    const item = makeSetlistItem({ songId: 's1', songVersionId: 'v1' });

    renderWithClient(<ExpandedSongWorkspace id="ws-1" item={item} activeTab="tracks" onTabChange={() => {}} />);

    await waitFor(() => expect(getSongTracks).toHaveBeenCalledTimes(1));
  });
});
