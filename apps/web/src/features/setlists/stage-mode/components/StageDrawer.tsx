import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function StageDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <button type="button" aria-label="Cerrar" className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <aside
        className="fixed inset-y-0 right-0 z-50 w-[320px] max-w-full overflow-y-auto border-l border-[#30333A] bg-[#1A1B1F] p-4 shadow-[0_0_60px_rgba(0,0,0,0.5)]"
        onKeyDown={(event) => event.key === 'Escape' && onClose()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button type="button" className="btn-ghost h-8 w-8 p-0" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </aside>
    </>
  );
}
