import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../../shared/api/query-client';
import type { ReplaceMyInstrumentsInput, UpdateMeInput } from '../../shared/types';
import { getCurrentUser, replaceMyInstruments, updateMe } from './api/auth.client';

export const CURRENT_USER_QUERY_KEY = ['current-user'] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => getCurrentUser().then((result) => result.user),
  });
}

/** Guarda datos e instrumentos juntos (el boton "Guardar cambios" es uno solo) y refresca auth/me. */
export function useSaveMyProfile() {
  return useMutation({
    mutationFn: async (input: { profile: UpdateMeInput; instruments: ReplaceMyInstrumentsInput }) => {
      const { user } = await updateMe(input.profile);
      const { instruments } = await replaceMyInstruments(input.instruments);
      return { user, instruments };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY }),
  });
}
