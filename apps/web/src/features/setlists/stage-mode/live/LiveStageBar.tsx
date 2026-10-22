import { Radio } from 'lucide-react';
import { useMemberships } from '../../../musicians/hooks';
import type { useLiveStage } from './useLiveStage';
import type { LiveConnectionStatus } from './liveStageConnection';

type Live = ReturnType<typeof useLiveStage>;

const STATUS_LABEL: Record<LiveConnectionStatus, string | null> = {
  connecting: 'Conectando…',
  live: 'Conectado',
  reconnecting: 'Reconectando…',
  offline: 'Sin conexión',
  unavailable: null,
};

const STATUS_DOT: Record<LiveConnectionStatus, string> = {
  connecting: 'bg-[#A6A39D]',
  live: 'bg-[#57C98F]',
  reconnecting: 'bg-[#F2C46E]',
  offline: 'bg-[#F27A6E]',
  unavailable: 'bg-[#A6A39D]',
};

/** Estado de la conexion con el modo en vivo. Sin conexion el modo escenario sigue funcionando en esta pantalla. */
export function LiveConnectionIndicator({ status }: { status: LiveConnectionStatus }) {
  const label = STATUS_LABEL[status];
  if (!label) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" role="status" aria-label={`Conexión en vivo: ${label}`}>
      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
      {label}
    </span>
  );
}

/**
 * Controles del modo en vivo en la barra superior del modo escenario: quien dirige, "Seguir al lider" (activado por
 * defecto; se apaga solo si navegas a mano) y, para quien puede dirigir, iniciar, pasar el liderazgo o terminar.
 */
export function LiveStageBar({ live, organizationId }: { live: Live; organizationId: string }) {
  const session = live.live.live ? live.live : null;
  const leaders = useMemberships(live.isLeader ? organizationId : undefined).data?.filter(
    (member) =>
      member.status === 'ACTIVE' &&
      member.user.active &&
      ['OWNER', 'ADMIN', 'LEADER'].includes(member.role) &&
      session &&
      member.id !== session.leader.membershipId,
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <LiveConnectionIndicator status={live.status} />

      {session ? (
        <>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#2A1817] px-2 py-0.5 font-bold uppercase tracking-wide text-[#F27A6E]">
            <Radio className="h-3 w-3" aria-hidden /> En vivo
          </span>
          <span className="text-[#D8D5CE]">{live.isLeader ? 'Diriges tú' : `Dirige ${session.leader.name}`}</span>

          {!live.isLeader && (
            <>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[#D8D5CE]">
                <button
                  type="button"
                  role="switch"
                  aria-checked={live.following}
                  aria-label="Seguir al líder"
                  className={`relative h-5 w-9 rounded-full transition ${live.following ? 'bg-[var(--primary)]' : 'bg-[#30333A]'}`}
                  onClick={() => live.setFollowing(!live.following)}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${live.following ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
                Seguir al líder
              </label>
              {!live.following && (
                <button type="button" className="btn-primary h-7 px-2.5 text-xs" onClick={live.backToLeader}>
                  Volver con el líder
                </button>
              )}
              {live.canLead && (
                <button type="button" className="btn-ghost h-7 px-2.5 text-xs" disabled={live.busy} onClick={() => void live.start()}>
                  Dirigir yo
                </button>
              )}
            </>
          )}

          {live.isLeader && (
            <>
              {leaders && leaders.length > 0 && (
                <select
                  className="select h-7 w-auto py-0 text-xs"
                  aria-label="Pasar el liderazgo"
                  value=""
                  disabled={live.busy}
                  onChange={(event) => event.target.value && void live.handover(event.target.value)}
                >
                  <option value="">Pasar liderazgo…</option>
                  {leaders.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.user.name}
                    </option>
                  ))}
                </select>
              )}
              <button type="button" className="btn-ghost h-7 px-2.5 text-xs" disabled={live.busy} onClick={() => void live.end()}>
                Terminar en vivo
              </button>
            </>
          )}
        </>
      ) : (
        live.canLead &&
        live.status !== 'offline' && (
          <button type="button" className="btn-ghost h-7 px-2.5 text-xs" disabled={live.busy} onClick={() => void live.start()}>
            <Radio className="h-3.5 w-3.5" /> Iniciar en vivo
          </button>
        )
      )}

      {live.conflict && (
        <span role="alert" className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#4A3B1E] bg-[#2A2414] px-2.5 py-1 text-[#F2C46E]">
          {live.conflict.name} ya está dirigiendo.
          <button type="button" className="btn-primary h-6 px-2 text-xs" disabled={live.busy} onClick={() => void live.takeOver()}>
            Tomar el liderazgo
          </button>
          <button type="button" className="btn-ghost h-6 px-2 text-xs" onClick={live.dismissConflict}>
            Cancelar
          </button>
        </span>
      )}
      {live.error && <span className="text-[#F7A39A]">{live.error}</span>}
    </div>
  );
}
