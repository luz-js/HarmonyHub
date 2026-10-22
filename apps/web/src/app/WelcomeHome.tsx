import type { ReactNode } from 'react';
import { ChevronRight, Mail, Plus, UserRound } from 'lucide-react';
import { InvitationCard } from '../features/invitations/components/InvitationCard';
import { useMyInvitations } from '../features/invitations/hooks';
import type { AcceptedInvitation } from '../shared/types';
import { NoOrganizationLayout } from './NoOrganizationLayout';
import type { AppUser, Navigate } from './types';

type WelcomeHomeProps = {
  user: AppUser;
  navigate: Navigate;
  /** Al aceptar una invitacion la app entra directo a esa organizacion. */
  onJoined: (organization: AcceptedInvitation['organization']) => void;
  onLogout: () => void;
};

/**
 * Inicio de quien no tiene ninguna organizacion activa (recien registrada, o la desactivaron/quitaron):
 * primero sus invitaciones, despues crear una organizacion propia o completar su perfil. Nada es obligatorio.
 */
export function WelcomeHome({ user, navigate, onJoined, onLogout }: WelcomeHomeProps) {
  const invitationsQuery = useMyInvitations();
  const invitations = invitationsQuery.data || [];
  const firstName = user.name.split(' ')[0];

  return (
    <NoOrganizationLayout onLogout={onLogout}>
      <section>
        <h1 className="text-[28px] font-bold leading-tight text-white sm:text-[34px]">¡Hola, {firstName}!</h1>
        <p className="mt-2 text-sm text-muted">
          {invitations.length > 0 ? 'Te invitaron a unirte a un equipo. Elige cómo quieres empezar.' : 'Todavía no perteneces a ninguna organización. Elige cómo quieres empezar.'}
        </p>
      </section>

      {invitationsQuery.isLoading && <section className="panel p-5 text-muted">Buscando tus invitaciones...</section>}
      {invitationsQuery.error instanceof Error && (
        <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{invitationsQuery.error.message}</section>
      )}

      {invitations.length > 0 && (
        <section className="space-y-3" aria-labelledby="welcome-invitations-title">
          <h2 id="welcome-invitations-title" className="section-title">
            Te invitaron <span className="text-base text-muted">{invitations.length}</span>
          </h2>
          {invitations.map((invitation) => (
            <InvitationCard key={invitation.id} invitation={invitation} onAccepted={onJoined} />
          ))}
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Otras opciones">
        <WelcomeOption
          icon={<Plus className="h-5 w-5" />}
          title="Crear una organización"
          description="Crea el espacio de tu banda o ministerio. Vas a ser su propietario y podrás invitar a tu equipo."
          onClick={() => navigate('/onboarding')}
        />
        <WelcomeOption
          icon={<UserRound className="h-5 w-5" />}
          title="Completar mi perfil"
          description="Agrega tu teléfono y lo que tocas para que tu equipo sepa contar contigo."
          onClick={() => navigate('/profile')}
        />
      </section>

      {!invitationsQuery.isLoading && !invitationsQuery.error && invitations.length === 0 && (
        <p className="flex items-start gap-2.5 rounded-xl border border-[#8FB4FF]/20 bg-[#1C2436] px-4 py-3 text-sm text-[#C9D8FF]">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#8FB4FF]" />
          <span>
            ¿Te van a invitar a un equipo? Pide que usen tu correo <strong>{user.email}</strong>; la invitación aparecerá aquí.
          </span>
        </p>
      )}
    </NoOrganizationLayout>
  );
}

function WelcomeOption({ icon, title, description, onClick }: { icon: ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" className="panel flex items-start gap-3 p-4 text-left transition hover:border-[#3D4048] hover:bg-white/[0.03] sm:p-5" onClick={onClick}>
      <span className="icon-tile h-11 w-11 shrink-0 rounded-xl">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold text-white">{title}</span>
        <span className="mt-1 block text-sm text-muted">{description}</span>
      </span>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" />
    </button>
  );
}
