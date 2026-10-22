import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveStageLeader, LiveStageState } from '../../../../shared/types';
import { advanceLiveStage, endLiveStage, handoverLiveStage, startLiveStage } from './liveStageApi';
import { connectLiveStage, type LiveConnectionStatus } from './liveStageConnection';

type Options = {
  setlistId: string;
  currentUserId?: string;
  /** El item que se ve en esta pantalla y como moverse (los da useStageNavigation). */
  currentItemId: string | null;
  goToItem: (itemId: string) => void;
  /** Si esta persona puede dirigir (OWNER/ADMIN/LEADER; la API lo vuelve a comprobar). */
  canLead: boolean;
  /** Para pruebas: como conectarse al stream. */
  connect?: typeof connectLiveStage;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la accion';
}

/**
 * Modo escenario en vivo desde una pantalla: escucha el stream, sigue al lider (si "Seguir al lider" esta activo)
 * y, si esta persona dirige, manda cada cambio de item. Si alguien que sigue navega a mano, deja de seguir solo;
 * "Volver con el lider" lo reactiva. Sin conexion, el modo escenario sigue funcionando local, sin sincronia.
 */
export function useLiveStage({ setlistId, currentUserId, currentItemId, goToItem, canLead, connect = connectLiveStage }: Options) {
  const [live, setLive] = useState<LiveStageState>({ live: false, setlistId });
  const [status, setStatus] = useState<LiveConnectionStatus>('connecting');
  const [following, setFollowing] = useState(true);
  const [conflict, setConflict] = useState<LiveStageLeader | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Solo se acepta un estado mas nuevo que el ultimo visto (las acciones y el stream pueden llegar en otro orden).
  const accept = useCallback((next: LiveStageState) => {
    setLive((current) => {
      if (next.live && current.live && next.version < current.version && next.startedAt === current.startedAt) return current;
      return next;
    });
  }, []);

  useEffect(() => connect(setlistId, { onState: accept, onStatus: setStatus }), [setlistId, accept, connect]);

  const isLeader = live.live && Boolean(currentUserId) && live.leader.userId === currentUserId;
  const leaderItemId = live.live ? live.currentItemId : null;

  // Seguir: ir al item del lider cuando cambia (o al activar "Seguir al lider").
  useEffect(() => {
    if (!live.live || isLeader || !following || !leaderItemId) return;
    if (leaderItemId !== currentItemId) goToItem(leaderItemId);
    // Solo cuando cambia lo que muestra el lider o se vuelve a seguir; no cuando esta pantalla se mueve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.live, isLeader, following, leaderItemId]);

  // Esta pantalla cambio de item. Si dirige: se avisa a todos. Si seguia y no es el item del lider: navego a mano.
  const previousItemId = useRef(currentItemId);
  useEffect(() => {
    if (previousItemId.current === currentItemId) return;
    previousItemId.current = currentItemId;
    if (!live.live || !currentItemId) return;
    if (isLeader) {
      if (currentItemId !== leaderItemId) {
        advanceLiveStage(setlistId, { currentItemId })
          .then(accept)
          .catch((err) => setError(errorMessage(err)));
      }
    } else if (following && currentItemId !== leaderItemId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reaccion a una navegacion hecha fuera de este hook (teclado, botones, salto)
      setFollowing(false);
    }
    // Reacciona solo al cambio de item de esta pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItemId]);

  const run = useCallback(
    async (action: () => Promise<LiveStageState>) => {
      setBusy(true);
      setError('');
      try {
        accept(await action());
        setConflict(null);
      } catch (err) {
        const body = (err as { status?: number; body?: { leader?: LiveStageLeader } }) ?? {};
        if (body.status === 409 && body.body?.leader) setConflict(body.body.leader);
        else setError(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [accept],
  );

  return {
    live,
    status,
    isLeader,
    following,
    conflict,
    error,
    busy,
    canLead,
    /** Empezar a dirigir desde el item que se ve ahora. Si otra persona dirige, queda `conflict` con quien. */
    start: () => run(() => startLiveStage(setlistId, { currentItemId })),
    /** Tomar el liderazgo de una sesion que dirige otra persona (pedido explicito). */
    takeOver: () => run(() => startLiveStage(setlistId, { takeOver: true, currentItemId: leaderItemId ?? currentItemId })),
    handover: (membershipId: string) => run(() => handoverLiveStage(setlistId, { membershipId })),
    end: () => run(() => endLiveStage(setlistId)),
    setFollowing,
    backToLeader: () => setFollowing(true),
    dismissConflict: () => setConflict(null),
  };
}
