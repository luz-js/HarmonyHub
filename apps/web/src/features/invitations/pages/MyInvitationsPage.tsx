import { useState } from 'react';
import { Mail, Users } from 'lucide-react';
import type { AcceptedInvitation, MyInvitation } from '../../../shared/types';
import { formatRole } from '../../../shared/utils/format';
import { MemberRoleBadge } from '../../musicians/components/MemberRoleBadge';
import { useAcceptMyInvitation, useDeclineMyInvitation, useMyInvitations } from '../hooks';
import { formatShortDate } from '../utils/invitation.utils';

type MyInvitationsPageProps = {
  /** Al aceptar, la app entra a esa organizacion. */
  onAccepted: (organization: AcceptedInvitation['organization']) => void;
};

/** "Mis invitaciones": las invitaciones pendientes para el correo de la cuenta, de cualquier organizacion. */
export function MyInvitationsPage({ onAccepted }: MyInvitationsPageProps) {
  const invitationsQuery = useMyInvitations();
  const invitations = invitationsQuery.data || [];

  return (
    <div className="space-y-5">
      <section>
        <h1 className="page-title">Mis invitaciones</h1>
        <p className="page-subtitle">Organizaciones que te invitaron a unirte con tu correo.</p>
      </section>

      {invitationsQuery.isLoading && <section className="panel p-5 text-muted">Cargando invitaciones...</section>}
      {invitationsQuery.error instanceof Error && (
        <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{invitationsQuery.error.message}</section>
      )}

      {!invitationsQuery.isLoading && !invitationsQuery.error && invitations.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#30333A] bg-[#141518] px-6 py-12 text-center">
          <span className="icon-tile mx-auto h-12 w-12 rounded-2xl">
            <Mail className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-white">No tienes invitaciones pendientes</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Cuando una banda o ministerio te invite con tu correo, la invitación aparecerá aquí.</p>
        </div>
      )}

      {invitations.length > 0 && (
        <section className="space-y-3" aria-label="Invitaciones">
          {invitations.map((invitation) => (
            <InvitationCard key={invitation.id} invitation={invitation} onAccepted={onAccepted} />
          ))}
        </section>
      )}
    </div>
  );
}

function InvitationCard({ invitation, onAccepted }: { invitation: MyInvitation; onAccepted: MyInvitationsPageProps['onAccepted'] }) {
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
