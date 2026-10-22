import { Mail } from 'lucide-react';
import type { AcceptedInvitation } from '../../../shared/types';
import { InvitationCard } from '../components/InvitationCard';
import { useMyInvitations } from '../hooks';

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
