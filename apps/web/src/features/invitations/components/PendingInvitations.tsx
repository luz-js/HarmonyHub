import { useState } from 'react';
import { Mail } from 'lucide-react';
import type { InvitationSummary } from '../../../shared/types';
import { MemberRoleBadge } from '../../musicians/components/MemberRoleBadge';
import { useCancelInvitation, useInvitations } from '../hooks';
import { formatShortDate, isInvitationExpired } from '../utils/invitation.utils';

/** Invitaciones pendientes de la organizacion (solo para quien puede invitar). Se oculta si no hay ninguna. */
export function PendingInvitations({ organizationId }: { organizationId: string }) {
  const invitationsQuery = useInvitations(organizationId);
  const pending = (invitationsQuery.data || []).filter((invitation) => invitation.status === 'PENDING');

  if (invitationsQuery.error instanceof Error) {
    return <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{invitationsQuery.error.message}</section>;
  }
  if (pending.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="pending-invitations-title">
      <h2 id="pending-invitations-title" className="section-title">
        Invitaciones pendientes <span className="text-base text-muted">{pending.length}</span>
      </h2>
      <div className="panel divide-y divide-[#23252A]">
        {pending.map((invitation) => (
          <InvitationRow key={invitation.id} invitation={invitation} organizationId={organizationId} />
        ))}
      </div>
    </section>
  );
}

function InvitationRow({ invitation, organizationId }: { invitation: InvitationSummary; organizationId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const cancelInvitation = useCancelInvitation(organizationId);
  const expired = isInvitationExpired(invitation);

  async function cancel() {
    setError('');
    try {
      await cancelInvitation.mutateAsync(invitation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la invitación');
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap sm:px-5">
      <span className="icon-tile h-10 w-10 shrink-0 rounded-xl">
        <Mail className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-white">{invitation.email}</p>
        <p className="truncate text-xs text-muted">
          {invitation.invitedBy ? `Invitó ${invitation.invitedBy.name} · ` : ''}
          {expired ? `Venció el ${formatShortDate(invitation.expiresAt)}` : `Vence el ${formatShortDate(invitation.expiresAt)}`}
        </p>
        {error && (
          <p className="mt-1 text-xs text-[#F7A39A]" role="alert">
            {error}
          </p>
        )}
      </div>
      {expired && <span className="badge badge-neutral shrink-0">Vencida</span>}
      <MemberRoleBadge role={invitation.role} />
      {confirming ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <button type="button" className="btn-danger min-h-0 px-3 py-1.5 text-xs" onClick={cancel} disabled={cancelInvitation.isPending}>
            Sí, cancelar
          </button>
          <button type="button" className="btn-ghost min-h-0 px-3 py-1.5 text-xs" onClick={() => setConfirming(false)}>
            No
          </button>
        </span>
      ) : (
        <button type="button" className="btn-ghost min-h-0 shrink-0 px-3 py-1.5 text-xs" onClick={() => setConfirming(true)} aria-label={`Cancelar la invitación de ${invitation.email}`}>
          Cancelar
        </button>
      )}
    </div>
  );
}
