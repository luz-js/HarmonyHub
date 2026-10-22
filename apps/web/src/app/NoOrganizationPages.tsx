import type { ReactNode } from 'react';
import { ArrowRight, Mail, Plus, Users } from 'lucide-react';
import { useMyInvitations } from '../features/invitations/hooks';
import type { Navigate } from './types';

/**
 * Lo que se ve en Canciones, Setlists, Eventos... cuando todavia no tienes organizacion: una explicacion corta y
 * como empezar (crear la tuya o aceptar una invitacion). No llama a la API de la organizacion.
 */
export function NoOrganizationNotice({ title, navigate }: { title: string; navigate: Navigate }) {
  const invitations = useMyInvitations().data?.length ?? 0;
  return (
    <div className="space-y-5">
      <h1 className="page-title">{title}</h1>
      <section className="rounded-2xl border border-dashed border-[#30333A] bg-[#141518] px-6 py-10 text-center">
        <span className="icon-tile mx-auto h-12 w-12 rounded-2xl">
          <Users className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-white">Esto es de tu organización</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Para ver {title.toLowerCase()} necesitas pertenecer a una organización: crea la de tu banda o ministerio, o acepta la invitación de tu equipo.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-primary" onClick={() => navigate('/onboarding')}>
            <Plus className="h-4 w-4" /> Crear una organización
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate('/invitations')}>
            <Mail className="h-4 w-4" /> {invitations > 0 ? `Ver mis invitaciones (${invitations})` : 'Ver mis invitaciones'}
          </button>
        </div>
      </section>
    </div>
  );
}

/** Mi perfil y Mis invitaciones sin organizacion: "Entrar" arriba y abajo lleva al Inicio de la app. */
export function EnterFrame({ children, navigate }: { children: ReactNode; navigate: Navigate }) {
  const enter = (
    <button type="button" className="btn-ghost" onClick={() => navigate('/')}>
      Entrar <ArrowRight className="h-4 w-4" />
    </button>
  );
  return (
    <div className="space-y-6">
      <div className="flex justify-end">{enter}</div>
      {children}
      <div className="flex justify-center border-t border-[#23252A] pt-6">{enter}</div>
    </div>
  );
}
