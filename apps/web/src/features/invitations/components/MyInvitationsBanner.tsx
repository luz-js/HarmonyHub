import { Mail } from 'lucide-react';
import { useMyInvitations } from '../hooks';

/** Aviso destacado (Inicio y primer paso sin organizacion) cuando la persona tiene invitaciones pendientes. */
export function MyInvitationsBanner({ onOpen }: { onOpen: () => void }) {
  const invitationsQuery = useMyInvitations();
  const count = invitationsQuery.data?.length ?? 0;
  if (count === 0) return null;

  const first = invitationsQuery.data![0];
  const text = count === 1 ? `${first.organization.name} te invitó a unirte.` : `Tienes ${count} invitaciones para unirte a otras organizaciones.`;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary-tint)] px-4 py-3.5 sm:flex-row sm:items-center sm:px-5" aria-label="Invitaciones pendientes">
      <span className="flex items-center gap-3">
        <Mail className="h-5 w-5 shrink-0 text-[var(--primary)]" />
        <span className="text-sm font-semibold text-white">{text}</span>
      </span>
      <button type="button" className="btn-primary sm:ml-auto" onClick={onOpen}>
        Ver invitaciones
      </button>
    </section>
  );
}
