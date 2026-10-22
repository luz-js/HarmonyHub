import { CalendarX2, Clock } from 'lucide-react';
import type { MemberAvailability } from '../../../shared/types';

/**
 * Avisos de choque de un miembro: solo informan, nunca impiden sumarlo. "No disponible" sale de sus fechas
 * bloqueadas (sin la nota, que es privada) y "Ya tiene otro evento" de otro evento de la organizacion a esa hora.
 */
export function AvailabilityBadges({ availability }: { availability?: MemberAvailability }) {
  if (!availability || (!availability.unavailable && availability.conflicts.length === 0)) return null;
  const otherEvents = availability.conflicts.map((conflict) => conflict.name).join(', ');
  return (
    <span className="flex flex-wrap gap-1">
      {availability.unavailable && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#2A1817] px-2 py-0.5 text-[11px] font-semibold text-[#F7A39A]">
          <CalendarX2 className="h-3 w-3" aria-hidden /> No disponible
        </span>
      )}
      {availability.conflicts.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#2A2414] px-2 py-0.5 text-[11px] font-semibold text-[#F2C46E]" title={otherEvents}>
          <Clock className="h-3 w-3" aria-hidden /> Ya tiene otro evento
          <span className="sr-only">: {otherEvents}</span>
        </span>
      )}
    </span>
  );
}
