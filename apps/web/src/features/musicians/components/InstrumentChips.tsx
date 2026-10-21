import { Star } from 'lucide-react';
import type { UserInstrumentRef } from '../../../shared/types';
import { getRoleLabel } from '../../setlists/assignments/utils/assignmentLabels';

/**
 * Lo que la persona sabe tocar segun su perfil; el principal (con estrella) va primero.
 * Usa span con roles de lista porque tambien se muestra dentro de la fila (un boton), donde no cabe un ul.
 */
export function InstrumentChips({ instruments, limit }: { instruments: UserInstrumentRef[]; limit?: number }) {
  if (instruments.length === 0) return <span className="text-xs text-faint">Sin instrumentos</span>;

  const sorted = [...instruments].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const visible = limit ? sorted.slice(0, limit) : sorted;
  const hidden = sorted.length - visible.length;

  return (
    <span role="list" className="flex min-w-0 flex-wrap gap-1.5" aria-label="Instrumentos">
      {visible.map((item) => (
        <span
          role="listitem"
          key={item.instrument}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${
            item.isPrimary ? 'border-transparent bg-[var(--primary-tint)] text-[var(--primary)]' : 'border-[#30333A] text-[#C9C5BD]'
          }`}
        >
          {item.isPrimary && <Star className="h-3 w-3 fill-current" aria-label="Principal" />}
          {getRoleLabel(item.instrument)}
        </span>
      ))}
      {hidden > 0 && (
        <span role="listitem" className="px-1 py-0.5 text-xs text-muted">
          +{hidden}
        </span>
      )}
    </span>
  );
}
