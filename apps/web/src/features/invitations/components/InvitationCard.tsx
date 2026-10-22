import { useState } from 'react';
import { Users } from 'lucide-react';
import type { AcceptedInvitation, MyInvitation } from '../../../shared/types';
import { formatRole } from '../../../shared/utils/format';
import { MemberRoleBadge } from '../../musicians/components/MemberRoleBadge';
import { useAcceptMyInvitation, useDeclineMyInvitation } from '../hooks';
import { formatShortDate } from '../utils/invitation.utils';

type InvitationCardProps = {
  invitation: MyInvitation;
  /** Al aceptar, la app entra a esa organizacion. */
  onAccepted: (organization: AcceptedInvitation['organization']) => void;
};

/** Una invitacion recibida: unirse (entra a la organizacion) o rechazar (pide confirmacion). */
export function InvitationCard({ invitation, onAccepted }: InvitationCardProps) {
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const [error, setError] = useState('');
  const accept = useAcceptMyInvitation();
  const decline = useDeclineMyInvitation();
  const busy = accept.isPending || decline.isPending;

  async function run(action: () => Promise<void>, fallback: string) {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      setConfirmingDecline(false);
    }
  }

  return (
    <article className="panel p-4 sm:p-5" aria-label={`Invitación de ${invitation.organization.name}`}>
      <div className="flex items-start gap-3">
        <span className="icon-tile h-11 w-11 shrink-0 rounded-xl">
          <Users className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[17px] font-bold text-white">{invitation.organization.name}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {invitation.invitedBy ? `${invitation.invitedBy.name} te invitó` : 'Te invitaron'} como {formatRole(invitation.role).toLowerCase()} · Vence el{' '}
            {formatShortDate(invitation.expiresAt)}
          </p>
        </div>
        <span className="hidden sm:block">
          <MemberRoleBadge role={invitation.role} />
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-3 text-sm text-[#F7A39A]" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {confirmingDecline ? (
          <>
            <button type="button" className="btn-ghost" onClick={() => setConfirmingDecline(false)} disabled={busy}>
              No, volver
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={busy}
              onClick={() => run(async () => void (await decline.mutateAsync(invitation.id)), 'No se pudo rechazar la invitación')}
            >
              Sí, rechazar
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-ghost" onClick={() => setConfirmingDecline(true)} disabled={busy}>
              Rechazar
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => run(async () => onAccepted((await accept.mutateAsync(invitation.id)).organization), 'No se pudo aceptar la invitación')}
            >
              {accept.isPending ? 'Uniéndote...' : `Unirme a ${invitation.organization.name}`}
            </button>
          </>
        )}
      </div>
    </article>
  );
}
