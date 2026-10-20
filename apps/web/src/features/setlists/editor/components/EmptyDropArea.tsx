import { ListMusic, Plus } from 'lucide-react';

export function EmptyDropArea({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#30333A] bg-[#141518] px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#30333A] bg-[#23252A] text-primary">
        <ListMusic className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-white">Este setlist está vacío</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Empieza a organizar el evento agregando la primera canción o un bloque como oración, avisos o transición.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" className="btn-primary" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Agregar primera canción
        </button>
        <button type="button" className="btn-ghost" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Agregar bloque
        </button>
      </div>
    </div>
  );
}
