import { formatCueClock } from '../../cues/utils/cueTimeline';

/** Reutiliza el formateador mm:ss / h:mm:ss ya construido en Fase 5, sin duplicar la logica. */
export const formatElapsed = formatCueClock;

export function formatLiveClock(date: Date, format: '12' | '24'): string {
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (format === '24') {
    return `${String(hours24).padStart(2, '0')}:${minutes}`;
  }
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}
