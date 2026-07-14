import { useQuery } from '@tanstack/react-query';
import { getSongActivity } from '../api/songs.client';
import type { SongActivityType, SongEntityType } from '../../../shared/types';

export function useSongActivity(organizationId: string, songId: string, filters?: {
  action?: SongActivityType;
  entityType?: SongEntityType;
  versionId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ['songActivity', organizationId, songId, filters ?? {}],
    queryFn: () => getSongActivity(songId, filters),
    enabled: Boolean(organizationId && songId),
  });
}
