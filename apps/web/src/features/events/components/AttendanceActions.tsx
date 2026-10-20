import { Check, X } from 'lucide-react';
import type { AttendanceStatus } from '../../../shared/types';

/** Botones para que el propio musico confirme o rechace su asistencia. `lg` ocupa todo el ancho, `sm` cabe en una fila del equipo. */
export function AttendanceActions({
  status,
  disabled,
  size = 'sm',
  onChange,
}: {
  status: AttendanceStatus;
  disabled?: boolean;
  size?: 'sm' | 'lg';
  onChange: (status: AttendanceStatus) => void;
}) {
  const sizeClass = size === 'sm' ? ' btn-sm' : '';
  return (
    <div className={`flex gap-2 ${size === 'lg' ? 'w-full' : ''}`}>
      <button
        type="button"
        className={`btn-yes${sizeClass}`}
        aria-pressed={status === 'CONFIRMED'}
        disabled={disabled}
        onClick={() => onChange('CONFIRMED')}
      >
        <Check className="h-4 w-4" /> Voy
      </button>
      <button
        type="button"
        className={`btn-no${sizeClass}`}
        aria-pressed={status === 'DECLINED'}
        disabled={disabled}
        onClick={() => onChange('DECLINED')}
      >
        <X className="h-4 w-4" /> No puedo
      </button>
    </div>
  );
}
