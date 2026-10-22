import { RefreshCw, WifiOff } from 'lucide-react';
import { useOnlineStatus, useStageModeOpen, useUpdateAvailable } from '../hooks';
import { applyUpdate } from '../pwa-state';

/**
 * Avisos de la app instalable, abajo al centro (por encima de la barra del celular, por debajo del modo escenario):
 * - "Sin conexion": se ve lo que ya se habia abierto y los cambios no se guardan.
 * - "Version nueva": recarga solo si la persona toca el boton; mientras el modo escenario esta abierto, espera.
 */
export function PwaBanners() {
  const online = useOnlineStatus();
  const updateAvailable = useUpdateAvailable();
  const stageModeOpen = useStageModeOpen();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex flex-col items-center gap-2 px-4 md:bottom-4">
      {!online && (
        <div role="status" className="pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl border border-[#4A3B1E] bg-[#2A2414] px-4 py-2.5 text-sm text-[#F2C46E] shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Sin conexión.</strong> Ves lo que ya habías abierto en este dispositivo; los cambios no se guardan hasta que vuelvas a conectarte.
          </span>
        </div>
      )}
      {updateAvailable && !stageModeOpen && (
        <div role="status" className="pointer-events-auto flex items-center gap-3 rounded-xl border border-[#30333A] bg-[#1A1B1F] px-4 py-2.5 text-sm text-white shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
          <span>Hay una versión nueva de HarmonyHub.</span>
          <button type="button" className="btn-primary h-8 px-3 text-xs" onClick={applyUpdate}>
            <RefreshCw className="h-3.5 w-3.5" /> Recargar
          </button>
        </div>
      )}
    </div>
  );
}
