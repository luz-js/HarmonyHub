import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../../shared/api/query-client';
import { makeSetlistAssignment } from '../test-utils/makeSetlistAssignment';
import { useUpdateSetlistAssignmentPreparation } from './useSetlistAssignmentMutations';

vi.mock('../api/setlist-assignments.client', () => ({
  updateSetlistAssignmentPreparation: vi.fn(),
}));

import { updateSetlistAssignmentPreparation } from '../api/setlist-assignments.client';

const organizationId = 'org1';
const setlistId = 'setlist1';
const itemId = 'item1';
const key = ['setlistItemAssignments', organizationId, setlistId, itemId];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUpdateSetlistAssignmentPreparation', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
  });

  it('actualiza el estado de preparacion optimisticamente y lo confirma con la respuesta del servidor', async () => {
    const assignment = makeSetlistAssignment({ id: 'a1', setlistItemId: itemId, preparationStatus: 'PENDING' });
    queryClient.setQueryData(key, [assignment]);

    let resolvePromise: (value: Awaited<ReturnType<typeof updateSetlistAssignmentPreparation>>) => void = () => {};
    vi.mocked(updateSetlistAssignmentPreparation).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const { result } = renderHook(() => useUpdateSetlistAssignmentPreparation(organizationId, setlistId, itemId), { wrapper });

    act(() => {
      result.current.mutate({ assignmentId: 'a1', input: { preparationStatus: 'READY' } });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<Array<{ id: string; preparationStatus: string }>>(key);
      expect(cached?.[0].preparationStatus).toBe('READY');
    });

    const serverAssignment = { ...assignment, preparationStatus: 'READY' as const };
    act(() => resolvePromise(serverAssignment));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<Array<{ preparationStatus: string }>>(key)?.[0].preparationStatus).toBe('READY');
  });

  it('hace rollback si el servidor rechaza (ej. otro musico intenta cambiar el estado de otro)', async () => {
    const assignment = makeSetlistAssignment({ id: 'a1', setlistItemId: itemId, preparationStatus: 'PENDING' });
    queryClient.setQueryData(key, [assignment]);

    vi.mocked(updateSetlistAssignmentPreparation).mockRejectedValue(new Error('forbidden'));

    const { result } = renderHook(() => useUpdateSetlistAssignmentPreparation(organizationId, setlistId, itemId), { wrapper });

    act(() => {
      result.current.mutate({ assignmentId: 'a1', input: { preparationStatus: 'READY' } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<Array<{ preparationStatus: string }>>(key)?.[0].preparationStatus).toBe('PENDING');
  });
});
