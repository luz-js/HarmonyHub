import { useEffect } from 'react';
import { useSetlistTeam } from '../../assignments/hooks/useSetlistTeam';
import { getCurrentUser } from '../../utils';
import { useCurrentCue } from './useCurrentCue';
import { useStageNavigation } from './useStageNavigation';
import { useStagePersistence } from './useStagePersistence';
import { useStageTimers } from './useStageTimers';

/** Orquestador: combina datos (items/cues/equipo), navegacion, cursor de cue, timers y persistencia. */
export function useStageMode(organizationId: string, setlistId: string) {
  const currentUser = getCurrentUser();
  const { state, update } = useStagePersistence(setlistId);

  const navigation = useStageNavigation(organizationId, setlistId, state, update);
  const cue = useCurrentCue(organizationId, setlistId, navigation.currentItemId, state, update);
  const teamQuery = useSetlistTeam(organizationId, setlistId);

  // Al cambiar de item (por cualquier via: siguiente/anterior/salto), el cursor de cue se
  // resincroniza al primer cue del nuevo item actual.
  useEffect(() => {
    cue.syncToItem(navigation.currentItemId);
  }, [navigation.currentItemId]);

  const totalEffectiveSec = navigation.currentItem?.effective.durationSec ?? 0;
  const timers = useStageTimers(state, update, totalEffectiveSec);

  const currentItemAssignments = navigation.currentItemId
    ? (teamQuery.data?.items.find((entry) => entry.itemId === navigation.currentItemId)?.assignments ?? [])
    : [];
  const myAssignments = currentItemAssignments.filter((assignment) => assignment.participant.membership.user.id === currentUser.id);

  return {
    state,
    update,
    navigation,
    cue,
    timers,
    currentUser,
    currentItemAssignments,
    myAssignments,
    isLoading: navigation.isLoading || cue.isLoading || teamQuery.isLoading,
  };
}
