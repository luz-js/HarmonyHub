const dayFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "2026-12-24" -> Date en UTC (los dias no tienen hora: asi no se corren por la zona horaria). */
function dayToDate(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

/** "24 dic 2026" o "24 dic – 26 dic 2026". */
export function formatDayRange(startsOn: string, endsOn: string) {
  if (startsOn === endsOn) return dayFormat.format(dayToDate(startsOn));
  const sameYear = startsOn.slice(0, 4) === endsOn.slice(0, 4);
  return `${(sameYear ? shortFormat : dayFormat).format(dayToDate(startsOn))} – ${dayFormat.format(dayToDate(endsOn))}`;
}

/** Hoy en el calendario del navegador, como AAAA-MM-DD. */
export function todayDay(now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Separa lo que sigue vigente (termina hoy o despues) de lo que ya paso. */
export function splitByToday<T extends { endsOn: string }>(rows: T[], today: string) {
  return { upcoming: rows.filter((row) => row.endsOn >= today), past: rows.filter((row) => row.endsOn < today) };
}

const momentFormat = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** "mar 3 nov, 19:30" en la hora local del navegador. */
export function formatEventMoment(iso: string) {
  return momentFormat.format(new Date(iso));
}
