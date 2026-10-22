import type { ReactNode } from 'react';
import { ArrowLeft, LogOut, Music2 } from 'lucide-react';

/**
 * Marco de las pantallas para quien todavia no tiene organizacion (bienvenida, invitaciones, perfil).
 * Con `onBack` (perfil e invitaciones) hay "Volver al inicio" arriba y tambien abajo: despues de guardar el perfil
 * y bajar hasta "No disponible", la salida tiene que estar a la vista.
 */
export function NoOrganizationLayout({ children, onBack, onLogout }: { children: ReactNode; onBack?: () => void; onLogout?: () => void }) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-white subtle-grid sm:px-5 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary text-on-primary">
              <Music2 className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold">HarmonyHub</span>
          </span>
          {onBack ? (
            <button type="button" className="btn-ghost h-8 px-2 text-xs" onClick={onBack}>
              <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
            </button>
          ) : (
            onLogout && (
              <button type="button" className="btn-ghost h-8 px-2 text-xs" onClick={onLogout}>
                <LogOut className="h-3.5 w-3.5" /> Salir
              </button>
            )
          )}
        </header>
        {children}
        {onBack && (
          <div className="flex justify-center border-t border-[#23252A] pt-6">
            <button type="button" className="btn-ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
