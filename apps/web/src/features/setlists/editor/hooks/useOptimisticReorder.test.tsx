import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../../shared/api/query-client';
import { makeSetlistItem } from '../test-utils/makeSetlistItem';
import { useOptimisticReorder } from './useOptimisticReorder';

vi.mock('../../api/setlists.client', () => ({
  reorderSetlistItems: vi.fn(),
}));

import { reorderSetlistItems } from '../../api/setlists.client';

const organizationId = 'org1';
const setlistId = 'setlist1';
const itemsKey = ['setlistItems', organizationId, setlistId];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useOptimisticReorder', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
  });

  it('reordena optimisticamente antes de que el servidor responda, y confirma con la respuesta del servidor', async () => {
    const items = [makeSetlistItem({ id: 'a' }), makeSetlistItem({ id: 'b' })];
    queryClient.setQueryData(itemsKey, items);

    let resolvePromise: (value: Awaited<ReturnType<typeof reorderSetlistItems>>) => void = () => {};
    vi.mocked(reorderSetlistItems).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const { result } = renderHook(() => useOptimisticReorder(organizationId, setlistId), { wrapper });

    act(() => {
      result.current.mutate(['b', 'a']);
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<Array<{ id: string }>>(itemsKey);
      expect(cached?.map((item) => item.id)).toEqual(['b', 'a']);
    });

    const serverItems = [makeSetlistItem({ id: 'b', order: 0 }), makeSetlistItem({ id: 'a', order: 1 })];
    act(() => {
      resolvePromise(serverItems);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(itemsKey)).toEqual(serverItems);
  });

  it('hace rollback automatico si el servidor rechaza', async () => {
    const items = [makeSetlistItem({ id: 'a' }), makeSetlistItem({ id: 'b' })];
    queryClient.setQueryData(itemsKey, items);

    vi.mocked(reorderSetlistItems).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useOptimisticReorder(organizationId, setlistId), { wrapper });

    act(() => {
      result.current.mutate(['b', 'a']);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<Array<{ id: string }>>(itemsKey);
    expect(cached?.map((item) => item.id)).toEqual(['a', 'b']);
  });
});
