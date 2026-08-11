import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../../shared/api/query-client';
import { makeSetlistCue } from '../test-utils/makeSetlistCue';
import { useUpdateSetlistCueStatus } from './useSetlistCueMutations';

vi.mock('../api/setlist-cues.client', () => ({
  updateSetlistCueStatus: vi.fn(),
}));

import { updateSetlistCueStatus } from '../api/setlist-cues.client';

const organizationId = 'org1';
const setlistId = 'setlist1';
const itemId = 'item1';
const key = ['setlistItemCues', organizationId, setlistId, itemId];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUpdateSetlistCueStatus', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
  });

  it('actualiza el status optimisticamente y lo confirma con la respuesta del servidor', async () => {
    const cue = makeSetlistCue({ id: 'c1', setlistItemId: itemId, status: 'PENDING' });
    queryClient.setQueryData(key, [cue]);

    let resolvePromise: (value: Awaited<ReturnType<typeof updateSetlistCueStatus>>) => void = () => {};
    vi.mocked(updateSetlistCueStatus).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const { result } = renderHook(() => useUpdateSetlistCueStatus(organizationId, setlistId), { wrapper });

    act(() => {
      result.current.mutate({ cueId: 'c1', itemId, input: { status: 'READY' } });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<Array<{ id: string; status: string }>>(key);
      expect(cached?.[0].status).toBe('READY');
    });

    const serverCue = { ...cue, status: 'READY' as const };
    act(() => resolvePromise(serverCue));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<Array<{ status: string }>>(key)?.[0].status).toBe('READY');
  });

  it('hace rollback si el servidor rechaza', async () => {
    const cue = makeSetlistCue({ id: 'c1', setlistItemId: itemId, status: 'PENDING' });
    queryClient.setQueryData(key, [cue]);

    vi.mocked(updateSetlistCueStatus).mockRejectedValue(new Error('forbidden'));

    const { result } = renderHook(() => useUpdateSetlistCueStatus(organizationId, setlistId), { wrapper });

    act(() => {
      result.current.mutate({ cueId: 'c1', itemId, input: { status: 'READY' } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<Array<{ status: string }>>(key)?.[0].status).toBe('PENDING');
  });
});
