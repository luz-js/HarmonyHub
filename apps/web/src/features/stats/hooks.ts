import { useQuery } from '@tanstack/react-query';
import { getMemberLoadStats, getRepertoireStats } from '../../shared/api/api-client';
import type { StatsPeriodMonths } from '../../shared/types';

export function useRepertoireStats(organizationId: string, months: StatsPeriodMonths) {
  return useQuery({
    queryKey: ['stats-repertoire', organizationId, months],
    queryFn: () => getRepertoireStats(months),
    enabled: Boolean(organizationId),
  });
}

/** Solo se pide si la persona arma equipos (la API responde 403 a los demas). */
export function useMemberLoadStats(organizationId: string, months: StatsPeriodMonths, enabled: boolean) {
  return useQuery({
    queryKey: ['stats-members', organizationId, months],
    queryFn: () => getMemberLoadStats(months),
    enabled: enabled && Boolean(organizationId),
  });
}
